-- Create public bucket for product images and admin-only write access
-- Run this in the Supabase SQL editor once.

-- 1) Create bucket if it doesn't exist (portable approach)
insert into storage.buckets (id, name, public)
select 'products', 'products', true
where not exists (select 1 from storage.buckets where id = 'products');

-- 2) RLS is enabled by default on storage.objects in Supabase; do not attempt to ALTER TABLE here
--    (can fail with "must be owner of table objects").

-- 3) Policies for bucket "products"
-- Everyone can read public files
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read product images'
  ) then
    create policy "Public read product images"
      on storage.objects for select
      to public
      using (bucket_id = 'products');
  end if;
end $$;

-- Only admins can insert/update/delete objects in this bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins write product images'
  ) then
    create policy "Admins write product images"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'products' and exists(
          select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins update product images'
  ) then
    create policy "Admins update product images"
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'products' and exists(
          select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
        )
      )
      with check (
        bucket_id = 'products' and exists(
          select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins delete product images'
  ) then
    create policy "Admins delete product images"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'products' and exists(
          select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
        )
      );
  end if;
end $$;
