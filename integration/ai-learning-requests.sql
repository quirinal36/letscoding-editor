-- Server-only learning records. No backfill; no production retention policy is implied.
create table editor.editor_ai_requests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  thread_id uuid,
  org_id uuid,
  class_id uuid,
  kind text not null check (kind in ('chat','image','local')),
  prompt text not null check (length(prompt) between 1 and 12000),
  fingerprint text not null check (length(fingerprint)=64),
  selected_model text not null,
  actual_model text,
  retry_of uuid,
  status text not null default 'received' check (status in ('received','running','complete','partial','rejected','error','interrupted','unknown','save_failed','settlement_failed')),
  reason text,
  reservation_id uuid,
  cost_usd numeric(20,10) default 0 check (cost_usd>=0),
  cost_kind text default 'free' check (cost_kind in ('known','reserved','free')),
  prompt_tokens bigint check (prompt_tokens>=0),
  completion_tokens bigint check (completion_tokens>=0),
  policy_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  expires_at timestamptz not null
);
alter table editor.editor_ai_requests enable row level security;
revoke all on editor.editor_ai_requests from public, anon, authenticated;
grant select,insert,update,delete on editor.editor_ai_requests to service_role;
create index editor_ai_requests_org_time on editor.editor_ai_requests(org_id,created_at desc,id desc);
create index editor_ai_requests_user_time on editor.editor_ai_requests(user_id,created_at desc,id desc);
create index editor_ai_requests_expiry on editor.editor_ai_requests(expires_at);

create function editor.editor_begin_ai_request(p_owner uuid,p_id uuid,p_project uuid,p_thread uuid,p_kind text,p_prompt text,p_fingerprint text,p_model text,p_retry uuid,p_days integer,p_policy text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item editor.editor_ai_requests; person public.profiles; inserted integer;
begin
  if p_days not between 1 and 3650 or length(p_policy) not between 1 and 100 then raise exception 'invalid policy'; end if;
  if not exists(select 1 from editor.editor_projects where id=p_project and owner_id=p_owner and deleted_at is null) then raise exception 'invalid owner'; end if;
  if p_thread is not null and not exists(select 1 from editor.editor_ai_threads where id=p_thread and project_id=p_project and user_id=p_owner) then raise exception 'invalid thread'; end if;
  select * into person from public.profiles where id=p_owner and role in ('student','teacher','admin');
  if not found then raise exception 'inactive owner'; end if;
  if p_retry is not null then
    if not exists(select 1 from editor.editor_ai_requests where id=p_retry) then p_retry := null;
    elsif not exists(select 1 from editor.editor_ai_requests where id=p_retry and user_id=p_owner and project_id=p_project and thread_id is not distinct from p_thread) then raise exception 'invalid retry'; end if;
  end if;
  insert into editor.editor_ai_requests(id,user_id,project_id,thread_id,org_id,class_id,kind,prompt,fingerprint,selected_model,retry_of,policy_version,expires_at)
    values(p_id,p_owner,p_project,p_thread,person.org_id,person.class_id,p_kind,p_prompt,p_fingerprint,p_model,p_retry,p_policy,now()+make_interval(days=>p_days))
    on conflict(id) do nothing;
  get diagnostics inserted = row_count;
  select * into item from editor.editor_ai_requests where id=p_id;
  if item.user_id<>p_owner or item.fingerprint<>p_fingerprint then raise exception 'request conflict'; end if;
  return jsonb_build_object('created',inserted=1,'status',item.status);
end $$;
revoke all on function editor.editor_begin_ai_request(uuid,uuid,uuid,uuid,text,text,text,text,uuid,integer,text) from public,anon,authenticated;
grant execute on function editor.editor_begin_ai_request(uuid,uuid,uuid,uuid,text,text,text,text,uuid,integer,text) to service_role;

-- No project/thread FK: deleting a conversation must not erase learning history.
-- Current identity is joined at read time so transfers and assignment changes take effect immediately.
create view editor.editor_ai_request_management with (security_invoker=true) as
select r.*,p.org_id as current_org_id,p.class_id as current_class_id,p.role as current_role,
       coalesce(p.display_name,p.username,'학생') as student_name,
       c.name as class_name, pr.title as project_title,
       (r.org_id=p.org_id) as same_org,
       exists(select 1 from public.organization_memberships m where m.user_id=p.id and m.org_id=r.org_id and m.ended_at is null) as active_membership,
       left(r.prompt,160) as prompt_preview
from editor.editor_ai_requests r join public.profiles p on p.id=r.user_id
left join public.classes c on c.id=r.class_id
left join editor.editor_projects pr on pr.id=r.project_id;
revoke all on editor.editor_ai_request_management from public,anon,authenticated;
grant select on editor.editor_ai_request_management to service_role;

-- Scheduled only after the retention policy is approved. Never settle unknown costs to zero.
create function editor.editor_cleanup_ai_requests() returns jsonb
language plpgsql security definer set search_path='' as $$
declare purged integer; stale integer;
begin
  update editor.editor_ai_requests set status='unknown',reason='process_lost',updated_at=now(),finished_at=now()
    where id in (select id from editor.editor_ai_requests where status in ('received','running') and updated_at<now()-interval '10 minutes' limit 500 for update skip locked);
  get diagnostics stale=row_count;
  delete from editor.editor_ai_requests where id in
    (select id from editor.editor_ai_requests where expires_at<=now() order by expires_at limit 500 for update skip locked);
  get diagnostics purged=row_count;
  return jsonb_build_object('purged',purged,'stale',stale);
end $$;
revoke all on function editor.editor_cleanup_ai_requests() from public,anon,authenticated;
grant execute on function editor.editor_cleanup_ai_requests() to service_role;
