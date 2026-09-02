-- 021_horarios.sql
-- Horarios de trabajo (turno fijo + equipo + días de descanso) para chatters y VAs.
-- Se guarda por profile_id, así cubre cualquier persona con login (chatter o VA).

create table if not exists public.horarios (
  profile_id     uuid primary key references public.profiles(id) on delete cascade,
  turno          text check (turno in ('mañana', 'tarde', 'noche')),
  equipo         smallint check (equipo between 1 and 4),
  dias_descanso  smallint[] not null default '{}',  -- 0=Domingo .. 6=Sábado (convención getDay de JS)
  updated_at     timestamptz not null default now()
);

alter table public.horarios enable row level security;

-- El staff gestiona; cada persona puede ver el suyo.
drop policy if exists horarios_select on public.horarios;
create policy horarios_select on public.horarios
  for select using (
    public.get_my_role() in ('admin', 'manager', 'team_leader')
    or profile_id = auth.uid()
  );

drop policy if exists horarios_write on public.horarios;
create policy horarios_write on public.horarios
  for all using (
    public.get_my_role() in ('admin', 'manager', 'team_leader')
  ) with check (
    public.get_my_role() in ('admin', 'manager', 'team_leader')
  );
