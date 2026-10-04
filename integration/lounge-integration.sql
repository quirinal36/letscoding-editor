-- REVIEW COPY ONLY. Apply as a new migration owned by letscoding_lounge.
begin;
create table public.editor_lounge_nonces(nonce uuid primary key,expires_at timestamptz not null);
create table public.editor_lounge_uploads(
 id uuid primary key, user_id uuid not null references auth.users(id),editor_project_id uuid not null references public.editor_projects(id),
 project_id uuid not null references public.projects(id),idempotency_key text not null unique,storage_path text not null,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'), byte_size bigint not null check(byte_size between 1 and 31457280),
 form jsonb not null,policy_version text not null,status text not null default 'pending' check(status in ('pending','processing','completed','needs_review')),
 receipt jsonb,expires_at timestamptz not null,created_at timestamptz not null default now(),completed_at timestamptz
);
alter table public.editor_lounge_nonces enable row level security;
alter table public.editor_lounge_uploads enable row level security;
revoke all on public.editor_lounge_nonces,public.editor_lounge_uploads from anon,authenticated;
grant all on public.editor_lounge_nonces,public.editor_lounge_uploads to service_role;
create or replace function public.editor_prepare_lounge_upload(p_user uuid,p_editor uuid,p_lounge uuid,p_form jsonb,p_sha text,p_bytes bigint,p_key text,p_policy text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare existing public.editor_lounge_uploads; pid uuid; uid uuid:=gen_random_uuid();
begin
 perform pg_advisory_xact_lock(hashtextextended('editor-lounge:'||p_editor::text,0));
 if not exists(select 1 from editor_projects where id=p_editor and owner_id=p_user and deleted_at is null) then raise exception 'owner denied'; end if;
 if not exists(select 1 from profiles where id=p_user and role in ('student','teacher','admin')) then raise exception 'inactive user'; end if;
 if p_bytes<1 or p_bytes>31457280 or p_form->>'category' not in ('web_game','website') or p_form->>'slug' !~ '^[a-z0-9-]{3,20}$' then raise exception 'invalid metadata'; end if;
 select * into existing from editor_lounge_uploads where idempotency_key=p_key;
 if found then
  if existing.user_id<>p_user or existing.editor_project_id<>p_editor or existing.sha256<>p_sha or existing.form<>p_form then raise exception 'idempotency mismatch'; end if;
  if existing.status='completed' then return to_jsonb(existing); end if;
  if existing.status<>'pending' or existing.expires_at<=now() then raise exception 'retry requires reconciliation'; end if;
  return to_jsonb(existing);
 end if;
 if exists(select 1 from editor_lounge_uploads where editor_project_id=p_editor and status in ('pending','processing','needs_review')) then raise exception 'deploy already pending or requires review'; end if;
 if p_lounge is not null then
  if not exists(select 1 from projects where id=p_lounge and user_id=p_user) then raise exception 'lounge owner denied'; end if;pid:=p_lounge;
 else
  pid:=gen_random_uuid();
  insert into projects(id,user_id,title,description,category,slug,thumbnail_url,is_published,is_listed,play_price,ranking_score_mode)
  values(pid,p_user,p_form->>'title',p_form->>'description',p_form->>'category',p_form->>'slug','/default_thumbnail.png',false,false,0,'all_scores');
 end if;
 insert into editor_lounge_uploads(id,user_id,editor_project_id,project_id,idempotency_key,storage_path,sha256,byte_size,form,policy_version,expires_at)
 values(uid,p_user,p_editor,pid,p_key,p_user::text||'/editor-'||uid::text||'.zip',p_sha,p_bytes,p_form,p_policy,now()+interval '10 minutes') returning * into existing;
 return to_jsonb(existing);
end $$;
revoke all on function public.editor_prepare_lounge_upload(uuid,uuid,uuid,jsonb,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.editor_prepare_lounge_upload(uuid,uuid,uuid,jsonb,text,bigint,text,text) to service_role;
commit;
