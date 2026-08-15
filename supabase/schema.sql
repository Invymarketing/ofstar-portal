-- ============================================================
-- OF Star Management Portal — Schema Supabase
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

-- Tipo enum para roles
create type public.user_role as enum (
  'admin',
  'manager',
  'team_leader',
  'chatter',
  'va',
  'modelo'
);

-- ============================================================
-- TABLA: profiles
-- Vinculada a auth.users con delete cascade
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        public.user_role not null default 'chatter',
  model_name  text,          -- solo si role = 'modelo'
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS habilitado
alter table public.profiles enable row level security;

-- Cada usuario ve y edita su propio perfil
create policy "Perfil propio — lectura"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Perfil propio — actualización"
  on public.profiles for update
  using (auth.uid() = id);

-- Admin ve todos los perfiles
create policy "Admin — lectura total"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admin puede crear, actualizar y eliminar perfiles
create policy "Admin — escritura total"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Manager ve todos los perfiles (sin acceso a datos financieros sensibles)
create policy "Manager — lectura total"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'manager'
    )
  );

-- ============================================================
-- TRIGGER: crear perfil al registrar usuario en auth
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'chatter')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger para actualizar updated_at automáticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- FUNCIÓN: obtener rol del usuario actual (útil en RLS)
-- ============================================================
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role::text from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- TABLA: notifications (Módulo 8 — Fase 7, estructura base)
-- ============================================================
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  title       text not null,
  body        text,
  module_id   integer,           -- qué módulo generó la alerta
  link        text,              -- ruta a la que lleva al hacer click
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Notificaciones propias"
  on public.notifications for all
  using (auth.uid() = user_id);

-- ============================================================
-- INSTRUCCIONES PARA CREAR EL PRIMER ADMIN
-- ============================================================
-- 1. Crea el usuario en Supabase Dashboard → Authentication → Users
--    con email y contraseña
-- 2. Después ejecuta esto (reemplaza el email):
--
-- update public.profiles
-- set role = 'admin', full_name = 'Aleix'
-- where id = (select id from auth.users where email = 'tu@email.com');
--
-- ============================================================
