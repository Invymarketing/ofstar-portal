create table if not exists public.audiencia_semanal (
  id             uuid primary key default gen_random_uuid(),
  cuenta_id      uuid not null references public.cuentas_analytics(id) on delete cascade,
  semana_inicio  date not null,
  registrado_por uuid references public.profiles(id),
  paises         jsonb not null default '[]'::jsonb,
  genero_mujeres numeric,
  genero_hombres numeric,
  edades         jsonb not null default '{}'::jsonb,
  alcance        integer,
  impresiones    integer,
  visitas_perfil integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (cuenta_id, semana_inicio)
);
create index if not exists idx_audiencia_cuenta on public.audiencia_semanal(cuenta_id);
create index if not exists idx_audiencia_semana on public.audiencia_semanal(semana_inicio);
