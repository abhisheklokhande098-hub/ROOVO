-- 0005_provider_payments.sql : safe to run more than once
alter table provider_profiles add column if not exists plan_rank int not null default 0;   -- 0 Basic, 1 Professional, 2 Premium (used for search ranking)
alter table subscriptions add column if not exists reminder_sent_at timestamptz;
alter table bookings add column if not exists customer_phone text;
create unique index if not exists ux_subtx_order on subscription_transactions(gateway_order_id) where gateway_order_id is not null;

update provider_profiles p set plan_rank = coalesce((
  select case m.code when 'premium' then 2 when 'professional' then 1 else 0 end
  from subscriptions s join membership_plans m on m.id = s.plan_id
  where s.provider_id = p.id and s.status in ('trialing','active') order by s.created_at desc limit 1), 0);
