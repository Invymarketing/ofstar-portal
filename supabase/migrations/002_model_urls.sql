-- Añadir URLs configurables por modelo
-- Ejecutar en Supabase Dashboard → SQL Editor

alter table public.profiles
  add column if not exists content_snare_url text,
  add column if not exists notion_url text;

-- Política para que managers y admins puedan editar URLs de modelos
create policy "Managers pueden editar perfiles de modelos"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );
