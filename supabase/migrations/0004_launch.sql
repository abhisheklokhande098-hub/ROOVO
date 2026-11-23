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
