-- REVIEW COPY ONLY. Apply as a new migration owned by letscoding_lounge, after editor-schema.sql.
-- Records how a project changed (who or what produced each revision), learning events, and
-- durable snapshots so teachers can later read a student's process. Enable the server side with
-- EDITOR_PROCESS_RECORD=true only after this migration is applied.
begin;
create table if not exists editor.editor_revisions (
  project_id uuid not null references editor.editor_projects(id) on delete cascade,
  revision bigint not null,
  source text not null check(source in ('student','ai','import','restore','template')),
  message_id uuid,
  changed_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key(project_id,revision)
);
create table if not exists editor.editor_events (
  id bigint generated always as identity primary key,
  project_id uuid not null references editor.editor_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  kind text not null check(kind in ('preview_error','errors_resolved','large_paste','proposal_rejected','checkpoint','deploy')),
  revision bigint,
  payload jsonb not null default '{}' check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=2048),
  created_at timestamptz not null default now()
);
create index if not exists editor_events_project on editor.editor_events(project_id,created_at);
create table if not exists editor.editor_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references editor.editor_projects(id) on delete cascade,
  revision bigint not null,
  kind text not null check(kind in ('checkpoint','deploy')),
  note text check(note is null or length(note) between 1 and 200),
  files jsonb not null check(jsonb_typeof(files)='array'),
  created_at timestamptz not null default now()
);
create index if not exists editor_snapshots_project on editor.editor_snapshots(project_id,created_at desc);

do $$ declare t text; begin
  foreach t in array array['editor_revisions','editor_events','editor_snapshots'] loop
    execute format('alter table editor.%I enable row level security',t);
    execute format('revoke all on editor.%I from public, anon, authenticated',t);
    execute format('grant select on editor.%I to authenticated',t);
    execute format('grant all on editor.%I to service_role',t);
  end loop;
end $$;
grant usage,select on sequence editor.editor_events_id_seq to service_role;
-- Owner-only reads for now. Teacher reads (stage 3) are added by a class-scoped policy later.
create policy editor_revisions_read on editor.editor_revisions for select to authenticated using(
  exists(select 1 from editor.editor_projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null));
create policy editor_events_read on editor.editor_events for select to authenticated using(
  user_id=auth.uid() and exists(select 1 from editor.editor_projects p where p.id=project_id and p.deleted_at is null));
create policy editor_snapshots_read on editor.editor_snapshots for select to authenticated using(
  exists(select 1 from editor.editor_projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null));

-- Same contract as editor_save_project, plus the origin of the new revision. The changed paths are
-- computed under the same project lock, so they describe exactly what this save replaced.
create or replace function editor.editor_save_project_recorded(
  p_owner uuid,p_project jsonb,p_files jsonb,p_expected bigint,p_advance boolean,p_metadata boolean,
  p_meta_expected bigint,p_source text,p_message_id uuid default null)
returns jsonb language plpgsql security definer set search_path=editor,pg_temp as $$
declare pid uuid:=(p_project->>'id')::uuid; changed text[]; result jsonb;
begin
  if p_source is null or p_source not in ('student','ai','import','restore','template') then raise exception 'invalid source'; end if;
  perform pg_advisory_xact_lock(hashtextextended('editor-project:'||pid::text,0));
  select coalesce(array_agg(path order by path),'{}') into changed from (
    select ef.path from editor.editor_files ef where ef.project_id=pid
      and not exists(select 1 from jsonb_array_elements(p_files) nf where nf->>'path'=ef.path
        and nf->>'text_content' is not distinct from ef.text_content
        and nf->>'storage_path' is not distinct from ef.storage_path and nf->>'kind'=ef.kind)
    union
    select nf->>'path' from jsonb_array_elements(p_files) nf
      where not exists(select 1 from editor.editor_files ef where ef.project_id=pid and ef.path=nf->>'path')
  ) c;
  result:=editor.editor_save_project(p_owner,p_project,p_files,p_expected,p_advance,p_metadata,p_meta_expected);
  if p_advance then
    insert into editor.editor_revisions(project_id,revision,source,message_id,changed_paths)
    values(pid,(result->>'revision')::bigint,p_source,p_message_id,changed)
    on conflict(project_id,revision) do update
      set source=excluded.source,message_id=excluded.message_id,changed_paths=excluded.changed_paths,created_at=now();
  end if;
  return result;
end $$;

-- Learning events are capped per project per Korean calendar day; extra events are dropped, not errors.
create or replace function editor.editor_record_event(p_owner uuid,p_project uuid,p_kind text,p_revision bigint,p_payload jsonb)
returns boolean language plpgsql security definer set search_path=editor,pg_temp as $$
declare day_start timestamptz:=date_trunc('day',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
begin
  perform pg_advisory_xact_lock(hashtextextended('editor-events:'||p_project::text,0));
  if not exists(select 1 from editor.editor_projects where id=p_project and owner_id=p_owner and deleted_at is null) then raise exception 'owner denied'; end if;
  if (select count(*) from editor.editor_events where project_id=p_project and created_at>=day_start)>=200 then return false; end if;
  insert into editor.editor_events(project_id,user_id,kind,revision,payload)
  values(p_project,p_owner,p_kind,p_revision,coalesce(p_payload,'{}'::jsonb));
  return true;
end $$;

-- A snapshot copies the saved file rows of the current revision. Repeating the same kind at the same
-- revision returns the existing snapshot instead of duplicating it.
create or replace function editor.editor_create_snapshot(p_owner uuid,p_project uuid,p_kind text,p_note text default null)
returns jsonb language plpgsql security definer set search_path=editor,pg_temp as $$
declare project editor.editor_projects; snap editor.editor_snapshots; clean text:=nullif(btrim(coalesce(p_note,'')),'');
begin
  if length(clean)>200 then raise exception 'note too long'; end if;
  perform pg_advisory_xact_lock(hashtextextended('editor-project:'||p_project::text,0));
  select * into project from editor.editor_projects where id=p_project for update;
  if not found or project.owner_id<>p_owner or project.deleted_at is not null then raise exception 'owner denied'; end if;
  select * into snap from editor.editor_snapshots where project_id=p_project and revision=project.revision and kind=p_kind
    order by created_at desc limit 1;
  if not found then
    if (select count(*) from editor.editor_snapshots where project_id=p_project)>=200 then raise exception 'snapshot limit'; end if;
    insert into editor.editor_snapshots(project_id,revision,kind,note,files)
    values(p_project,project.revision,p_kind,clean,coalesce((
      select jsonb_agg(jsonb_build_object('path',f.path,'kind',f.kind,'text_content',f.text_content,
        'storage_path',f.storage_path,'mime',f.mime,'size_bytes',f.size_bytes) order by f.path)
      from editor.editor_files f where f.project_id=p_project),'[]'::jsonb))
    returning * into snap;
    insert into editor.editor_events(project_id,user_id,kind,revision,payload)
    values(p_project,p_owner,p_kind,project.revision,jsonb_build_object('snapshotId',snap.id));
  elsif clean is not null and snap.note is null then
    update editor.editor_snapshots set note=clean where id=snap.id returning * into snap;
  end if;
  return jsonb_build_object('id',snap.id,'revision',snap.revision,'kind',snap.kind,'note',snap.note,'createdAt',snap.created_at);
end $$;

-- Snapshot files keep their Storage objects alive after the 30-day version cleanup.
create or replace function editor.editor_cleanup_candidates(p_cutoff timestamptz,p_limit integer default 100)
returns table(bucket_id text,name text) language sql security definer set search_path=editor,pg_temp as $$
 select o.bucket_id,o.name from storage.objects o where o.created_at<p_cutoff
 and (o.bucket_id='editor-attachments' or (o.bucket_id='editor-files'
 and not exists(select 1 from editor_files f where f.storage_path=o.name)
 and not exists(select 1 from editor_file_versions v where v.file_data->>'storage_path'=o.name)
 and not exists(select 1 from editor_snapshots s cross join lateral jsonb_array_elements(s.files) sf where sf->>'storage_path'=o.name)))
 order by o.created_at limit least(greatest(p_limit,1),100);
$$;

revoke all on function editor.editor_save_project_recorded(uuid,jsonb,jsonb,bigint,boolean,boolean,bigint,text,uuid) from public,anon,authenticated;
revoke all on function editor.editor_record_event(uuid,uuid,text,bigint,jsonb) from public,anon,authenticated;
revoke all on function editor.editor_create_snapshot(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function editor.editor_cleanup_candidates(timestamptz,integer) from public,anon,authenticated;
grant execute on function editor.editor_save_project_recorded(uuid,jsonb,jsonb,bigint,boolean,boolean,bigint,text,uuid) to service_role;
grant execute on function editor.editor_record_event(uuid,uuid,text,bigint,jsonb) to service_role;
grant execute on function editor.editor_create_snapshot(uuid,uuid,text,text) to service_role;
grant execute on function editor.editor_cleanup_candidates(timestamptz,integer) to service_role;
commit;
