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
