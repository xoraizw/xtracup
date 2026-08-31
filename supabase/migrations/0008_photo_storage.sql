-- Public storage bucket for cafe cover photos, branch photos, and menu
-- images. Public read (customers browse Explore without auth friction on
-- images), write restricted to staff of the brand the file's path claims to
-- belong to, or the platform owner. Path convention enforced by the
-- policies below: "<cafe_id>/cover.jpg", "<cafe_id>/branch/<branch_id>.jpg",
-- "<cafe_id>/menu/<uuid>.jpg" — the first path segment must be the cafe_id,
-- checked against the uploader's own brand via current_user_cafe_id().

insert into storage.buckets (id, name, public)
values ('cafe-photos', 'cafe-photos', true)
on conflict (id) do nothing;

create policy "cafe photos are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'cafe-photos');

create policy "staff upload own brand cafe photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'cafe-photos'
    and current_user_role() = 'staff'
    and (storage.foldername(name))[1] = current_user_cafe_id()::text
  );

create policy "staff update own brand cafe photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'cafe-photos'
    and current_user_role() = 'staff'
    and (storage.foldername(name))[1] = current_user_cafe_id()::text
  );

create policy "staff delete own brand cafe photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'cafe-photos'
    and current_user_role() = 'staff'
    and (storage.foldername(name))[1] = current_user_cafe_id()::text
  );

create policy "owner manage any cafe photos"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'cafe-photos' and current_user_is_owner())
  with check (bucket_id = 'cafe-photos' and current_user_is_owner());
