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
