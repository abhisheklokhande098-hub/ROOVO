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
