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
