-- ============================================================
-- NORTE · schema inicial (v1 core + ganchos para v2)
-- Roda no Supabase (SQL Editor ou `supabase db push`)
-- ============================================================

create extension if not exists "btree_gist";
create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type sphere        as enum ('profissional','pessoal');
create type task_status   as enum ('a_fazer','em_andamento','aguardando','finalizado');
create type priority      as enum ('baixa','media','alta');        -- o Farol
create type event_source  as enum ('norte','google','outlook','apple');

-- ---------- profiles (1:1 com auth.users) ----------
create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  name                text,
  chronotype_start    time,                 -- pico de energia (do onboarding)
  chronotype_end      time,
  north               text,                 -- direção da temporada
  wake_time           time default '07:00',
  sleep_time          time default '23:00',
  subscription_status text default 'trialing',  -- trialing|active|past_due|canceled
  trial_ends_at       timestamptz default (now() + interval '14 days'),
  created_at          timestamptz default now()
);

-- ---------- calendar_accounts (v2: sync incremental por provedor) ----------
create table calendar_accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  provider       event_source not null,
  sphere         sphere not null,            -- mapeamento calendário -> esfera
  external_email text,
  sync_token     text,                       -- Google syncToken / Graph deltaLink
  created_at     timestamptz default now()
);

-- ---------- events (modelo normalizado: uma linha do tempo) ----------
create table events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  source     event_source not null default 'norte',
  source_id  text,                           -- id no provedor (para dedupe/upsert)
  ical_uid   text,                           -- UID cross-sistema p/ deduplicação
  sphere     sphere not null,
  title      text not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  all_day    boolean default false,
  is_fixed   boolean not null default true,  -- << A DISTINÇÃO-CHAVE: fixo vs flexível
  status     text default 'confirmed',
  rrule      text,                           -- recorrência (RFC 5545), expandir sob demanda
  during     tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  created_at timestamptz default now()
);
-- índice GiST: detecção de conflito e cálculo de janela viram query nativa
create index events_user_during_idx on events using gist (user_id, during);
create unique index events_source_uq on events(user_id, source, source_id) where source_id is not null;

-- ---------- tasks ----------
create table tasks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  sphere             sphere not null default 'profissional',
  title              text not null,
  emoji              text,
  category           text,                    -- cliente/categoria
  status             task_status default 'a_fazer',
  priority           priority default 'media',-- o Farol
  due_at             timestamptz,
  estimated_minutes  int,                     -- alimenta a Previsão de Entrega
  snapshot           text,                    -- "Onde parei?"
  scheduled_event_id uuid references events(id) on delete set null,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
create index tasks_user_status_idx on tasks(user_id, status);

-- ---------- subtasks (Hierarquia de Cascata) ----------
create table subtasks (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  title      text not null,
  position   int not null default 0,
  done       boolean default false,
  depends_on uuid references subtasks(id) on delete set null,  -- dependência da cascata
  created_at timestamptz default now()
);
create index subtasks_task_idx on subtasks(task_id);

-- ---------- task_alerts (Alertas Personalizados) ----------
create table task_alerts (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references tasks(id) on delete cascade,
  offset_before interval,                     -- '7 days','1 day','3 hours'
  custom_at     timestamptz
);

-- ---------- focus_sessions (alimenta a Carga Cognitiva) ----------
create table focus_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  task_id         uuid references tasks(id) on delete set null,
  subtask_id      uuid references subtasks(id) on delete set null,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  planned_minutes int
);

-- ---------- load_snapshots (v2: Índice de Carga Cognitiva) ----------
create table load_snapshots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  reserva    int,                             -- 0-100
  inputs     jsonb,                           -- transparência: o que drenou
  created_at timestamptz default now(),
  unique(user_id, day)
);

-- ============================================================
-- MOTOR DETERMINÍSTICO (parte em SQL nativo)
-- Conflitos duros = sobreposição de eventos fixos (o card magenta).
-- ============================================================
create or replace function conflicts_for_day(p_user uuid, p_day date)
returns table (
  a_id uuid, b_id uuid,
  a_title text, b_title text,
  a_sphere sphere, b_sphere sphere,
  cross_sphere boolean
) language sql stable as $$
  select e1.id, e2.id, e1.title, e2.title, e1.sphere, e2.sphere,
         (e1.sphere <> e2.sphere) as cross_sphere
  from events e1
  join events e2
    on  e1.user_id = e2.user_id
    and e1.id < e2.id
    and e1.during && e2.during          -- operador de sobreposição (usa o índice GiST)
    and e1.is_fixed and e2.is_fixed
  where e1.user_id = p_user
    and e1.during && tstzrange(p_day::timestamptz, (p_day + 1)::timestamptz, '[)')
  order by e1.starts_at;
$$;

-- ============================================================
-- ROW LEVEL SECURITY — cada usuário só enxerga o que é seu
-- ============================================================
alter table profiles          enable row level security;
alter table calendar_accounts enable row level security;
alter table events            enable row level security;
alter table tasks             enable row level security;
alter table subtasks          enable row level security;
alter table task_alerts       enable row level security;
alter table focus_sessions    enable row level security;
alter table load_snapshots    enable row level security;

-- tabelas com user_id direto
create policy own_profile   on profiles          for all using (id = auth.uid())      with check (id = auth.uid());
create policy own_calacc    on calendar_accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_events    on events            for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_tasks     on tasks             for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_focus     on focus_sessions    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_load      on load_snapshots    for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- tabelas filhas: dono via task
create policy own_subtasks  on subtasks    for all
  using     (exists (select 1 from tasks t where t.id = subtasks.task_id  and t.user_id = auth.uid()))
  with check(exists (select 1 from tasks t where t.id = subtasks.task_id  and t.user_id = auth.uid()));
create policy own_alerts    on task_alerts for all
  using     (exists (select 1 from tasks t where t.id = task_alerts.task_id and t.user_id = auth.uid()))
  with check(exists (select 1 from tasks t where t.id = task_alerts.task_id and t.user_id = auth.uid()));

-- ============================================================
-- Cria profile automaticamente quando um usuário se cadastra
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
