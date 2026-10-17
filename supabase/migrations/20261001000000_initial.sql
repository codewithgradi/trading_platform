-- Northline platform. Apply to a fresh Supabase project with `supabase db push`.
-- The Next.js server uses a trusted direct Postgres connection through Drizzle;
-- browser access remains subject to the policies below. Never expose DATABASE_URL.
create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role varchar(12) not null check (role in ('admin','trader','client')),
  full_name text not null, email text not null unique, password_hash text,
  phone text, avatar_url text, theme varchar(12) not null default 'system',
  onboarding_completed boolean not null default false,
  status varchar(16) not null default 'active',
  notification_preferences jsonb default '{"email":true,"inApp":true}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role);
create table if not exists public.trader_clients (
  client_id uuid primary key references public.profiles(id) on delete cascade,
  trader_id uuid not null references public.profiles(id),
  assigned_at timestamptz not null default now()
);
create index if not exists trader_clients_trader_idx on public.trader_clients(trader_id);
create table if not exists public.accounts (
  client_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(18,2) not null default 0.00,
  currency varchar(3) not null default 'ZAR' check (currency = 'ZAR'),
  updated_at timestamptz not null default now()
);
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.profiles(id),
  trader_id uuid references public.profiles(id), type varchar(24) not null,
  amount numeric(18,2) not null, balance_before numeric(18,2) not null,
  balance_after numeric(18,2) not null, note text, reference text,
  status varchar(16) not null default 'completed', idempotency_key uuid unique,
  created_at timestamptz not null default now()
);
create index if not exists transactions_client_date_idx on public.transactions(client_id,created_at);
create index if not exists transactions_trader_idx on public.transactions(trader_id);
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.profiles(id),
  amount numeric(18,2) not null, status varchar(16) not null default 'pending', note text,
  reviewed_by uuid references public.profiles(id), reason text,
  created_at timestamptz not null default now(), reviewed_at timestamptz, processed_at timestamptz
);
create index if not exists withdrawals_client_idx on public.withdrawal_requests(client_id);
create index if not exists withdrawals_status_idx on public.withdrawal_requests(status);
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(), trader_id uuid not null references public.profiles(id),
  instrument text not null, direction varchar(8) not null, size numeric(18,4) not null,
  entry numeric(18,4) not null, exit numeric(18,4), pnl numeric(18,2) not null default 0.00,
  status varchar(12) not null default 'open', notes text,
  opened_at timestamptz not null default now(), closed_at timestamptz
);
create index if not exists trades_trader_date_idx on public.trades(trader_id,opened_at);
create table if not exists public.trade_allocations (
  id uuid primary key default gen_random_uuid(), trade_id uuid not null references public.trades(id),
  client_id uuid not null references public.profiles(id), amount numeric(18,2) not null,
  created_at timestamptz not null default now(), constraint trade_allocations_unique_idx unique(trade_id,client_id)
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  type varchar(32) not null, title text not null, body text not null,
  data jsonb default '{}'::jsonb, read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists notifications_user_date_idx on public.notifications(user_id,created_at);
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id), category varchar(24) not null, subject text not null,
  message text not null, attachment_url text, status varchar(16) not null default 'open',
  priority varchar(12) not null default 'normal', created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feedback_client_idx on public.feedback(client_id);
create index if not exists feedback_assignee_idx on public.feedback(assigned_to);
create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(), feedback_id uuid not null references public.feedback(id) on delete cascade,
  author_id uuid not null references public.profiles(id), body text not null, created_at timestamptz not null default now()
);
create index if not exists feedback_messages_thread_idx on public.feedback_messages(feedback_id);
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id),
  action text not null, entity text not null, entity_id text, before_value jsonb, after_value jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_date_idx on public.audit_log(created_at);
create index if not exists audit_actor_idx on public.audit_log(actor_id);
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null,
  phone text, message text not null, status varchar(16) not null default 'new', created_at timestamptz not null default now()
);
create index if not exists contacts_date_idx on public.contact_submissions(created_at);
create table if not exists public.cms_documents (
  key varchar(80) primary key, published jsonb not null, draft jsonb not null,
  version integer not null default 1, updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(), published_at timestamptz not null default now()
);
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(), question text not null, answer text not null,
  status varchar(12) not null default 'published', sort_order integer not null default 0,
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now()
);
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(), quote text not null, name text not null,
  role text not null, avatar_url text, rating integer not null default 5 check (rating between 1 and 5),
  status varchar(12) not null default 'published', sort_order integer not null default 0,
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now()
);

-- Security-definer predicates avoid recursive RLS evaluation on profiles and assignments.
create or replace function private.my_role() returns text language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.profiles where id = (select auth.uid()) and status = 'active' limit 1;
$$;
create or replace function private.can_access_client(target uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select (select private.my_role()) = 'admin' or target = (select auth.uid()) or exists (
    select 1 from public.trader_clients where client_id = target and trader_id = (select auth.uid())
  );
$$;
create or replace function private.can_view_profile(target uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select (select private.my_role()) = 'admin' or target = (select auth.uid()) or exists (
    select 1 from public.trader_clients where
      (client_id = target and trader_id = (select auth.uid())) or
      (trader_id = target and client_id = (select auth.uid()))
  );
$$;
grant usage on schema private to anon, authenticated;
grant execute on all functions in schema private to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.trader_clients enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.trades enable row level security;
alter table public.trade_allocations enable row level security;
alter table public.notifications enable row level security;
alter table public.feedback enable row level security;
alter table public.feedback_messages enable row level security;
alter table public.audit_log enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.cms_documents enable row level security;
alter table public.faqs enable row level security;
alter table public.testimonials enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (private.can_view_profile(id));
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy assignments_read on public.trader_clients for select to authenticated using ((select private.my_role()) = 'admin' or trader_id = (select auth.uid()) or client_id = (select auth.uid()));
create policy assignments_insert_admin on public.trader_clients for insert to authenticated with check ((select private.my_role()) = 'admin');
create policy assignments_update_admin on public.trader_clients for update to authenticated using ((select private.my_role()) = 'admin') with check ((select private.my_role()) = 'admin');
create policy assignments_delete_admin on public.trader_clients for delete to authenticated using ((select private.my_role()) = 'admin');
create policy accounts_read on public.accounts for select to authenticated using (private.can_access_client(client_id));
create policy transactions_read on public.transactions for select to authenticated using (private.can_access_client(client_id));
create policy withdrawals_read on public.withdrawal_requests for select to authenticated using (private.can_access_client(client_id));
create policy withdrawals_insert_client on public.withdrawal_requests for insert to authenticated with check (client_id = (select auth.uid()) and (select private.my_role()) = 'client');
create policy withdrawals_update_manager on public.withdrawal_requests for update to authenticated using (private.can_access_client(client_id) and (select private.my_role()) in ('admin','trader')) with check (private.can_access_client(client_id));
create policy trades_read on public.trades for select to authenticated using ((select private.my_role()) = 'admin' or trader_id = (select auth.uid()));
create policy trades_insert on public.trades for insert to authenticated with check (trader_id = (select auth.uid()) and (select private.my_role()) = 'trader');
create policy trades_update on public.trades for update to authenticated using (trader_id = (select auth.uid()) and (select private.my_role()) = 'trader') with check (trader_id = (select auth.uid()));
create policy allocations_read on public.trade_allocations for select to authenticated using (private.can_access_client(client_id));
create policy notifications_read on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_mark_read on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy feedback_read on public.feedback for select to authenticated using (private.can_access_client(client_id));
create policy feedback_insert_client on public.feedback for insert to authenticated with check (client_id = (select auth.uid()) and (select private.my_role()) = 'client');
create policy feedback_update_manager on public.feedback for update to authenticated using (private.can_access_client(client_id) and (select private.my_role()) in ('admin','trader')) with check (private.can_access_client(client_id));
create policy feedback_messages_read on public.feedback_messages for select to authenticated using (exists(select 1 from public.feedback f where f.id = feedback_id and private.can_access_client(f.client_id)));
create policy feedback_messages_insert on public.feedback_messages for insert to authenticated with check (author_id = (select auth.uid()) and exists(select 1 from public.feedback f where f.id = feedback_id and private.can_access_client(f.client_id)));
create policy audit_admin_read on public.audit_log for select to authenticated using ((select private.my_role()) = 'admin');
create policy contact_admin_read on public.contact_submissions for select to authenticated using ((select private.my_role()) = 'admin');
create policy cms_admin_read on public.cms_documents for select to authenticated using ((select private.my_role()) = 'admin');
create policy cms_admin_insert on public.cms_documents for insert to authenticated with check ((select private.my_role()) = 'admin');
create policy cms_admin_update on public.cms_documents for update to authenticated using ((select private.my_role()) = 'admin') with check ((select private.my_role()) = 'admin');
create policy faqs_public_read on public.faqs for select to anon, authenticated using (status = 'published' or (select private.my_role()) = 'admin');
create policy faqs_admin_insert on public.faqs for insert to authenticated with check ((select private.my_role()) = 'admin');
create policy faqs_admin_update on public.faqs for update to authenticated using ((select private.my_role()) = 'admin') with check ((select private.my_role()) = 'admin');
create policy faqs_admin_delete on public.faqs for delete to authenticated using ((select private.my_role()) = 'admin');
create policy testimonials_public_read on public.testimonials for select to anon, authenticated using (status = 'published' or (select private.my_role()) = 'admin');
create policy testimonials_admin_insert on public.testimonials for insert to authenticated with check ((select private.my_role()) = 'admin');
create policy testimonials_admin_update on public.testimonials for update to authenticated using ((select private.my_role()) = 'admin') with check ((select private.my_role()) = 'admin');
create policy testimonials_admin_delete on public.testimonials for delete to authenticated using ((select private.my_role()) = 'admin');

-- Do not expose draft documents, credential hashes, balances writes, or audit writes via PostgREST.
revoke all on public.profiles, public.accounts, public.transactions, public.audit_log, public.cms_documents, public.contact_submissions from anon, authenticated;
grant select (id,role,full_name,email,phone,avatar_url,theme,onboarding_completed,status,notification_preferences,created_at,updated_at) on public.profiles to authenticated;
grant update (full_name,phone,avatar_url,theme,onboarding_completed,notification_preferences) on public.profiles to authenticated;
grant select on public.accounts, public.transactions to authenticated;
grant select, insert, update, delete on public.trader_clients to authenticated;
grant select, insert, update on public.withdrawal_requests to authenticated;
grant select, insert, update on public.trades to authenticated;
grant select on public.trade_allocations to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select, insert, update on public.feedback to authenticated;
grant select, insert on public.feedback_messages to authenticated;
grant select on public.audit_log, public.contact_submissions, public.cms_documents to authenticated;
grant insert, update on public.cms_documents to authenticated;
grant select on public.faqs, public.testimonials to anon, authenticated;
grant insert, update, delete on public.faqs, public.testimonials to authenticated;

-- Public access to published CMS values without leaking the drafts in cms_documents.
create or replace function public.get_published_content()
returns table(key varchar, published jsonb) language sql stable security definer set search_path = public, pg_temp as $$
  select d.key, d.published from public.cms_documents d;
$$;
revoke all on function public.get_published_content() from public;
grant execute on function public.get_published_content() to anon, authenticated;

-- Transactional RPC for direct Supabase clients. The Next.js server mirrors this
-- transaction through Drizzle so its ledger, notification and audit writes are atomic.
create or replace function public.apply_balance_change(
  p_client uuid, p_type text, p_amount numeric, p_note text, p_reference text, p_idempotency uuid
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_actor uuid := auth.uid(); v_before numeric(18,2); v_after numeric(18,2); v_existing uuid;
begin
  if v_actor is null or private.my_role() not in ('admin','trader') or not private.can_access_client(p_client) then raise exception 'Not authorised'; end if;
  if p_type not in ('deposit','withdrawal','trade_outcome','adjustment') or p_amount is null or p_amount = 0 or abs(p_amount) > 100000000 then raise exception 'Invalid balance change'; end if;
  if (p_type = 'deposit' and p_amount < 0) or (p_type = 'withdrawal' and p_amount > 0) then raise exception 'Invalid direction'; end if;
  if length(trim(coalesce(p_note,''))) < 3 or p_idempotency is null then raise exception 'A reason and idempotency key are required'; end if;
  select id into v_existing from public.transactions where idempotency_key = p_idempotency;
  if v_existing is not null then return jsonb_build_object('id',v_existing,'already_applied',true); end if;
  select balance into v_before from public.accounts where client_id = p_client for update;
  if not found then raise exception 'Account not found'; end if;
  v_after := v_before + p_amount;
  if v_after < 0 then raise exception 'Insufficient balance'; end if;
  update public.accounts set balance = v_after, updated_at = now() where client_id = p_client;
  insert into public.transactions(client_id,trader_id,type,amount,balance_before,balance_after,note,reference,idempotency_key)
  values(p_client,v_actor,p_type,p_amount,v_before,v_after,trim(p_note),p_reference,p_idempotency) returning id into v_existing;
  insert into public.notifications(user_id,type,title,body,data)
  values(p_client,'balance','Your balance has changed','An account change has been recorded. Open your ledger for the full details.',jsonb_build_object('amount',p_amount,'before',v_before,'after',v_after));
  insert into public.audit_log(actor_id,action,entity,entity_id,before_value,after_value)
  values(v_actor,'balance.'||p_type,'account',p_client::text,jsonb_build_object('balance',v_before),jsonb_build_object('balance',v_after,'amount',p_amount,'note',p_note));
  return jsonb_build_object('id',v_existing,'before',v_before,'after',v_after);
end; $$;
revoke all on function public.apply_balance_change(uuid,text,numeric,text,text,uuid) from public;
grant execute on function public.apply_balance_change(uuid,text,numeric,text,text,uuid) to authenticated;

create or replace function public.process_withdrawal(p_request uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_actor uuid := auth.uid(); v_request public.withdrawal_requests%rowtype; v_before numeric(18,2); v_after numeric(18,2);
begin
  select * into v_request from public.withdrawal_requests where id = p_request for update;
  if not found or v_request.status <> 'approved' or private.my_role() not in ('admin','trader') or not private.can_access_client(v_request.client_id) then raise exception 'Request unavailable'; end if;
  select balance into v_before from public.accounts where client_id = v_request.client_id for update;
  if v_before < v_request.amount then raise exception 'Insufficient balance'; end if;
  v_after := v_before - v_request.amount;
  update public.accounts set balance = v_after, updated_at = now() where client_id = v_request.client_id;
  insert into public.transactions(client_id,trader_id,type,amount,balance_before,balance_after,note,reference,idempotency_key)
  values(v_request.client_id,v_actor,'withdrawal',-v_request.amount,v_before,v_after,'Withdrawal request processed',p_request::text,p_request);
  update public.withdrawal_requests set status='processed', reviewed_by=v_actor, reviewed_at=now(), processed_at=now() where id=p_request;
  insert into public.notifications(user_id,type,title,body,data)
  values(v_request.client_id,'balance','Withdrawal processed','Your withdrawal has been processed. Open your ledger for the full details.',jsonb_build_object('amount',-v_request.amount,'before',v_before,'after',v_after));
  insert into public.audit_log(actor_id,action,entity,entity_id,before_value,after_value)
  values(v_actor,'withdrawal.processed','withdrawal',p_request::text,jsonb_build_object('status','approved','balance',v_before),jsonb_build_object('status','processed','balance',v_after));
  return jsonb_build_object('before',v_before,'after',v_after);
end; $$;
revoke all on function public.process_withdrawal(uuid) from public;
grant execute on function public.process_withdrawal(uuid) to authenticated;

-- Public image buckets. Uploads are folder-scoped; CMS images require admin access.
insert into storage.buckets(id,name,public) values ('avatars','avatars',true),('cms-images','cms-images',true) on conflict (id) do nothing;
create policy northline_images_read on storage.objects for select to anon, authenticated using (bucket_id in ('avatars','cms-images'));
create policy northline_avatars_insert on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy northline_avatars_update on storage.objects for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id='avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy northline_cms_insert on storage.objects for insert to authenticated with check (bucket_id='cms-images' and (storage.foldername(name))[1] = (select auth.uid())::text and (select private.my_role())='admin');
create policy northline_cms_update on storage.objects for update to authenticated using (bucket_id='cms-images' and (select private.my_role())='admin') with check (bucket_id='cms-images' and (select private.my_role())='admin');

-- Register the tables needed by live dashboards if the Supabase publication exists.
do $$ declare table_name text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach table_name in array array['accounts','transactions','notifications','withdrawal_requests','feedback','trades'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
        execute format('alter publication supabase_realtime add table public.%I',table_name);
      end if;
    end loop;
  end if;
end $$;
