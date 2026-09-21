insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('candidatos-fotos','candidatos-fotos',true,3145728,array['image/jpeg','image/png','image/webp']),
 ('candidatos-simbolos','candidatos-simbolos',true,3145728,array['image/jpeg','image/png','image/webp']),
 ('branding','branding',true,3145728,array['image/jpeg','image/png','image/webp']);
create policy rural_asset_insert on storage.objects for insert to authenticated with check(
 (bucket_id in ('candidatos-fotos','candidatos-simbolos') and (select private.role()) in ('SUPER_ADMIN','ADMIN')) or (bucket_id='branding' and (select private.role())='SUPER_ADMIN'));
create policy rural_asset_update on storage.objects for update to authenticated using(
 (bucket_id in ('candidatos-fotos','candidatos-simbolos') and (select private.role()) in ('SUPER_ADMIN','ADMIN')) or (bucket_id='branding' and (select private.role())='SUPER_ADMIN')) with check(
 (bucket_id in ('candidatos-fotos','candidatos-simbolos') and (select private.role()) in ('SUPER_ADMIN','ADMIN')) or (bucket_id='branding' and (select private.role())='SUPER_ADMIN'));
create policy rural_asset_admin_read on storage.objects for select to authenticated using(bucket_id in ('candidatos-fotos','candidatos-simbolos','branding') and (select private.role()) in ('SUPER_ADMIN','ADMIN'));
-- No delete policy: asset replacement creates a new object; existing references remain valid.
