-- 022_tardanzas.sql
-- Alertas de tardanza: avisar a la team leader cuando un chatter no ficha a tiempo.

-- Equipo de la team leader (para dirigir la alerta a la TL de ese equipo).
-- Si queda en null, la alerta va a todas las team leaders.
alter table public.profiles
  add column if not exists equipo smallint;

-- Registro de alertas ya enviadas, para no repetir el mismo aviso varias veces al día.
create table if not exists public.alertas_tardanza (
  chatter_id  uuid not null references public.chatters(id) on delete cascade,
  fecha       date not null,          -- fecha (hora Colombia) del turno
  turno       text,
  created_at  timestamptz not null default now(),
  primary key (chatter_id, fecha)
);
