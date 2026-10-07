import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createProject } from "../src/lib/templates";

async function database() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,created_at timestamptz default now());
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
    create table public.profiles(id uuid primary key,role text);`);
  await db.exec(await readFile("integration/editor-schema.sql", "utf8"));
  await db.exec(await readFile("integration/process-record.sql", "utf8"));
  return db;
}

test("process record: revision source, capped events, snapshots, owner RLS and Storage retention", async () => {
  const db = await database();
  try {
    const owner = crypto.randomUUID(),
      other = crypto.randomUUID(),
      project = createProject("game", "process");
    await db.query("insert into auth.users values($1),($2)", [owner, other]);
    const files = Object.entries(project.files).map(([path, f]) => ({
      path,
      kind: f.kind,
      text_content: f.content as string | null,
      storage_path: null as string | null,
      mime: f.mime,
      size_bytes: f.size,
    }));
    const save = (
      expected: number,
      source: string,
      messageId: string | null = null,
      advance = true,
    ) =>
      db.query<{ result: { revision: number } }>(
        "select editor.editor_save_project_recorded($1,$2::jsonb,$3::jsonb,$4,$5,$6,0,$7,$8) as result",
        [
          owner,
          JSON.stringify(project),
          JSON.stringify(files),
          expected,
          advance,
          expected < 0,
          source,
          messageId,
        ],
      );
    const revisions = async () =>
      (
        await db.query<{
          revision: number;
          source: string;
          message_id: string | null;
          changed_paths: string[];
        }>(
          "select revision,source,message_id,changed_paths from editor.editor_revisions order by revision",
        )
      ).rows;

    // Creation records every file as changed by the template.
    assert.equal((await save(-1, "template")).rows[0].result.revision, 0);
    assert.deepEqual(
      (await revisions())[0].changed_paths,
      files.map((f) => f.path).sort(),
    );

    // An approved AI change records only the replaced file and its message.
    const message = crypto.randomUUID();
    files[0].text_content += "\n<!-- ai -->";
    assert.equal((await save(0, "ai", message)).rows[0].result.revision, 1);
    const ai = (await revisions())[1];
    assert.equal(ai.source, "ai");
    assert.equal(ai.message_id, message);
    assert.deepEqual(ai.changed_paths, [files[0].path]);

    // Unknown origins and metadata-only saves never add a revision row.
    await assert.rejects(() => save(1, "teacher"), /invalid source/);
    await save(1, "student", null, false);
    assert.equal((await revisions()).length, 2);

    // A student save of a new file lists it as changed.
    files.push({
      path: "notes.txt",
      kind: "text",
      text_content: "hello",
      storage_path: null,
      mime: "text/plain",
      size_bytes: 5,
    });
    await save(1, "student");
    assert.deepEqual((await revisions())[2].changed_paths, ["notes.txt"]);

    // Events: owner only, payload bounded, 200 per project per day.
    const event = (who: string, payload: object = { message: "x" }) =>
      db.query<{ ok: boolean }>(
        "select editor.editor_record_event($1,$2,'preview_error',2,$3::jsonb) as ok",
        [who, project.id, JSON.stringify(payload)],
      );
    assert.equal((await event(owner)).rows[0].ok, true);
    await assert.rejects(() => event(other), /owner denied/);
    await assert.rejects(() => event(owner, { message: "x".repeat(3000) }));
    for (let i = 1; i < 200; i++) await event(owner);
    assert.equal((await event(owner)).rows[0].ok, false);

    // Snapshots copy the saved files at the current revision and are idempotent per kind.
    const snapshot = (kind: string, note: string | null) =>
      db.query<{
        result: { id: string; revision: number; note: string | null };
      }>("select editor.editor_create_snapshot($1,$2,$3,$4) as result", [
        owner,
        project.id,
        kind,
        note,
      ]);
    const first = (await snapshot("checkpoint", null)).rows[0].result;
    assert.equal(first.revision, 2);
    const again = (await snapshot("checkpoint", " 점프를 고쳤다 ")).rows[0]
      .result;
    assert.equal(again.id, first.id);
    assert.equal(again.note, "점프를 고쳤다");
    await assert.rejects(
      () => snapshot("checkpoint", "x".repeat(201)),
      /note too long/,
    );
    await assert.rejects(
      () =>
        db.query("select editor.editor_create_snapshot($1,$2,'deploy',null)", [
          other,
          project.id,
        ]),
      /owner denied/,
    );
    const stored = (
      await db.query<{ files: { path: string }[] }>(
        "select files from editor.editor_snapshots where id=$1",
        [first.id],
      )
    ).rows[0].files;
    assert.equal(stored.length, files.length);
    assert.equal(
      (
        await db.query(
          "select 1 from editor.editor_events where kind='checkpoint'",
        )
      ).rows.length,
      1,
    );

    // Students read only their own records; the RPCs stay service-only.
    await db.exec(
      `set role authenticated;set "request.jwt.claim.sub"='${other}'`,
    );
    for (const table of [
      "editor_revisions",
      "editor_events",
      "editor_snapshots",
    ])
      assert.equal(
        (await db.query(`select * from editor.${table}`)).rows.length,
        0,
      );
    await assert.rejects(() => event(other), /permission denied/);
    await db.exec(`set "request.jwt.claim.sub"='${owner}'`);
    assert.equal(
      (await db.query("select * from editor.editor_revisions")).rows.length,
      3,
    );
    assert.equal(
      (await db.query("select * from editor.editor_snapshots")).rows.length,
      1,
    );
    await assert.rejects(
      () => db.query("delete from editor.editor_snapshots"),
      /permission denied/,
    );
    await db.exec("reset role");

    // Storage objects referenced only by a snapshot survive version cleanup.
    const objectName = `${owner}/${project.id}/kept`;
    files.push({
      path: "big.txt",
      kind: "text",
      text_content: null,
      storage_path: objectName,
      mime: "text/plain",
      size_bytes: 10,
    });
    await save(2, "import");
    await snapshot("deploy", null);
    files.pop();
    await save(3, "student");
    await db.query(
      "insert into storage.objects(bucket_id,name,created_at) values('editor-files',$1,now()-interval '40 days')",
      [objectName],
    );
    await db.exec("delete from editor.editor_file_versions");
    const candidates = async () =>
      (
        await db.query<{ name: string }>(
          "select name from editor.editor_cleanup_candidates(now(),100)",
        )
      ).rows.map((row) => row.name);
    assert.deepEqual(await candidates(), []);
    await db.exec("delete from editor.editor_snapshots where kind='deploy'");
    assert.deepEqual(await candidates(), [objectName]);
  } finally {
    await db.close();
  }
});

test("save records the revision source only when the process-record DB is enabled", async () => {
  const { save, recordEvent } = await import("../src/lib/server/repository");
  const previous = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    flag: process.env.EDITOR_PROCESS_RECORD,
    fetch: globalThis.fetch,
  };
  const user = { id: crypto.randomUUID(), role: "student" };
  const project = createProject("blank", "source");
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      const path = new URL(request.url).pathname;
      if (path === "/rest/v1/editor_projects")
        return Response.json([{ editor_files: [] }]);
      calls.push({ path, body: await request.json() });
      return Response.json({ revision: 1, metadataRevision: 1 });
    };
    delete process.env.EDITOR_PROCESS_RECORD;
    await save(user, project, 0, true, false, { source: "ai" });
    assert.equal(calls[0].path, "/rest/v1/rpc/editor_save_project");
    assert.equal("p_source" in calls[0].body, false);
    await assert.rejects(
      () => recordEvent(user, project.id, "preview_error", 0),
      /활성화/,
    );

    process.env.EDITOR_PROCESS_RECORD = "true";
    const message = crypto.randomUUID();
    await save(user, project, 0, true, false, {
      source: "ai",
      messageId: message,
    });
    assert.equal(calls[1].path, "/rest/v1/rpc/editor_save_project_recorded");
    assert.equal(calls[1].body.p_source, "ai");
    assert.equal(calls[1].body.p_message_id, message);
    await save(user, project, 0);
    assert.equal(calls[2].body.p_source, "student");
    // Metadata-only saves keep the original RPC and add no revision.
    await save(user, project, 0, false);
    assert.equal(calls[3].path, "/rest/v1/rpc/editor_save_project");
  } finally {
    globalThis.fetch = previous.fetch;
    for (const [key, value] of [
      ["NEXT_PUBLIC_SUPABASE_URL", previous.url],
      ["SUPABASE_SERVICE_ROLE_KEY", previous.key],
      ["EDITOR_PROCESS_RECORD", previous.flag],
    ] as const)
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});
