create table if not exists public.modelo_tareas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  fecha date not null,
  titulo text not null,
  completada boolean not null default false,
  completada_at timestamptz,
  orden integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_modelo_tareas_pf on public.modelo_tareas(profile_id, fecha);
