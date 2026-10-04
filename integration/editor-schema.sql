-- REVIEW COPY ONLY: generate a NEW migration in letscoding_lounge, review, rehearse,
-- and apply there. This repository does not own the shared migration ledger.
begin;
create table if not exists public.editor_projects (
  id uuid primary key, owner_id uuid not null references auth.users(id), title text not null check(length(title) between 1 and 100),
  template text not null, lounge_project_id uuid, revision bigint not null default 0, metadata_revision bigint not null default 0,
  snapshot jsonb not null default '{"threads":[],"deployments":[]}', deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists editor_projects_owner on public.editor_projects(owner_id,updated_at desc);
create table if not exists public.editor_files (
  project_id uuid not null references public.editor_projects(id) on delete cascade,
  path text not null check(length(path) between 1 and 180), kind text not null check(kind in ('text','binary','directory')),
  text_content text, storage_path text, mime text not null, size_bytes bigint not null check(size_bytes between 0 and 104857600),
  updated_at timestamptz not null default now(), primary key(project_id,path),
  check((kind='text' and ((text_content is not null and storage_path is null) or (text_content is null and storage_path is not null))) or (kind='binary' and text_content is null and storage_path is not null) or kind='directory')
);
create table if not exists public.editor_ai_threads (
  id uuid primary key, project_id uuid not null references public.editor_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id), title text not null, auto_apply boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.editor_ai_messages (
  id uuid primary key, thread_id uuid not null references public.editor_ai_threads(id) on delete cascade,
  role text not null check(role in ('user','assistant')), parts jsonb not null, status text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.editor_ai_usage_daily (
  user_id uuid not null references auth.users(id), date date not null,
  prompt_tokens bigint not null default 0, completion_tokens bigint not null default 0,
  cost_usd numeric(20,10) not null default 0, reserved_usd numeric(20,10) not null default 0,
  primary key(user_id,date),check(cost_usd>=0 and reserved_usd>=0)
);
create table if not exists public.editor_deployments (
  id uuid primary key, project_id uuid not null references public.editor_projects(id) on delete cascade,
  lounge_project_id uuid, zip_sha256 text not null, policy_version text not null,status text not null,
  result_url text,error text,created_at timestamptz not null
);
create table if not exists public.editor_file_versions (
  id bigint generated always as identity primary key,project_id uuid not null references public.editor_projects(id) on delete cascade,
  path text not null,revision bigint not null,file_data jsonb not null,created_at timestamptz not null default now()
);
create table if not exists public.editor_ai_reservations (
  id uuid primary key,user_id uuid not null references auth.users(id),date date not null,
  amount numeric(20,10) not null check(amount>0),settled boolean not null default false,created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['editor_projects','editor_files','editor_ai_threads','editor_ai_messages','editor_ai_usage_daily','editor_deployments','editor_file_versions','editor_ai_reservations'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
grant usage,select on sequence public.editor_file_versions_id_seq to service_role;
create policy editor_projects_read on public.editor_projects for select to authenticated using(owner_id=auth.uid() and deleted_at is null);
create policy editor_files_read on public.editor_files for select to authenticated using(exists(select 1 from public.editor_projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null));
create policy editor_threads_read on public.editor_ai_threads for select to authenticated using(user_id=auth.uid() and exists(select 1 from public.editor_projects p where p.id=project_id and p.deleted_at is null));
create policy editor_messages_read on public.editor_ai_messages for select to authenticated using(exists(select 1 from public.editor_ai_threads t where t.id=thread_id and t.user_id=auth.uid()));
create policy editor_usage_read on public.editor_ai_usage_daily for select to authenticated using(user_id=auth.uid());
create policy editor_deployments_read on public.editor_deployments for select to authenticated using(exists(select 1 from public.editor_projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null));
create policy editor_versions_read on public.editor_file_versions for select to authenticated using(exists(select 1 from public.editor_projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null));
create policy editor_reservations_read on public.editor_ai_reservations for select to authenticated using(user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit) values('editor-files','editor-files',false,5242880) on conflict(id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('editor-attachments','editor-attachments',false,5242880,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
-- Browser receives signed upload URLs; no direct authenticated INSERT/UPDATE policy.
create policy editor_private_objects_read on storage.objects for select to authenticated using(
  bucket_id in ('editor-files','editor-attachments') and (storage.foldername(name))[1]=auth.uid()::text
  and exists(select 1 from public.editor_projects p where p.id::text=(storage.foldername(name))[2] and p.owner_id=auth.uid() and p.deleted_at is null)
);

create or replace function public.editor_save_project(p_owner uuid,p_project jsonb,p_files jsonb,p_expected bigint,p_advance boolean default true,p_metadata boolean default true,p_meta_expected bigint default 0)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare pid uuid:=(p_project->>'id')::uuid; old public.editor_projects; ver bigint; f jsonb; t jsonb; m jsonb; d jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('editor-project:'||pid::text,0));
  select * into old from public.editor_projects where id=pid for update;
  if found then
    if old.owner_id<>p_owner or old.deleted_at is not null then raise exception 'project owner denied'; end if;
    if old.revision<>p_expected then raise exception 'revision conflict'; end if;
    if p_metadata and old.metadata_revision<>p_meta_expected then raise exception 'metadata revision conflict'; end if;
  else
    if p_expected<>-1 then raise exception 'revision conflict'; end if;
  end if;
  ver:=case when p_advance then p_expected+1 else greatest(0,p_expected) end;
  if p_advance and old.id is not null then
    insert into public.editor_file_versions(project_id,path,revision,file_data)
    select pid,ef.path,old.revision,to_jsonb(ef) from public.editor_files ef
    where ef.project_id=pid and not exists(select 1 from jsonb_array_elements(p_files) nf where nf->>'path'=ef.path and nf->>'text_content' is not distinct from ef.text_content and nf->>'storage_path' is not distinct from ef.storage_path and nf->>'kind'=ef.kind);
  end if;
  insert into public.editor_projects(id,owner_id,title,template,lounge_project_id,revision,metadata_revision,snapshot,deleted_at)
  values(pid,p_owner,p_project->>'title',p_project->>'template',case when not p_metadata and old.id is not null then old.lounge_project_id else nullif(p_project->>'loungeId','')::uuid end,ver,coalesce(old.metadata_revision,0)+case when p_metadata then 1 else 0 end,case when not p_metadata and old.id is not null then old.snapshot else jsonb_build_object('threads',p_project->'threads','deployments',p_project->'deployments') end,nullif(p_project->>'deletedAt','')::timestamptz)
  on conflict(id) do update set title=excluded.title,lounge_project_id=excluded.lounge_project_id,revision=excluded.revision,metadata_revision=excluded.metadata_revision,snapshot=excluded.snapshot,deleted_at=excluded.deleted_at,updated_at=now();
  delete from public.editor_files where project_id=pid;
  for f in select * from jsonb_array_elements(p_files) loop
    insert into public.editor_files(project_id,path,kind,text_content,storage_path,mime,size_bytes)
    values(pid,f->>'path',f->>'kind',f->>'text_content',f->>'storage_path',f->>'mime',(f->>'size_bytes')::bigint);
  end loop;
  if p_metadata then
  for t in select * from jsonb_array_elements(p_project->'threads') loop
    insert into public.editor_ai_threads(id,project_id,user_id,title,auto_apply) values((t->>'id')::uuid,pid,p_owner,t->>'title',(t->>'autoApply')::boolean)
    on conflict(id) do update set title=excluded.title,auto_apply=excluded.auto_apply where editor_ai_threads.project_id=pid and editor_ai_threads.user_id=p_owner;
    for m in select * from jsonb_array_elements(t->'messages') loop
      insert into public.editor_ai_messages(id,thread_id,role,parts,status) values((m->>'id')::uuid,(t->>'id')::uuid,m->>'role',m,m->>'status')
      on conflict(id) do update set parts=excluded.parts,status=excluded.status where editor_ai_messages.thread_id=(t->>'id')::uuid;
    end loop;
  end loop;
  for d in select * from jsonb_array_elements(p_project->'deployments') loop
    insert into public.editor_deployments(id,project_id,lounge_project_id,zip_sha256,policy_version,status,result_url,error,created_at)
    values((d->>'id')::uuid,pid,nullif(p_project->>'loungeId','')::uuid,d->>'sha256',d->>'policyVersion',d->>'status',d->>'url',d->>'error',(d->>'createdAt')::timestamptz)
    on conflict(id) do nothing;
  end loop;
  end if;
  return jsonb_build_object('revision',ver,'metadataRevision',coalesce(old.metadata_revision,0)+case when p_metadata then 1 else 0 end);
end $$;

create or replace function public.editor_reserve_usage(p_owner uuid,p_id uuid,p_amount numeric,p_daily numeric,p_monthly numeric)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare today date:=(now() at time zone 'Asia/Seoul')::date; used numeric; month_used numeric;
begin
  if p_amount<=0 or p_daily<=0 or p_monthly<=0 then raise exception 'budget not configured'; end if;
  perform pg_advisory_xact_lock(hashtextextended('editor-budget:'||p_owner::text,0));
  if exists(select 1 from public.editor_ai_reservations where user_id=p_owner and not settled) then raise exception 'request in progress or requires reconciliation'; end if;
  insert into public.editor_ai_usage_daily(user_id,date) values(p_owner,today) on conflict do nothing;
  select cost_usd+reserved_usd into used from public.editor_ai_usage_daily where user_id=p_owner and date=today;
  select coalesce(sum(cost_usd+reserved_usd),0) into month_used from public.editor_ai_usage_daily where user_id=p_owner and date>=date_trunc('month',today::timestamp)::date;
  if used+p_amount>p_daily or month_used+p_amount>p_monthly then raise exception 'budget exceeded'; end if;
  insert into public.editor_ai_reservations(id,user_id,date,amount) values(p_id,p_owner,today,p_amount);
  update public.editor_ai_usage_daily set reserved_usd=reserved_usd+p_amount where user_id=p_owner and date=today;
end $$;
create or replace function public.editor_settle_usage(p_owner uuid,p_id uuid,p_cost numeric,p_prompt bigint,p_completion bigint)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare item public.editor_ai_reservations;
begin
  if p_cost<0 or p_prompt<0 or p_completion<0 then raise exception 'invalid usage'; end if;
  perform pg_advisory_xact_lock(hashtextextended('editor-budget:'||p_owner::text,0));
  select * into item from public.editor_ai_reservations where id=p_id and user_id=p_owner for update;
  if not found then raise exception 'reservation missing'; end if;
  if item.settled then return; end if;
  update public.editor_ai_usage_daily set reserved_usd=greatest(0,reserved_usd-item.amount),cost_usd=cost_usd+p_cost,prompt_tokens=prompt_tokens+p_prompt,completion_tokens=completion_tokens+p_completion where user_id=p_owner and date=item.date;
  update public.editor_ai_reservations set settled=true where id=p_id;
end $$;
revoke all on function public.editor_save_project(uuid,jsonb,jsonb,bigint,boolean,boolean,bigint) from public,anon,authenticated;
revoke all on function public.editor_reserve_usage(uuid,uuid,numeric,numeric,numeric) from public,anon,authenticated;
revoke all on function public.editor_settle_usage(uuid,uuid,numeric,bigint,bigint) from public,anon,authenticated;
grant execute on function public.editor_save_project(uuid,jsonb,jsonb,bigint,boolean,boolean,bigint) to service_role;
grant execute on function public.editor_reserve_usage(uuid,uuid,numeric,numeric,numeric) to service_role;
grant execute on function public.editor_settle_usage(uuid,uuid,numeric,bigint,bigint) to service_role;
create or replace function public.editor_cleanup_candidates(p_cutoff timestamptz,p_limit integer default 100)
returns table(bucket_id text,name text) language sql security definer set search_path=public,pg_temp as $$
 select o.bucket_id,o.name from storage.objects o where o.created_at<p_cutoff
 and (o.bucket_id='editor-attachments' or (o.bucket_id='editor-files'
 and not exists(select 1 from editor_files f where f.storage_path=o.name)
 and not exists(select 1 from editor_file_versions v where v.file_data->>'storage_path'=o.name)))
 order by o.created_at limit least(greatest(p_limit,1),100);
$$;
revoke all on function public.editor_cleanup_candidates(timestamptz,integer) from public,anon,authenticated;
grant execute on function public.editor_cleanup_candidates(timestamptz,integer) to service_role;
commit;
