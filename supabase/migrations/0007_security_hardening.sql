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
