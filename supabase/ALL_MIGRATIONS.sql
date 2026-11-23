-- ROOVO: ALL MIGRATIONS IN ONE FILE.
-- Use ONLY on a brand-new, empty Supabase project: paste all of this into SQL Editor and click Run once.
-- If you already ran some of these before, run only the missing ones from supabase/migrations/.


-- ======================= 0001_schema.sql =======================
-- 0001_schema.sql : core schema
create extension if not exists btree_gist;
create extension if not exists pgcrypto;

create type user_role as enum ('customer','provider','admin');
create type verification_status as enum ('draft','submitted','under_review','verified','rejected','suspended');
create type booking_status as enum ('requested','rejected','accepted_awaiting_payment','confirmed','handed_over','completed','cancelled','expired');
create type payment_status as enum ('created','pending','succeeded','failed','cancelled','refund_pending','refunded','partially_refunded');
create type payment_kind as enum ('rental','security_deposit','deposit_refund');
create type sub_status as enum ('trialing','active','past_due','cancelled','expired');
create type ticket_status as enum ('open','in_progress','resolved','closed');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table provider_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  business_name text not null,
  description text,
  address text, city text not null default 'Pune',
  gstin text, contact_phone text, contact_email text,
  status verification_status not null default 'draft',
  admin_notes text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table provider_documents (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_profiles(id) on delete cascade,
  doc_type text not null,            -- e.g. business_registration, pan, rto_permit
  storage_path text not null,        -- private bucket path
  status verification_status not null default 'submitted',
  reviewer_notes text,
  reviewed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table membership_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,         -- basic | professional | premium
  name text not null,
  price_inr_monthly numeric(10,2) not null default 0 check (price_inr_monthly >= 0),
  max_vehicles int not null,
  features jsonb not null default '{}',
  is_active boolean not null default true
);
insert into membership_plans(code,name,price_inr_monthly,max_vehicles,features) values
 ('basic','Basic',0,3,'{"dashboard":false,"analytics":false,"featured":false}'),
 ('professional','Professional',999,25,'{"dashboard":true,"analytics":true,"featured":false,"visibility":"improved"}'),
 ('premium','Premium',1999,100,'{"dashboard":true,"analytics":"advanced","featured":true,"visibility":"priority"}');

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_profiles(id) on delete cascade,
  plan_id uuid not null references membership_plans(id),
  status sub_status not null,
  is_trial boolean not null default false,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  auto_renew_consent boolean not null default false,
  consent_recorded_at timestamptz,
  created_at timestamptz not null default now()
);
create index on subscriptions(provider_id, status);

create table subscription_transactions (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  amount_inr numeric(10,2) not null,
  status payment_status not null default 'created',
  gateway_order_id text, gateway_payment_id text,
  created_at timestamptz not null default now()
);

create table vehicle_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, name text not null,
  compliance_config jsonb not null default '{}',  -- per-category legal requirements
  is_active boolean not null default true, sort_order int default 0
);
insert into vehicle_categories(slug,name,sort_order) values
 ('hatchback','Hatchbacks',1),('sedan','Sedans',2),('suv','SUVs',3),('luxury','Luxury & Premium',4),
 ('electric','Electric Vehicles',5),('bike-scooter','Bikes & Scooters',6),
 ('tempo-traveller','Tempo Travellers & Vans',7),('commercial','Commercial & Goods',8),('other','Other',9);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_profiles(id) on delete cascade,
  category_id uuid not null references vehicle_categories(id),
  title text not null, make text, model text, year int,
  fuel_type text, transmission text, seats int,
  registration_no text,
  price_per_hour numeric(10,2) check (price_per_hour >= 0),
  price_per_day numeric(10,2) not null check (price_per_day >= 0),
  security_deposit numeric(10,2) not null default 0 check (security_deposit >= 0),
  description text,
  status verification_status not null default 'draft',
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);
create index on vehicles(category_id, status);
create index on vehicles(provider_id);

create table vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  storage_path text not null, sort_order int default 0
);
create table vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  doc_type text not null, storage_path text not null,
  status verification_status not null default 'submitted',
  reviewer_notes text, reviewed_by uuid references profiles(id),
  expires_on date, created_at timestamptz not null default now()
);

-- provider-set unavailability (maintenance, offline bookings)
create table vehicle_availability (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  blocked_period tstzrange not null,
  reason text,
  exclude using gist (vehicle_id with =, blocked_period with &&)
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id),
  vehicle_id uuid not null references vehicles(id),
  provider_id uuid not null references provider_profiles(id),
  start_at timestamptz not null, end_at timestamptz not null,
  status booking_status not null default 'requested',
  rental_amount numeric(10,2) not null check (rental_amount >= 0),
  deposit_amount numeric(10,2) not null default 0,
  price_breakdown jsonb not null default '{}',
  customer_notes text,
  payment_due_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_at > start_at),
  period tstzrange generated always as (tstzrange(start_at, end_at, '[)')) stored,
  -- DB-level double-booking guard: no two active confirmed bookings overlap for a vehicle
  constraint no_overlapping_confirmed
    exclude using gist (vehicle_id with =, period with &&)
    where (status in ('confirmed','handed_over'))
);
create index on bookings(customer_id); create index on bookings(provider_id, status);
create index on bookings(vehicle_id, start_at);

create table booking_status_history (
  id bigint generated always as identity primary key,
  booking_id uuid not null references bookings(id) on delete cascade,
  from_status booking_status, to_status booking_status not null,
  changed_by uuid references profiles(id), note text,
  created_at timestamptz not null default now()
);

create table booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  kind payment_kind not null,
  amount_inr numeric(10,2) not null check (amount_inr >= 0),
  status payment_status not null default 'created',
  gateway text not null default 'sandbox',
  gateway_order_id text, gateway_payment_id text unique,
  webhook_event_id text unique,       -- idempotency
  created_at timestamptz not null default now()
);

create table provider_settlements (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_profiles(id),
  booking_payment_id uuid references booking_payments(id),
  gross_inr numeric(10,2) not null, platform_fee_inr numeric(10,2) not null default 0,
  net_inr numeric(10,2) not null, status text not null default 'pending',
  settled_at timestamptz, created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id),
  customer_id uuid not null references profiles(id),
  vehicle_id uuid not null references vehicles(id),
  rating int not null check (rating between 1 and 5), comment text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null, body text, is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  subject text not null, message text not null,
  status ticket_status not null default 'open',
  created_at timestamptz not null default now()
);

create table promotions (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  kind text not null, starts_at timestamptz, ends_at timestamptz,
  is_active boolean not null default true
);

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid, action text not null, entity text, entity_id text,
  details jsonb, created_at timestamptz not null default now()
);

create table platform_settings (key text primary key, value jsonb not null);
insert into platform_settings values
 ('trial_days','30'),('legal_responsibility','{"note":"Configure operator vs platform responsibilities with legal counsel"}');


-- ======================= 0002_rls.sql =======================
-- 0002_rls.sql : helper functions, triggers, RLS, storage
create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from profiles where id = auth.uid() and role='admin') $$;

create or replace function my_provider_id() returns uuid language sql stable security definer set search_path=public as
$$ select id from provider_profiles where user_id = auth.uid() $$;

-- new auth user -> profile (role always customer; provider role granted by registration RPC/admin)
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id, full_name) values (new.id, new.raw_user_meta_data->>'full_name'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- block self role escalation
create or replace function guard_profile_update() returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and not is_admin() and auth.role() <> 'service_role' then
    raise exception 'role change not allowed'; end if;
  return new; end $$;
create trigger trg_guard_profile before update on profiles for each row execute function guard_profile_update();

-- block provider self-approval and vehicle self-verification
create or replace function guard_status_update() returns trigger language plpgsql as $$
begin
  if new.status in ('verified','suspended') and new.status is distinct from old.status
     and not is_admin() and auth.role() <> 'service_role' then
    raise exception 'only admins can verify or suspend'; end if;
  return new; end $$;
create trigger trg_guard_provider before update on provider_profiles for each row execute function guard_status_update();
create trigger trg_guard_vehicle before update on vehicles for each row execute function guard_status_update();

-- availability blocks may not overlap confirmed bookings
create or replace function check_block_vs_bookings() returns trigger language plpgsql as $$
begin
  if exists(select 1 from bookings b where b.vehicle_id=new.vehicle_id and b.status in ('confirmed','handed_over') and b.period && new.blocked_period)
  then raise exception 'overlaps a confirmed booking'; end if; return new; end $$;
create trigger trg_block_check before insert or update on vehicle_availability for each row execute function check_block_vs_bookings();

-- enable RLS everywhere
do $$ declare t text; begin
 for t in select unnest(array['profiles','provider_profiles','provider_documents','membership_plans','subscriptions',
 'subscription_transactions','vehicle_categories','vehicles','vehicle_images','vehicle_documents','vehicle_availability',
 'bookings','booking_status_history','booking_payments','provider_settlements','reviews','notifications',
 'support_tickets','promotions','audit_logs','platform_settings']) loop
  execute format('alter table %I enable row level security', t); end loop; end $$;

-- profiles
create policy p_self_read on profiles for select using (id=auth.uid() or is_admin());
create policy p_self_update on profiles for update using (id=auth.uid() or is_admin());
-- provider_profiles: verified are public; owner and admin full
create policy pp_public on provider_profiles for select using (status='verified' or user_id=auth.uid() or is_admin());
create policy pp_insert on provider_profiles for insert with check (user_id=auth.uid());
create policy pp_update on provider_profiles for update using (user_id=auth.uid() or is_admin());
-- provider docs: owner + admin only
create policy pd_all on provider_documents for all using (provider_id=my_provider_id() or is_admin())
  with check (provider_id=my_provider_id() or is_admin());
-- catalogue (public read, admin write)
create policy mp_read on membership_plans for select using (true);
create policy mp_admin on membership_plans for all using (is_admin()) with check (is_admin());
create policy vc_read on vehicle_categories for select using (true);
create policy vc_admin on vehicle_categories for all using (is_admin()) with check (is_admin());
-- subscriptions: owner read; writes via service role / admin
create policy sub_read on subscriptions for select using (provider_id=my_provider_id() or is_admin());
create policy sub_admin on subscriptions for all using (is_admin()) with check (is_admin());
create policy st_read on subscription_transactions for select using (
  is_admin() or subscription_id in (select id from subscriptions where provider_id=my_provider_id()));
-- vehicles: public sees verified; provider manages own
create policy v_read on vehicles for select using (status='verified' or provider_id=my_provider_id() or is_admin());
create policy v_write on vehicles for all using (provider_id=my_provider_id() or is_admin())
  with check (provider_id=my_provider_id() or is_admin());
create policy vi_read on vehicle_images for select using (
  vehicle_id in (select id from vehicles where status='verified' or provider_id=my_provider_id()) or is_admin());
create policy vi_write on vehicle_images for all using (
  vehicle_id in (select id from vehicles where provider_id=my_provider_id()) or is_admin())
  with check (vehicle_id in (select id from vehicles where provider_id=my_provider_id()) or is_admin());
create policy vd_all on vehicle_documents for all using (
  vehicle_id in (select id from vehicles where provider_id=my_provider_id()) or is_admin())
  with check (vehicle_id in (select id from vehicles where provider_id=my_provider_id()) or is_admin());
create policy va_read on vehicle_availability for select using (true);  -- needed for availability search
create policy va_write on vehicle_availability for all using (
  vehicle_id in (select id from vehicles where provider_id=my_provider_id()) or is_admin())
  with check (vehicle_id in (select id from vehicles where provider_id=my_provider_id()) or is_admin());
-- bookings: customer creates 'requested' only; status transitions go through server routes (service role)
create policy b_read on bookings for select using (customer_id=auth.uid() or provider_id=my_provider_id() or is_admin());
create policy b_insert on bookings for insert with check (customer_id=auth.uid() and status='requested');
create policy bh_read on booking_status_history for select using (
  booking_id in (select id from bookings where customer_id=auth.uid() or provider_id=my_provider_id()) or is_admin());
create policy bp_read on booking_payments for select using (
  booking_id in (select id from bookings where customer_id=auth.uid()) or is_admin());
create policy ps_read on provider_settlements for select using (provider_id=my_provider_id() or is_admin());
-- reviews: public read; only customer of a completed booking can write
create policy r_read on reviews for select using (true);
create policy r_insert on reviews for insert with check (
  customer_id=auth.uid() and exists(select 1 from bookings b where b.id=booking_id and b.customer_id=auth.uid() and b.status='completed'));
create policy n_own on notifications for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy t_own on support_tickets for select using (user_id=auth.uid() or is_admin());
create policy t_insert on support_tickets for insert with check (user_id=auth.uid());
create policy t_admin on support_tickets for update using (is_admin());
create policy promo_read on promotions for select using (true);
create policy promo_admin on promotions for all using (is_admin()) with check (is_admin());
create policy al_admin on audit_logs for select using (is_admin());
create policy ps_settings_admin on platform_settings for all using (is_admin()) with check (is_admin());

-- Storage: private docs bucket (owner folder = provider user id), public vehicle images
insert into storage.buckets(id,name,public) values ('provider-docs','provider-docs',false),('vehicle-images','vehicle-images',true)
 on conflict do nothing;
create policy docs_owner on storage.objects for all using (
  bucket_id='provider-docs' and ((storage.foldername(name))[1]=auth.uid()::text or is_admin()))
  with check (bucket_id='provider-docs' and ((storage.foldername(name))[1]=auth.uid()::text or is_admin()));
create policy img_read on storage.objects for select using (bucket_id='vehicle-images');
create policy img_write on storage.objects for insert with check (
  bucket_id='vehicle-images' and (storage.foldername(name))[1]=auth.uid()::text);


-- ======================= 0003_extras.sql =======================
-- 0003_extras.sql : run AFTER 0001 and 0002
alter table bookings add column if not exists cancel_requested boolean not null default false;
alter table bookings add column if not exists cancel_reason text;
alter table support_tickets add column if not exists admin_reply text;

insert into storage.buckets(id,name,public) values ('vehicle-docs','vehicle-docs',false) on conflict do nothing;
drop policy if exists vdocs_owner on storage.objects;
create policy vdocs_owner on storage.objects for all
  using (bucket_id='vehicle-docs' and ((storage.foldername(name))[1]=auth.uid()::text or is_admin()))
  with check (bucket_id='vehicle-docs' and ((storage.foldername(name))[1]=auth.uid()::text or is_admin()));
drop policy if exists img_delete on storage.objects;
create policy img_delete on storage.objects for delete
  using (bucket_id='vehicle-images' and (storage.foldername(name))[1]=auth.uid()::text);

create index if not exists idx_bookings_cancel on bookings(cancel_requested) where cancel_requested;
create index if not exists idx_payments_status on booking_payments(status);
create index if not exists idx_notifications_user on notifications(user_id, is_read);


-- ======================= 0004_launch.sql =======================
-- 0004_launch.sql : safe to run more than once
alter table profiles add column if not exists is_blocked boolean not null default false;

-- blocked customers cannot create bookings (also enforced in code)
drop policy if exists b_insert on bookings;
create policy b_insert on bookings for insert
  with check (customer_id = auth.uid() and status = 'requested'
              and not exists (select 1 from profiles where id = auth.uid() and is_blocked));

-- database-backed rate limiter (works on serverless; only the server can call it)
create table if not exists rate_limits (key text not null, hit_at timestamptz not null default now());
create index if not exists idx_rate_limits on rate_limits(key, hit_at);
alter table rate_limits enable row level security;  -- no policies: browsers cannot touch it

create or replace function rate_limit_hit(p_key text, p_max int, p_window int) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if random() < 0.02 then delete from rate_limits where hit_at < now() - interval '1 day'; end if;
  select count(*) into n from rate_limits where key = p_key and hit_at > now() - make_interval(secs => p_window);
  if n >= p_max then return false; end if;
  insert into rate_limits(key) values (p_key);
  return true;
end $$;
revoke all on function rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function rate_limit_hit(text, int, int) to service_role;


-- ======================= 0005_provider_payments.sql =======================
-- 0005_provider_payments.sql : safe to run more than once
alter table provider_profiles add column if not exists plan_rank int not null default 0;   -- 0 Basic, 1 Professional, 2 Premium (used for search ranking)
alter table subscriptions add column if not exists reminder_sent_at timestamptz;
alter table bookings add column if not exists customer_phone text;
create unique index if not exists ux_subtx_order on subscription_transactions(gateway_order_id) where gateway_order_id is not null;

update provider_profiles p set plan_rank = coalesce((
  select case m.code when 'premium' then 2 when 'professional' then 1 else 0 end
  from subscriptions s join membership_plans m on m.id = s.plan_id
  where s.provider_id = p.id and s.status in ('trialing','active') order by s.created_at desc limit 1), 0);


-- ======================= 0006_terms_acceptance.sql =======================
-- 0006_terms_acceptance.sql : safe to run more than once
alter table profiles add column if not exists terms_accepted_at timestamptz;
alter table profiles add column if not exists terms_version text;
alter table provider_profiles add column if not exists provider_terms_accepted_at timestamptz;
alter table provider_profiles add column if not exists provider_terms_version text;

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name, terms_accepted_at, terms_version)
  values (new.id, new.raw_user_meta_data->>'full_name',
          nullif(new.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz,
          new.raw_user_meta_data->>'terms_version');
  return new;
end $$;


-- ======================= 0007_security_hardening.sql =======================
-- 0007_security_hardening.sql : safe to run more than once.
-- Closes gaps where a logged-in user could call the database API directly (bypassing our website) and
-- insert or change protected fields: verification status, featured flag, plan rank, document review, etc.

create or replace function is_privileged() returns boolean language sql stable as $$
  select current_user in ('postgres', 'supabase_admin', 'service_role') or coalesce(auth.role(), '') = 'service_role' or is_admin()
$$;

-- customers cannot unblock themselves or change their role
create or replace function guard_profile_update() returns trigger language plpgsql as $$
begin
  if (new.role is distinct from old.role or new.is_blocked is distinct from old.is_blocked) and not is_privileged() then
    raise exception 'not allowed';
  end if;
  return new;
end $$;

-- providers: new rows always start as "submitted"; plan rank / approval fields are admin-only
create or replace function guard_provider_write() returns trigger language plpgsql as $$
begin
  if is_privileged() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'submitted'; new.plan_rank := 0; new.approved_at := null; new.admin_notes := null;
  elsif new.plan_rank is distinct from old.plan_rank or new.approved_at is distinct from old.approved_at or new.admin_notes is distinct from old.admin_notes then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_provider_write on provider_profiles;
create trigger trg_guard_provider_write before insert or update on provider_profiles for each row execute function guard_provider_write();

-- vehicles: new rows always start as "submitted" and not featured; featured flag is admin-only
create or replace function guard_vehicle_write() returns trigger language plpgsql as $$
begin
  if is_privileged() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'submitted'; new.is_featured := false;
  elsif new.is_featured is distinct from old.is_featured then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_vehicle_write on vehicles;
create trigger trg_guard_vehicle_write before insert or update on vehicles for each row execute function guard_vehicle_write();

-- documents: only admins can set review status, reviewer or notes
create or replace function guard_doc_write() returns trigger language plpgsql as $$
begin
  if is_privileged() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'submitted'; new.reviewed_by := null; new.reviewer_notes := null;
  elsif new.status is distinct from old.status or new.reviewed_by is distinct from old.reviewed_by or new.reviewer_notes is distinct from old.reviewer_notes then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_provider_docs on provider_documents;
create trigger trg_guard_provider_docs before insert or update on provider_documents for each row execute function guard_doc_write();
drop trigger if exists trg_guard_vehicle_docs on vehicle_documents;
create trigger trg_guard_vehicle_docs before insert or update on vehicle_documents for each row execute function guard_doc_write();

-- bookings: the provider is always the vehicle's owner, the vehicle must be live, and new bookings start as "requested"
create or replace function guard_booking_insert() returns trigger language plpgsql as $$
declare v_provider uuid; v_status verification_status;
begin
  if is_privileged() then return new; end if;
  select provider_id, status into v_provider, v_status from vehicles where id = new.vehicle_id;
  if v_provider is null or v_status <> 'verified' then raise exception 'vehicle not available'; end if;
  new.provider_id := v_provider; new.status := 'requested'; new.cancel_requested := false;
  return new;
end $$;
drop trigger if exists trg_guard_booking_insert on bookings;
create trigger trg_guard_booking_insert before insert on bookings for each row execute function guard_booking_insert();

-- reviews: the vehicle always comes from the booking being reviewed
create or replace function guard_review_insert() returns trigger language plpgsql as $$
begin
  if is_privileged() then return new; end if;
  select vehicle_id into new.vehicle_id from bookings where id = new.booking_id;
  new.customer_id := auth.uid();
  return new;
end $$;
drop trigger if exists trg_guard_review_insert on reviews;
create trigger trg_guard_review_insert before insert on reviews for each row execute function guard_review_insert();

-- uploads: size and file-type limits enforced by storage itself
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'vehicle-images';
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'] where id in ('provider-docs', 'vehicle-docs');

