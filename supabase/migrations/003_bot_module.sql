-- ============================================================
-- Módulo 1 — Bot de Contenido Centralizado
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

-- Modelos registradas en la automatización del bot
create table public.bot_models (
  id                uuid primary key default gen_random_uuid(),
  model_name        text not null,
  instagram_handle  text not null,          -- sin @
  notion_page_url   text,                   -- URL de la página Notion donde van las captions
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.bot_models enable row level security;

-- Service role bypassa RLS; las mutaciones van por server actions
create policy "bot_models_select_all"
  on public.bot_models for select
  using (true);

create trigger bot_models_updated_at
  before update on public.bot_models
  for each row execute procedure public.set_updated_at();

-- Log de ejecuciones del bot
create table public.bot_executions (
  id                uuid primary key default gen_random_uuid(),
  bot_model_id      uuid references public.bot_models(id) on delete set null,
  model_name        text not null,
  instagram_handle  text not null,
  status            text not null default 'pending'
                      check (status in ('pending', 'running', 'success', 'error')),
  reels_found       integer,
  notes             text,
  triggered_by      uuid references public.profiles(id) on delete set null,
  triggered_at      timestamptz not null default now(),
  completed_at      timestamptz
);

alter table public.bot_executions enable row level security;

create policy "bot_executions_select_all"
  on public.bot_executions for select
  using (true);

-- Índice para el log ordenado por fecha
create index bot_executions_triggered_at_idx on public.bot_executions(triggered_at desc);
