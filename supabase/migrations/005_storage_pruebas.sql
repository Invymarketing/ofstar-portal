-- ============================================================
-- Storage: bucket para las capturas de prueba de errores
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

-- Bucket público (lectura pública; subida controlada por policy)
insert into storage.buckets (id, name, public)
values ('pruebas', 'pruebas', true)
on conflict (id) do nothing;

-- Permitir que usuarios autenticados (staff logueado) suban al bucket 'pruebas'
drop policy if exists "pruebas_insert_auth" on storage.objects;
create policy "pruebas_insert_auth"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pruebas');

-- Lectura: el bucket es público, así que las imágenes se ven por su URL pública.
-- (Opcional) permitir listar/leer explícitamente:
drop policy if exists "pruebas_read_all" on storage.objects;
create policy "pruebas_read_all"
  on storage.objects for select
  using (bucket_id = 'pruebas');
