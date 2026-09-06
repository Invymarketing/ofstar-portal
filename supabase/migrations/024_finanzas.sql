create table if not exists public.finanzas_modelo (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references public.modelos(id) on delete cascade,
  mes text not null,
  suscripciones numeric not null default 0,
  pagos numeric not null default 0,
  propinas numeric not null default 0,
  pagos_externos numeric not null default 0,
  comision_pct numeric not null default 0,
  incluye_subs boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (modelo_id, mes)
);
create table if not exists public.finanzas_gastos (
  id uuid primary key default gen_random_uuid(),
  ambito text not null,
  modelo_id uuid references public.modelos(id) on delete cascade,
  mes text not null,
  concepto text not null,
  monto numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_fin_gastos_mes on public.finanzas_gastos(mes);
create index if not exists idx_fin_modelo_mes on public.finanzas_modelo(mes);
