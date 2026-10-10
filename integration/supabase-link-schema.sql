-- REFERENCE COPY. Canonical migration and application belong to letscoding_lounge.
-- Student Supabase link (public URL + anon key) rides in editor_projects.snapshot.supabase.
-- Only this snapshot expression changes versus editor-schema.sql; the rest of editor_save_project is identical.
begin;
create or replace function editor.editor_save_project(p_owner uuid,p_project jsonb,p_files jsonb,p_expected bigint,p_advance boolean default true,p_metadata boolean default true,p_meta_expected bigint default 0)
returns jsonb language plpgsql security definer set search_path=editor,pg_temp as $$
declare pid uuid:=(p_project->>'id')::uuid; old editor.editor_projects; ver bigint; f jsonb; t jsonb; m jsonb; d jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('editor-project:'||pid::text,0));
  select * into old from editor.editor_projects where id=pid for update;
  if found then
    if old.owner_id<>p_owner or old.deleted_at is not null then raise exception 'project owner denied'; end if;
    if old.revision<>p_expected then raise exception 'revision conflict'; end if;
    if p_metadata and old.metadata_revision<>p_meta_expected then raise exception 'metadata revision conflict'; end if;
  else
    if p_expected<>-1 then raise exception 'revision conflict'; end if;
  end if;
  ver:=case when p_advance then p_expected+1 else greatest(0,p_expected) end;
  if p_advance and old.id is not null then
    insert into editor.editor_file_versions(project_id,path,revision,file_data)
    select pid,ef.path,old.revision,to_jsonb(ef) from editor.editor_files ef
    where ef.project_id=pid and not exists(select 1 from jsonb_array_elements(p_files) nf where nf->>'path'=ef.path and nf->>'text_content' is not distinct from ef.text_content and nf->>'storage_path' is not distinct from ef.storage_path and nf->>'kind'=ef.kind);
  end if;
  insert into editor.editor_projects(id,owner_id,title,template,lounge_project_id,revision,metadata_revision,snapshot,deleted_at)
  values(pid,p_owner,p_project->>'title',p_project->>'template',case when not p_metadata and old.id is not null then old.lounge_project_id else nullif(p_project->>'loungeId','')::uuid end,ver,coalesce(old.metadata_revision,0)+case when p_metadata then 1 else 0 end,case when not p_metadata and old.id is not null then old.snapshot else jsonb_strip_nulls(jsonb_build_object('threads',p_project->'threads','deployments',p_project->'deployments','supabase',p_project->'supabase')) end,nullif(p_project->>'deletedAt','')::timestamptz)
  on conflict(id) do update set title=excluded.title,lounge_project_id=excluded.lounge_project_id,revision=excluded.revision,metadata_revision=excluded.metadata_revision,snapshot=excluded.snapshot,deleted_at=excluded.deleted_at,updated_at=now();
  delete from editor.editor_files where project_id=pid;
  for f in select * from jsonb_array_elements(p_files) loop
    insert into editor.editor_files(project_id,path,kind,text_content,storage_path,mime,size_bytes)
    values(pid,f->>'path',f->>'kind',f->>'text_content',f->>'storage_path',f->>'mime',(f->>'size_bytes')::bigint);
  end loop;
  if p_metadata then
  for t in select * from jsonb_array_elements(p_project->'threads') loop
    insert into editor.editor_ai_threads(id,project_id,user_id,title,auto_apply) values((t->>'id')::uuid,pid,p_owner,t->>'title',(t->>'autoApply')::boolean)
    on conflict(id) do update set title=excluded.title,auto_apply=excluded.auto_apply where editor_ai_threads.project_id=pid and editor_ai_threads.user_id=p_owner;
    for m in select * from jsonb_array_elements(t->'messages') loop
      insert into editor.editor_ai_messages(id,thread_id,role,parts,status) values((m->>'id')::uuid,(t->>'id')::uuid,m->>'role',m,m->>'status')
      on conflict(id) do update set parts=excluded.parts,status=excluded.status where editor_ai_messages.thread_id=(t->>'id')::uuid;
    end loop;
  end loop;
  for d in select * from jsonb_array_elements(p_project->'deployments') loop
    insert into editor.editor_deployments(id,project_id,lounge_project_id,zip_sha256,policy_version,status,result_url,error,created_at)
    values((d->>'id')::uuid,pid,nullif(p_project->>'loungeId','')::uuid,d->>'sha256',d->>'policyVersion',d->>'status',d->>'url',d->>'error',(d->>'createdAt')::timestamptz)
    on conflict(id) do nothing;
  end loop;
  end if;
  return jsonb_build_object('revision',ver,'metadataRevision',coalesce(old.metadata_revision,0)+case when p_metadata then 1 else 0 end);
end $$;
commit;
