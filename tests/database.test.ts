import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createProject } from "../src/lib/templates";

test("PostgreSQL migration: owner RLS, file/metadata CAS, versions and atomic budget reservations", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,created_at timestamptz default now());
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
    create table public.profiles(id uuid primary key,role text);
    create table public.projects(id uuid primary key,user_id uuid,title text,description text,category text,slug text unique,thumbnail_url text,is_published boolean,is_listed boolean,play_price numeric,ranking_score_mode text);`);
    await db.exec(await readFile("integration/editor-schema.sql", "utf8"));
    await db.exec(await readFile("integration/lounge-integration.sql", "utf8"));
    await db.exec(await readFile("integration/github-schema.sql", "utf8"));
    await db.exec(
      await readFile("integration/supabase-link-schema.sql", "utf8"),
    );
    assert.equal(
      (
        await db.query(
          "select tablename from pg_tables where schemaname='public' and tablename like 'editor_%'",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select has_schema_privilege('authenticated','editor','CREATE') as allowed",
        )
      ).rows[0].allowed,
      false,
    );
    const owner = crypto.randomUUID(),
      other = crypto.randomUUID(),
      project = createProject("game", "test");
    await db.query("insert into auth.users values($1),($2)", [owner, other]);
    await db.query("insert into profiles values($1,'student'),($2,'student')", [
      owner,
      other,
    ]);
    const files = Object.entries(project.files).map(([path, f]) => ({
      path,
      kind: f.kind,
      text_content: f.content,
      storage_path: null,
      mime: f.mime,
      size_bytes: f.size,
    }));
    const save = (
      expected: number,
      advance = true,
      metadata = true,
      meta = 0,
      p = project,
    ) =>
      db.query<{ result: { revision: number; metadataRevision: number } }>(
        "select editor.editor_save_project($1,$2::jsonb,$3::jsonb,$4,$5,$6,$7) as result",
        [
          owner,
          JSON.stringify(p),
          JSON.stringify(files),
          expected,
          advance,
          metadata,
          meta,
        ],
      );
    assert.deepEqual((await save(-1)).rows[0].result, {
      revision: 0,
      metadataRevision: 1,
    });
    files[0].text_content += "new";
    assert.deepEqual((await save(0, true, false, 0)).rows[0].result, {
      revision: 1,
      metadataRevision: 1,
    });
    await assert.rejects(() => save(0, true, false, 0), /revision/);
    await assert.rejects(() => save(1, false, true, 0), /metadata revision/);
    // Student Supabase link lives in the snapshot: metadata saves write it, file saves keep it, unlink drops it.
    const supabase = {
      url: "https://abcdefghijklmnopqrst.supabase.co",
      anonKey: "sb_publishable_test_only_key_value",
      connectedAt: "2026-10-06T00:00:00.000Z",
    };
    const snapshot = async () =>
      (
        await db.query<{ snapshot: { supabase?: typeof supabase } }>(
          "select snapshot from editor.editor_projects where id=$1",
          [project.id],
        )
      ).rows[0].snapshot;
    assert.deepEqual(
      (await save(1, false, true, 1, { ...project, supabase })).rows[0].result,
      { revision: 1, metadataRevision: 2 },
    );
    assert.deepEqual((await snapshot()).supabase, supabase);
    await save(1, false, false, 0);
    assert.deepEqual((await snapshot()).supabase, supabase);
    await save(1, false, true, 2);
    assert.equal((await snapshot()).supabase, undefined);
    assert.equal("supabase" in (await snapshot()), false);
    assert.equal(
      (await db.query("select * from editor.editor_file_versions")).rows.length,
      1,
    );
    await db.exec(
      `set role authenticated;set "request.jwt.claim.sub"='${other}'`,
    );
    assert.equal(
      (await db.query("select * from editor.editor_projects")).rows.length,
      0,
    );
    await assert.rejects(
      () => db.query("delete from editor.editor_projects"),
      /permission/,
    );
    await assert.rejects(
      () =>
        db.query("select editor.editor_settle_usage($1,$2,0,0,0)", [
          owner,
          crypto.randomUUID(),
        ]),
      /permission/,
    );
    await db.exec(`set "request.jwt.claim.sub"='${owner}'`);
    assert.equal(
      (await db.query("select * from editor.editor_projects")).rows.length,
      1,
    );
    await db.exec("reset role");
    // Git baseline and files update atomically, with independent link-generation CAS.
    const gitSync = (
      who: string,
      revision: number,
      previous: string | null,
      link: object | null,
      write = false,
    ) =>
      db.query(
        "select editor.editor_github_sync($1,$2::jsonb,$3::jsonb,$4,$5,$6::jsonb,$7)",
        [
          who,
          JSON.stringify(project),
          JSON.stringify(files),
          revision,
          previous,
          link ? JSON.stringify(link) : null,
          write,
        ],
      );
    const generation = async () =>
      (
        await db.query<{ version: string }>(
          "select version from editor.editor_github_links where project_id=$1",
          [project.id],
        )
      ).rows[0].version;
    await gitSync(owner, 1, null, { baseSha: "first" });
    const firstGeneration = await generation();
    await assert.rejects(
      () => gitSync(other, 1, firstGeneration, { baseSha: "attack" }),
      /owner denied/,
    );
    await assert.rejects(
      () => gitSync(owner, 0, firstGeneration, { baseSha: "stale" }, true),
      /revision conflict/,
    );
    await assert.rejects(
      () => gitSync(owner, 1, crypto.randomUUID(), { baseSha: "stale" }, true),
      /link conflict/,
    );
    assert.equal(await generation(), firstGeneration);
    files[0].text_content += " from GitHub";
    await gitSync(owner, 1, firstGeneration, { baseSha: "second" }, true);
    const secondGeneration = await generation();
    assert.notEqual(secondGeneration, firstGeneration);
    const gitSaved = (
      await db.query<{ revision: number; metadata_revision: number }>(
        "select revision,metadata_revision from editor.editor_projects where id=$1",
        [project.id],
      )
    ).rows[0];
    assert.equal(gitSaved.revision, 2);
    // Unchanged since the Supabase link saves above: Git sync never advances metadata.
    assert.equal(gitSaved.metadata_revision, 3);
    await db.exec(
      `set role authenticated;set "request.jwt.claim.sub"='${other}'`,
    );
    assert.equal(
      (await db.query("select * from editor.editor_github_links")).rows.length,
      0,
    );
    await assert.rejects(
      () => gitSync(owner, 2, secondGeneration, null),
      /permission denied/,
    );
    await db.exec(`set "request.jwt.claim.sub"='${owner}'`);
    assert.equal(
      (await db.query("select * from editor.editor_github_links")).rows.length,
      1,
    );
    await assert.rejects(
      () => db.query("delete from editor.editor_github_links"),
      /permission denied/,
    );
    await db.exec("reset role");
    await gitSync(owner, 2, secondGeneration, null);
    assert.equal(
      (await db.query("select * from editor.editor_github_links")).rows.length,
      0,
    );
    const reservation = crypto.randomUUID();
    await db.query("select editor.editor_reserve_usage($1,$2,1,2,3)", [
      owner,
      reservation,
    ]);
    await assert.rejects(
      () =>
        db.query("select editor.editor_reserve_usage($1,$2,1,2,3)", [
          owner,
          crypto.randomUUID(),
        ]),
      /progress/,
    );
    await db.query("select editor.editor_settle_usage($1,$2,0.4,100,10)", [
      owner,
      reservation,
    ]);
    await db.query("select editor.editor_settle_usage($1,$2,0.4,100,10)", [
      owner,
      reservation,
    ]);
    const usage = await db.query<{ cost_usd: string; reserved_usd: string }>(
      "select cost_usd,reserved_usd from editor.editor_ai_usage_daily",
    );
    assert.equal(Number(usage.rows[0].cost_usd), 0.4);
    assert.equal(Number(usage.rows[0].reserved_usd), 0);
    await assert.rejects(
      () =>
        db.query("select editor.editor_reserve_usage($1,$2,2,2,3)", [
          owner,
          crypto.randomUUID(),
        ]),
      /budget exceeded/,
    );
    const prepare = [
      owner,
      project.id,
      null,
      JSON.stringify({
        title: "test",
        description: "description",
        category: "web_game",
        slug: "test-work",
        isPublished: true,
        isListed: true,
      }),
      "a".repeat(64),
      123,
      "key-1",
      "test",
    ];
    const first = await db.query<{
      result: { id: string; project_id: string };
    }>(
      "select editor.editor_prepare_lounge_upload($1,$2,$3,$4,$5,$6,$7,$8) as result",
      prepare,
    );
    const second = await db.query<{
      result: { id: string; project_id: string };
    }>(
      "select editor.editor_prepare_lounge_upload($1,$2,$3,$4,$5,$6,$7,$8) as result",
      prepare,
    );
    assert.equal(first.rows[0].result.id, second.rows[0].result.id);
    assert.equal((await db.query("select * from projects")).rows.length, 1);
  } finally {
    await db.close();
  }
});
