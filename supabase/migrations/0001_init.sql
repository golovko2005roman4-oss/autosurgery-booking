-- ============================================================================
-- AutoSurgery Booking — миграция 0001
-- Схема по docs/requirements.md (раздел 8): таблицы, индексы, защита от
-- двойного бронирования, RLS, RPC-функции.
--
-- ⚠️ Все данные — DEMO DATA, не REAL BUSINESS DATA.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Таблицы ────────────────────────────────────────────────────────────────

create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  title       text not null unique,
  price_from  integer,                       -- NULL = цена не указана (не показываем)
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,                  -- нормализованный +7XXXXXXXXXX
  created_at  timestamptz not null default now()
);

create table if not exists public.vehicles (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id) on delete cascade,
  brand          text not null,
  model          text not null,
  year           integer,
  license_plate  text
);

create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  vehicle_id    uuid not null references public.vehicles(id) on delete cascade,
  service_id    uuid not null references public.services(id),
  booking_date  date not null,
  booking_time  time not null,
  status        text not null default 'new'
                check (status in ('new', 'confirmed', 'cancelled', 'completed')),
  comment       text check (comment is null or char_length(comment) <= 500),
  cancel_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.settings (
  key    text primary key,
  value  jsonb not null
);

-- ── Индексы ────────────────────────────────────────────────────────────────

create index if not exists bookings_date_time_idx on public.bookings (booking_date, booking_time);
create index if not exists bookings_status_idx    on public.bookings (status);
create index if not exists bookings_created_idx   on public.bookings (created_at desc);
create index if not exists vehicles_client_idx    on public.vehicles (client_id);

-- Защита от двойного бронирования (docs/requirements.md, 8.5):
-- не более одной подтверждённой заявки на слот.
create unique index if not exists bookings_one_confirmed_per_slot
  on public.bookings (booking_date, booking_time)
  where status = 'confirmed';

-- ── updated_at ─────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Принцип (docs/requirements.md, раздел 10):
--   * anon: видит только активные услуги и демо-расписание; создаёт заявки
--     и читает слоты/публичную сводку ТОЛЬКО через RPC (security definer);
--     прямого доступа к clients/vehicles/bookings нет;
--   * authenticated (администратор): читает таблицы; изменения — через RPC,
--     чтобы переходы статусов не обходились прямыми UPDATE.

alter table public.services enable row level security;
alter table public.clients  enable row level security;
alter table public.vehicles enable row level security;
alter table public.bookings enable row level security;
alter table public.settings enable row level security;

create policy "anon sees active services"
  on public.services for select to anon using (is_active = true);

create policy "admin sees all services"
  on public.services for select to authenticated using (true);

create policy "admin reads clients"
  on public.clients for select to authenticated using (true);

create policy "admin reads vehicles"
  on public.vehicles for select to authenticated using (true);

create policy "admin reads bookings"
  on public.bookings for select to authenticated using (true);

create policy "anon reads demo schedule settings"
  on public.settings for select to anon using (key = 'demo_schedule');

create policy "admin reads settings"
  on public.settings for select to authenticated using (true);

-- ── RPC: публичные (anon) ──────────────────────────────────────────────────

-- Создание заявки: валидация услуги/даты/времени, клиент по телефону,
-- авто, booking со статусом 'new'. Слот при статусе new НЕ блокируется.
create or replace function public.create_booking(
  p_name           text,
  p_phone          text,
  p_brand          text,
  p_model          text,
  p_year           integer,
  p_license_plate  text,
  p_service_id     uuid,
  p_booking_date   date,
  p_booking_time   time,
  p_comment        text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id  uuid;
  v_vehicle_id uuid;
  v_booking_id uuid;
  v_schedule   jsonb;
  v_days       int;
  v_slots      text[];
begin
  -- услуга существует и активна
  perform 1 from public.services
   where id = p_service_id and is_active = true;
  if not found then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  -- демо-расписание (настройки или значения по умолчанию ТЗ 5.3)
  select value into v_schedule from public.settings where key = 'demo_schedule';
  v_days  := coalesce((v_schedule ->> 'demo_days')::int, 14);
  v_slots := coalesce(
    (select array(select jsonb_array_elements_text(v_schedule -> 'slots'))),
    array['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00']
  );

  -- дата внутри демо-периода, не в прошлом
  if p_booking_date < current_date
     or p_booking_date >= current_date + v_days then
    raise exception 'DATE_OUT_OF_DEMO_PERIOD';
  end if;

  -- время входит в демо-расписание
  if not (to_char(p_booking_time, 'HH24:MI') = any (v_slots)) then
    raise exception 'TIME_OUT_OF_DEMO_SLOTS';
  end if;

  -- клиент: ищем по телефону, иначе создаём
  select id into v_client_id from public.clients where phone = p_phone;
  if v_client_id is null then
    insert into public.clients (name, phone) values (p_name, p_phone)
    returning id into v_client_id;
  else
    update public.clients set name = p_name where id = v_client_id;
  end if;

  insert into public.vehicles (client_id, brand, model, year, license_plate)
  values (v_client_id, p_brand, p_model, p_year, p_license_plate)
  returning id into v_vehicle_id;

  insert into public.bookings
    (client_id, vehicle_id, service_id, booking_date, booking_time, status, comment)
  values
    (v_client_id, v_vehicle_id, p_service_id, p_booking_date, p_booking_time, 'new', p_comment)
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

-- Занятые (подтверждённые) слоты на дату — для сетки времени клиентской формы.
create or replace function public.get_booked_slots(p_date date)
returns table (slot_time time)
language sql
security definer
set search_path = ''
as $$
  select booking_time from public.bookings
   where booking_date = p_date and status = 'confirmed';
$$;

-- Публичная сводка заявки для экрана подтверждения (без персональных данных
-- лишних и без служебных полей).
create or replace function public.get_booking_public(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id',           b.id,
    'status',       b.status,
    'booking_date', b.booking_date,
    'booking_time', to_char(b.booking_time, 'HH24:MI'),
    'service_title', s.title,
    'brand',        v.brand,
    'model',        v.model
  ) into v_result
  from public.bookings b
  join public.services s on s.id = b.service_id
  join public.vehicles v on v.id = b.vehicle_id
  where b.id = p_id;

  if v_result is null then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  return v_result;
end;
$$;

-- ── RPC: административные (authenticated) ──────────────────────────────────

-- Подтверждение: new → confirmed. Слот фиксируется уникальным индексом.
create or replace function public.confirm_booking(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bookings
     set status = 'confirmed'
   where id = p_id and status = 'new';

  if not found then
    raise exception 'INVALID_TRANSITION';
  end if;
exception
  when unique_violation then
    raise exception 'SLOT_TAKEN';
end;
$$;

-- Перенос: confirmed → confirmed, атомарная смена слота.
-- Старый слот освобождается, новый блокируется; занятый новый слот запрещает перенос.
create or replace function public.reschedule_booking(
  p_id          uuid,
  p_new_date    date,
  p_new_time    time
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_schedule jsonb;
  v_days     int;
  v_slots    text[];
begin
  select value into v_schedule from public.settings where key = 'demo_schedule';
  v_days  := coalesce((v_schedule ->> 'demo_days')::int, 14);
  v_slots := coalesce(
    (select array(select jsonb_array_elements_text(v_schedule -> 'slots'))),
    array['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00']
  );

  if p_new_date < current_date
     or p_new_date >= current_date + v_days then
    raise exception 'DATE_OUT_OF_DEMO_PERIOD';
  end if;

  if not (to_char(p_new_time, 'HH24:MI') = any (v_slots)) then
    raise exception 'TIME_OUT_OF_DEMO_SLOTS';
  end if;

  update public.bookings
     set booking_date = p_new_date,
         booking_time = p_new_time
   where id = p_id and status = 'confirmed';

  if not found then
    raise exception 'INVALID_TRANSITION';
  end if;
exception
  when unique_violation then
    raise exception 'SLOT_TAKEN';
end;
$$;

-- Отклонение: new/confirmed → cancelled, причина обязательна.
create or replace function public.cancel_booking(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'REASON_REQUIRED';
  end if;

  update public.bookings
     set status = 'cancelled',
         cancel_reason = btrim(p_reason)
   where id = p_id and status in ('new', 'confirmed');

  if not found then
    raise exception 'INVALID_TRANSITION';
  end if;
end;
$$;

-- Завершение: confirmed → completed.
create or replace function public.complete_booking(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bookings
     set status = 'completed'
   where id = p_id and status = 'confirmed';

  if not found then
    raise exception 'INVALID_TRANSITION';
  end if;
end;
$$;

-- Свободные слоты на дату (для модального окна переноса):
-- занято = есть подтверждённая заявка на слот, кроме самой переносимой.
create or replace function public.get_free_slots(
  p_date               date,
  p_exclude_booking_id uuid default null
)
returns table (slot text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_schedule jsonb;
  v_slots    text[];
begin
  select value into v_schedule from public.settings where key = 'demo_schedule';
  v_slots := coalesce(
    (select array(select jsonb_array_elements_text(v_schedule -> 'slots'))),
    array['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00']
  );

  return query
    select s.slot
      from unnest(v_slots) as s(slot)
     where not exists (
       select 1 from public.bookings b
        where b.booking_date = p_date
          and to_char(b.booking_time, 'HH24:MI') = s.slot
          and b.status = 'confirmed'
          and b.id <> coalesce(p_exclude_booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
     );
end;
$$;

-- ── Права ──────────────────────────────────────────────────────────────────
-- Никаких прямых записи в таблицы для anon; сервисный ключ приложению
-- НЕ НУЖЕН — всё идёт через RPC + RLS.
-- Чтение: anon — только услуги (RLS ограничивает активными) и демо-расписание;
-- authenticated (администратор) — все таблицы на чтение.
grant select on public.services to anon, authenticated;
grant select on public.settings to anon, authenticated;
grant select on public.clients, public.vehicles, public.bookings,
  public.settings to authenticated;

revoke all on public.services, public.clients, public.vehicles,
  public.bookings, public.settings from public, anon;

grant execute on function public.create_booking(text, text, text, text, integer, text, uuid, date, time, text) to anon, authenticated;
grant execute on function public.get_booked_slots(date) to anon, authenticated;
grant execute on function public.get_booking_public(uuid) to anon, authenticated;
grant execute on function public.get_free_slots(date, uuid) to authenticated;

grant execute on function public.confirm_booking(uuid) to authenticated;
grant execute on function public.reschedule_booking(uuid, date, time) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.complete_booking(uuid) to authenticated;
