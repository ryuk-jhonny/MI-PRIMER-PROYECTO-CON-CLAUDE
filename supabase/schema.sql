-- =====================================================================
-- Sistema Institucional Ryuk · Esquema de base de datos (Supabase)
-- Pegar completo en Supabase > SQL Editor > New query > Run.
-- Es seguro ejecutarlo más de una vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  config jsonb not null default '{}'::jsonb,
  director_profile jsonb not null default '{}'::jsonb,
  teacher_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  staff_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('director', 'docente', 'auxiliar')),
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  primary key (institution_id, user_id)
);

create table if not exists public.students (
  id text primary key,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  qr_token text not null unique,
  data jsonb not null,
  present_days int not null default 0,
  late_days int not null default 0,
  absent_days int not null default 0,
  justified_days int not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists students_institution_idx on public.students(institution_id);

create table if not exists public.teachers (
  id text primary key,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists teachers_institution_idx on public.teachers(institution_id);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_id text not null references public.students(id) on delete cascade,
  day date not null,
  time_in time,
  status text not null check (status in ('Puntual', 'Tardanza', 'Justificada', 'Inasistencia')),
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_by_name text not null default '',
  created_at timestamptz not null default now(),
  unique (student_id, day)
);
create index if not exists attendance_inst_day_idx on public.attendance(institution_id, day);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  audience text not null default 'all',
  body text not null,
  author_name text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists announcements_inst_idx on public.announcements(institution_id, created_at desc);

-- ---------------------------------------------------------------------
-- Funciones de ayuda para los permisos
-- ---------------------------------------------------------------------

create or replace function public.my_role(inst uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.members where institution_id = inst and user_id = auth.uid();
$$;

create or replace function public.is_member(inst uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where institution_id = inst and user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Contadores de asistencia por alumno (se recalculan solos)
-- ---------------------------------------------------------------------

create or replace function public.refresh_student_counters()
returns trigger language plpgsql security definer set search_path = public as $$
declare sid text;
begin
  sid := coalesce(new.student_id, old.student_id);
  update public.students s set
    present_days   = (select count(*) from public.attendance a where a.student_id = sid and a.status = 'Puntual'),
    late_days      = (select count(*) from public.attendance a where a.student_id = sid and a.status = 'Tardanza'),
    absent_days    = (select count(*) from public.attendance a where a.student_id = sid and a.status = 'Inasistencia'),
    justified_days = (select count(*) from public.attendance a where a.student_id = sid and a.status = 'Justificada')
  where s.id = sid;
  return null;
end $$;

drop trigger if exists attendance_counters on public.attendance;
create trigger attendance_counters
after insert or update or delete on public.attendance
for each row execute function public.refresh_student_counters();

-- ---------------------------------------------------------------------
-- Alta de colegio y unión de personal
-- ---------------------------------------------------------------------

create or replace function public.create_institution(p_name text, p_config jsonb, p_profile jsonb, p_full_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  insert into public.institutions(name, config, director_profile, created_by)
  values (p_name, p_config, p_profile, auth.uid()) returning id into new_id;
  insert into public.members(institution_id, user_id, role, full_name, email)
  values (new_id, auth.uid(), 'director', p_full_name, coalesce(auth.jwt() ->> 'email', ''));
  return new_id;
end $$;

create or replace function public.join_institution(p_code text, p_full_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inst uuid; r text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select id, 'docente' into inst, r from public.institutions where teacher_code = upper(trim(p_code));
  if inst is null then
    select id, 'auxiliar' into inst, r from public.institutions where staff_code = upper(trim(p_code));
  end if;
  if inst is null then raise exception 'Código no válido'; end if;
  insert into public.members(institution_id, user_id, role, full_name, email)
  values (inst, auth.uid(), r, p_full_name, coalesce(auth.jwt() ->> 'email', ''))
  on conflict (institution_id, user_id) do nothing;
  return inst;
end $$;

create or replace function public.rotate_join_codes(inst uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.my_role(inst), '') <> 'director' then raise exception 'Solo la dirección puede cambiar los códigos'; end if;
  update public.institutions set
    teacher_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    staff_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  where id = inst;
end $$;

-- ---------------------------------------------------------------------
-- Registro de ingreso por QR (puerta o aula)
-- Calcula Puntual / Tardanza con el horario configurado del colegio.
-- ---------------------------------------------------------------------

create or replace function public.register_scan(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st public.students%rowtype;
  cfg jsonb;
  tz text;
  now_local timestamp;
  today date;
  t time;
  cutoff time;
  st_status text;
  existing public.attendance%rowtype;
  who text;
begin
  select * into st from public.students where qr_token = p_token;
  if st.id is null then
    return jsonb_build_object('ok', false, 'error', 'QR no registrado en ningún colegio');
  end if;
  if not public.is_member(st.institution_id) then
    return jsonb_build_object('ok', false, 'error', 'Este carnet pertenece a otro colegio');
  end if;

  select config into cfg from public.institutions where id = st.institution_id;
  tz := coalesce(cfg ->> 'timeZone', 'America/Lima');
  now_local := now() at time zone tz;
  today := now_local::date;
  t := date_trunc('second', now_local)::time;
  cutoff := coalesce(nullif(cfg ->> 'punctualCutoffTime', ''), '07:45')::time;
  st_status := case when t <= cutoff then 'Puntual' else 'Tardanza' end;

  select * into existing from public.attendance where student_id = st.id and day = today;
  if existing.id is not null then
    return jsonb_build_object('ok', true, 'duplicate', true, 'student', st.data,
      'status', existing.status, 'time', to_char(existing.time_in, 'HH24:MI:SS'));
  end if;

  select full_name into who from public.members where institution_id = st.institution_id and user_id = auth.uid();
  insert into public.attendance(institution_id, student_id, day, time_in, status, recorded_by, recorded_by_name)
  values (st.institution_id, st.id, today, t, st_status, auth.uid(), coalesce(who, ''));

  return jsonb_build_object('ok', true, 'duplicate', false, 'student', st.data,
    'status', st_status, 'time', to_char(t, 'HH24:MI:SS'));
end $$;

-- Marca como "Inasistencia" a quienes no registraron ingreso en el día.
create or replace function public.close_day(inst uuid, p_day date)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if coalesce(public.my_role(inst), '') not in ('director', 'auxiliar') then raise exception 'Sin permiso'; end if;
  insert into public.attendance(institution_id, student_id, day, status, recorded_by, recorded_by_name)
  select inst, s.id, p_day, 'Inasistencia', auth.uid(), 'Cierre del día'
  from public.students s
  where s.institution_id = inst
    and not exists (select 1 from public.attendance a where a.student_id = s.id and a.day = p_day);
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Portal de familias: se abre al escanear el QR del carnet con el celular.
-- No requiere cuenta; el código del carnet es largo y aleatorio.
-- ---------------------------------------------------------------------

create or replace function public.get_family_portal(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare st public.students%rowtype; inst public.institutions%rowtype;
begin
  if p_token is null or length(p_token) < 16 then return null; end if;
  select * into st from public.students where qr_token = p_token;
  if st.id is null then return null; end if;
  select * into inst from public.institutions where id = st.institution_id;
  return jsonb_build_object(
    'student', (st.data - 'dni' - 'address' - 'parentPhone' - 'parentName' - 'birthDate'),
    'counters', jsonb_build_object('present', st.present_days, 'late', st.late_days,
                                   'absent', st.absent_days, 'justified', st.justified_days),
    'institution', jsonb_build_object(
      'name', inst.name,
      'shortName', inst.config ->> 'shortName',
      'academicYear', inst.config ->> 'academicYear',
      'activePeriod', inst.config ->> 'activePeriod',
      'periodType', inst.config ->> 'periodType'),
    'attendance', coalesce((
      select jsonb_agg(jsonb_build_object('day', a.day, 'time', to_char(a.time_in, 'HH24:MI'), 'status', a.status) order by a.day desc)
      from (select * from public.attendance where student_id = st.id order by day desc limit 40) a), '[]'::jsonb),
    'announcements', coalesce((
      select jsonb_agg(jsonb_build_object('body', n.body, 'author', n.author_name, 'at', n.created_at) order by n.created_at desc)
      from (select * from public.announcements where institution_id = st.institution_id
            and (audience = 'all' or audience = lower(coalesce(st.data ->> 'educationalLevel', '')))
            order by created_at desc limit 10) n), '[]'::jsonb)
  );
end $$;

grant execute on function public.get_family_portal(text) to anon, authenticated;
grant execute on function public.register_scan(text) to authenticated;
grant execute on function public.close_day(uuid, date) to authenticated;
grant execute on function public.create_institution(text, jsonb, jsonb, text) to authenticated;
grant execute on function public.join_institution(text, text) to authenticated;
grant execute on function public.rotate_join_codes(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Seguridad por filas (cada colegio solo ve lo suyo)
-- ---------------------------------------------------------------------

alter table public.institutions enable row level security;
alter table public.members enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.attendance enable row level security;
alter table public.announcements enable row level security;

drop policy if exists inst_select on public.institutions;
create policy inst_select on public.institutions for select using (public.is_member(id));
drop policy if exists inst_update on public.institutions;
create policy inst_update on public.institutions for update using (public.my_role(id) = 'director');

drop policy if exists members_select on public.members;
create policy members_select on public.members for select using (public.is_member(institution_id));
drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete
  using (public.my_role(institution_id) = 'director' and user_id <> auth.uid());

drop policy if exists students_select on public.students;
create policy students_select on public.students for select using (public.is_member(institution_id));
drop policy if exists students_insert on public.students;
create policy students_insert on public.students for insert with check (public.my_role(institution_id) = 'director');
drop policy if exists students_update on public.students;
create policy students_update on public.students for update using (public.my_role(institution_id) in ('director', 'docente'));
drop policy if exists students_delete on public.students;
create policy students_delete on public.students for delete using (public.my_role(institution_id) = 'director');

drop policy if exists teachers_select on public.teachers;
create policy teachers_select on public.teachers for select using (public.is_member(institution_id));
drop policy if exists teachers_write on public.teachers;
create policy teachers_write on public.teachers for all
  using (public.my_role(institution_id) = 'director') with check (public.my_role(institution_id) = 'director');

drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance for select using (public.is_member(institution_id));
drop policy if exists attendance_update on public.attendance;
create policy attendance_update on public.attendance for update using (public.my_role(institution_id) in ('director', 'auxiliar'));
drop policy if exists attendance_delete on public.attendance;
create policy attendance_delete on public.attendance for delete using (public.my_role(institution_id) = 'director');

drop policy if exists ann_select on public.announcements;
create policy ann_select on public.announcements for select using (public.is_member(institution_id));
drop policy if exists ann_insert on public.announcements;
create policy ann_insert on public.announcements for insert with check (public.my_role(institution_id) = 'director');
drop policy if exists ann_delete on public.announcements;
create policy ann_delete on public.announcements for delete using (public.my_role(institution_id) = 'director');

-- Ingresos en vivo para el panel (tiempo real)
do $$ begin
  alter publication supabase_realtime add table public.attendance;
exception when duplicate_object then null; when undefined_object then null; end $$;
