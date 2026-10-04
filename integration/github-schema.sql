-- REFERENCE COPY. Canonical migration and application belong to letscoding_lounge.
begin;
create table editor.editor_github_links (
  project_id uuid primary key references editor.editor_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  link jsonb not null check(jsonb_typeof(link)='object'),
  version uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
alter table editor.editor_github_links enable row level security;
revoke all on editor.editor_github_links from public,anon,authenticated;
grant select on editor.editor_github_links to authenticated;
grant all on editor.editor_github_links to service_role;
create policy editor_github_links_read on editor.editor_github_links for select to authenticated using (
  user_id=auth.uid() and exists(select 1 from editor.editor_projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null)
);

-- Files and their Git baseline move together. A stale file revision or link generation aborts both.
create or replace function editor.editor_github_sync(
  p_owner uuid, p_project jsonb, p_files jsonb, p_expected bigint,
  p_previous uuid, p_link jsonb, p_write_files boolean
) returns void language plpgsql security definer set search_path=editor,pg_temp as $$
declare pid uuid:=(p_project->>'id')::uuid; project editor.editor_projects; previous editor.editor_github_links;
begin
  perform pg_advisory_xact_lock(hashtextextended('editor-project:'||pid::text,0));
  if not exists(select 1 from public.profiles where id=p_owner and role in ('student','teacher','admin')) then raise exception 'inactive owner'; end if;
  select * into project from editor.editor_projects where id=pid for update;
  if found then
    if project.owner_id<>p_owner or project.deleted_at is not null then raise exception 'owner denied'; end if;
    if project.revision<>p_expected then raise exception 'revision conflict'; end if;
  elsif p_expected<>-1 or not p_write_files or p_link is null then raise exception 'project missing'; end if;
  select * into previous from editor.editor_github_links where project_id=pid;
  if previous.version is distinct from p_previous then raise exception 'link conflict'; end if;
  if p_write_files then
    perform editor.editor_save_project(p_owner,p_project,p_files,p_expected,true,project.id is null,coalesce(project.metadata_revision,0));
  end if;
  if p_link is null then
    delete from editor.editor_github_links where project_id=pid and user_id=p_owner;
  else
    insert into editor.editor_github_links(project_id,user_id,link,version)
    values(pid,p_owner,p_link,gen_random_uuid())
    on conflict(project_id) do update set link=excluded.link,version=excluded.version,updated_at=now();
  end if;
end $$;
revoke all on function editor.editor_github_sync(uuid,jsonb,jsonb,bigint,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function editor.editor_github_sync(uuid,jsonb,jsonb,bigint,uuid,jsonb,boolean) to service_role;
commit;
