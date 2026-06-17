-- ============================================================
-- LIBRO DIGITAL BUENA NUEVA — SCHEMA COMPLETO Y ACTUALIZADO
-- Versión: 2025-06
-- Cambios incluidos respecto a versión anterior:
--   · admin_passwords  (gestión de contraseñas del panel general)
--   · ciclos           (ciclos catequéticos globales)
--   · grupos.ciclo_id  (FK a ciclos)
--   · grupo_alumnos: activo + fecha_ingreso + fecha_egreso
--                    (historial de membresía por ciclo)
--   · my_alumno_grupo_id() filtra activo = true
-- ============================================================
-- Para instalar en un proyecto Supabase nuevo:
--   SQL Editor → New query → pegar todo → Run
-- ============================================================

-- ============================================================
-- EXTENSIONES
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================
create type rol_usuario as enum ('alumno', 'catequista', 'admin_colegio');

create type tipo_hoja as enum (
  'lectura',
  'escritura_libre',
  'escritura_imagen',
  'foto',
  'audio',
  'cuestionario',
  'multimedia'
);

create type estado_entrega as enum ('borrador', 'entregado');

-- ============================================================
-- COLEGIOS
-- ============================================================
create table colegios (
  id         uuid primary key default uuid_generate_v4(),
  codigo     text unique not null,
  nombre     text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_colegios_nombre_trgm on colegios using gin (nombre gin_trgm_ops);
create index idx_colegios_codigo      on colegios (codigo);

-- ============================================================
-- CICLOS CATEQUÉTICOS (global, gestionados por admin general)
-- Un ciclo activo es el ciclo actual de la plataforma.
-- Solo puede haber uno activo a la vez (se controla por app).
-- ============================================================
create table ciclos (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null unique,   -- ej. "2024-2025"
  descripcion text,
  activo      boolean not null default false,
  orden       int not null default 0, -- para ordenar cronológicamente
  created_at  timestamptz not null default now()
);

-- ============================================================
-- PERFILES (extiende auth.users)
-- ============================================================
create table perfiles (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid unique references auth.users(id) on delete cascade,
  colegio_id uuid references colegios(id) on delete cascade,
  nombre     text not null,
  apellido   text not null,
  email      text,
  username   text unique,
  rol        rol_usuario not null,
  avatar_id  int default 1 check (avatar_id between 1 and 10),
  mini_bio   text,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_perfiles_colegio  on perfiles (colegio_id);
create index idx_perfiles_username on perfiles (username);
create index idx_perfiles_rol      on perfiles (rol);

-- ============================================================
-- GRUPOS
-- Cada grupo pertenece a un colegio y opcionalmente a un ciclo.
-- Cada ciclo tiene grupos propios (no se reutilizan entre ciclos).
-- ============================================================
create table grupos (
  id            uuid primary key default uuid_generate_v4(),
  colegio_id    uuid not null references colegios(id) on delete cascade,
  ciclo_id      uuid references ciclos(id) on delete set null,
  nombre        text not null,
  catequista_id uuid references perfiles(id) on delete set null,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index idx_grupos_colegio    on grupos (colegio_id);
create index idx_grupos_ciclo      on grupos (ciclo_id);
create index idx_grupos_catequista on grupos (catequista_id);

-- ============================================================
-- MEMBRESÍA ALUMNO → GRUPO (con historial)
-- Cuando un alumno "brinca" de grupo/ciclo:
--   · Se actualiza activo = false, fecha_egreso = now() en el registro viejo
--   · Se inserta nuevo registro activo = true en el nuevo grupo
-- La PK (grupo_id, alumno_id) sigue válida porque cada ciclo
-- usa grupos distintos.
-- ============================================================
create table grupo_alumnos (
  grupo_id      uuid not null references grupos(id) on delete cascade,
  alumno_id     uuid not null references perfiles(id) on delete cascade,
  activo        boolean not null default true,
  fecha_ingreso timestamptz not null default now(),
  fecha_egreso  timestamptz,
  primary key (grupo_id, alumno_id)
);

create index idx_grupo_alumnos_alumno on grupo_alumnos (alumno_id);
create index idx_grupo_alumnos_grupo  on grupo_alumnos (grupo_id);

-- ============================================================
-- CONTENIDO (compartido entre todos los colegios)
-- ============================================================
create table libros (
  id          uuid primary key default uuid_generate_v4(),
  titulo      text not null,
  descripcion text,
  portada_url text,
  orden       int not null default 0,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table bloques (
  id          uuid primary key default uuid_generate_v4(),
  libro_id    uuid not null references libros(id) on delete cascade,
  titulo      text not null,
  descripcion text,
  orden       int not null default 0,
  activo      boolean not null default true
);

create index idx_bloques_libro on bloques (libro_id, orden);

create table hojas (
  id         uuid primary key default uuid_generate_v4(),
  bloque_id  uuid not null references bloques(id) on delete cascade,
  titulo     text,
  imagen_url text not null,
  tipo       tipo_hoja not null default 'lectura',
  orden      int not null default 0,
  activo     boolean not null default true,
  -- config JSONB: preguntas[] para cuestionario; audio_url/video_url para multimedia
  config     jsonb
);

create index idx_hojas_bloque on hojas (bloque_id, orden);

-- Zonas de escritura sobre imagen (tipo escritura_imagen)
create table zonas_escritura (
  id          uuid primary key default uuid_generate_v4(),
  hoja_id     uuid not null references hojas(id) on delete cascade,
  x_pct       decimal(5,2) not null,
  y_pct       decimal(5,2) not null,
  width_pct   decimal(5,2) not null,
  height_pct  decimal(5,2) not null,
  placeholder text,
  orden       int not null default 0
);

-- ============================================================
-- ASIGNACIÓN LIBRO → GRUPO
-- ============================================================
create table libro_grupos (
  libro_id    uuid not null references libros(id) on delete cascade,
  grupo_id    uuid not null references grupos(id) on delete cascade,
  asignado_at timestamptz not null default now(),
  activo      boolean not null default true,
  primary key (libro_id, grupo_id)
);

-- ============================================================
-- VISITAS (tracking de lectura por alumno)
-- ============================================================
create table visitas_hojas (
  id             uuid primary key default uuid_generate_v4(),
  alumno_id      uuid not null references perfiles(id) on delete cascade,
  hoja_id        uuid not null references hojas(id) on delete cascade,
  primera_visita timestamptz not null default now(),
  ultima_visita  timestamptz not null default now(),
  visitas_count  int not null default 1,
  unique (alumno_id, hoja_id)
);

create index idx_visitas_alumno on visitas_hojas (alumno_id);

-- ============================================================
-- ENTREGAS
-- ============================================================
create table entregas (
  id                 uuid primary key default uuid_generate_v4(),
  alumno_id          uuid not null references perfiles(id) on delete cascade,
  hoja_id            uuid not null references hojas(id) on delete cascade,
  contenido          jsonb not null default '{}',
  estado             estado_entrega not null default 'borrador',
  fecha_entrega      timestamptz,
  fecha_modificacion timestamptz,
  unique (alumno_id, hoja_id)
);

create index idx_entregas_alumno on entregas (alumno_id);
create index idx_entregas_hoja   on entregas (hoja_id);

-- ============================================================
-- COMENTARIOS DE CATEQUISTA
-- ============================================================
create table comentarios (
  id                 uuid primary key default uuid_generate_v4(),
  entrega_id         uuid not null references entregas(id) on delete cascade,
  catequista_id      uuid not null references perfiles(id) on delete cascade,
  contenido          text not null,
  publicado          boolean not null default false,
  fecha_comentario   timestamptz not null default now(),
  fecha_modificacion timestamptz
);

create index idx_comentarios_entrega on comentarios (entrega_id);

-- ============================================================
-- QR TOKENS (login rápido de alumnos)
-- ============================================================
create table qr_tokens (
  id         uuid primary key default uuid_generate_v4(),
  alumno_id  uuid not null references perfiles(id) on delete cascade,
  token      text unique not null,
  usado      boolean not null default false,
  expira_at  timestamptz not null default (now() + interval '1 hour'),
  created_at timestamptz not null default now()
);

-- ============================================================
-- CONTRASEÑAS DEL PANEL GENERAL
-- Permite cambiar la contraseña de acceso al panel general
-- sin tocar variables de entorno. Solo accesible vía service_role.
-- Los valores se guardan como SHA-256(ADMIN_GENERAL_SECRET + password).
-- ============================================================
create table admin_passwords (
  id         uuid primary key default uuid_generate_v4(),
  etiqueta   text not null default 'Principal',
  hash       text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table colegios        enable row level security;
alter table ciclos          enable row level security;
alter table perfiles        enable row level security;
alter table grupos          enable row level security;
alter table grupo_alumnos   enable row level security;
alter table libros          enable row level security;
alter table bloques         enable row level security;
alter table hojas           enable row level security;
alter table zonas_escritura enable row level security;
alter table libro_grupos    enable row level security;
alter table visitas_hojas   enable row level security;
alter table entregas        enable row level security;
alter table comentarios     enable row level security;
alter table qr_tokens       enable row level security;
alter table admin_passwords enable row level security;

-- ============================================================
-- HELPER FUNCTIONS (security definer = bypass RLS)
-- ============================================================
create or replace function get_my_profile()
returns perfiles language sql security definer stable as $$
  select * from perfiles where user_id = auth.uid() limit 1;
$$;

create or replace function my_colegio_id()
returns uuid language sql security definer stable as $$
  select colegio_id from perfiles where user_id = auth.uid() limit 1;
$$;

create or replace function my_rol()
returns rol_usuario language sql security definer stable as $$
  select rol from perfiles where user_id = auth.uid() limit 1;
$$;

create or replace function my_grupo_ids()
returns uuid[] language sql security definer stable as $$
  select array_agg(id) from grupos
  where catequista_id = (select id from perfiles where user_id = auth.uid())
    and activo = true;
$$;

-- Retorna el grupo ACTIVO actual del alumno autenticado
create or replace function my_alumno_grupo_id()
returns uuid language sql security definer stable as $$
  select ga.grupo_id
  from grupo_alumnos ga
  join perfiles p on p.id = ga.alumno_id
  where p.user_id = auth.uid()
    and ga.activo = true
  limit 1;
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Colegios: cualquiera ve los activos (selector de login)
create policy "colegios_select_all" on colegios
  for select using (activo = true);

-- Ciclos: cualquier usuario autenticado los puede ver
create policy "ciclos_select_all" on ciclos
  for select using (true);

-- Perfiles: ves los de tu mismo colegio y el tuyo propio
create policy "perfiles_select_own_colegio" on perfiles
  for select using (colegio_id = my_colegio_id() or user_id = auth.uid());
create policy "perfiles_update_own" on perfiles
  for update using (user_id = auth.uid());

-- Grupos: ves los de tu colegio
create policy "grupos_select_colegio" on grupos
  for select using (colegio_id = my_colegio_id());

-- Grupo_alumnos: ves todos (activos e históricos) de grupos de tu colegio
create policy "grupo_alumnos_select" on grupo_alumnos
  for select using (
    grupo_id in (select id from grupos where colegio_id = my_colegio_id())
  );

-- Libros, bloques, hojas, zonas: visibles si están activos
create policy "libros_select"  on libros          for select using (activo = true);
create policy "bloques_select" on bloques         for select using (activo = true);
create policy "hojas_select"   on hojas           for select using (activo = true);
create policy "zonas_select"   on zonas_escritura for select using (true);

-- Libro_grupos: ves los de grupos de tu colegio
create policy "libro_grupos_select" on libro_grupos
  for select using (
    grupo_id in (select id from grupos where colegio_id = my_colegio_id())
  );

-- Visitas: alumno ve las suyas; catequista ve las de su grupo actual
create policy "visitas_select_own" on visitas_hojas
  for select using (
    alumno_id = (select id from perfiles where user_id = auth.uid())
    or
    alumno_id in (
      select ga.alumno_id from grupo_alumnos ga
      where ga.grupo_id = any(my_grupo_ids())
        and ga.activo = true
    )
  );
create policy "visitas_upsert_own" on visitas_hojas
  for insert with check (
    alumno_id = (select id from perfiles where user_id = auth.uid())
  );
create policy "visitas_update_own" on visitas_hojas
  for update using (
    alumno_id = (select id from perfiles where user_id = auth.uid())
  );

-- Entregas: alumno ve y edita las suyas; catequista ve las de su grupo actual
create policy "entregas_select" on entregas
  for select using (
    alumno_id = (select id from perfiles where user_id = auth.uid())
    or
    alumno_id in (
      select ga.alumno_id from grupo_alumnos ga
      where ga.grupo_id = any(my_grupo_ids())
        and ga.activo = true
    )
  );
create policy "entregas_insert_own" on entregas
  for insert with check (
    alumno_id = (select id from perfiles where user_id = auth.uid())
  );
create policy "entregas_update_own" on entregas
  for update using (
    alumno_id = (select id from perfiles where user_id = auth.uid())
  );

-- Comentarios: catequista gestiona los suyos; alumno ve los publicados de sus entregas
create policy "comentarios_select" on comentarios
  for select using (
    (publicado = true and entrega_id in (
      select id from entregas
      where alumno_id = (select id from perfiles where user_id = auth.uid())
    ))
    or catequista_id = (select id from perfiles where user_id = auth.uid())
  );
create policy "comentarios_catequista_manage" on comentarios
  for all using (
    catequista_id = (select id from perfiles where user_id = auth.uid())
  );

-- QR tokens: alumno ve los suyos
create policy "qr_tokens_select" on qr_tokens
  for select using (
    alumno_id = (select id from perfiles where user_id = auth.uid())
  );

-- admin_passwords: solo accesible por service_role (API del panel general)
-- No se necesitan políticas de usuario ya que todas las lecturas/escrituras
-- se hacen con el cliente de servicio (bypassa RLS).

-- ============================================================
-- FUNCIONES
-- ============================================================

-- Registra o incrementa la visita de un alumno a una hoja
create or replace function registrar_visita(p_alumno_id uuid, p_hoja_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into visitas_hojas (alumno_id, hoja_id)
  values (p_alumno_id, p_hoja_id)
  on conflict (alumno_id, hoja_id) do update
    set ultima_visita  = now(),
        visitas_count  = visitas_hojas.visitas_count + 1;
end;
$$;

-- Genera código único para colegio (ej: "AB-3X7Y")
create or replace function generar_codigo_colegio()
returns text language plpgsql as $$
declare
  chars     text := 'ABCDEFGHJKMNPQRSTUVWXY23456789';
  result    text;
  ya_existe boolean;
begin
  loop
    result := substr(chars, floor(random() * length(chars) + 1)::int, 1)
           || substr(chars, floor(random() * length(chars) + 1)::int, 1)
           || '-'
           || substr(chars, floor(random() * length(chars) + 1)::int, 1)
           || substr(chars, floor(random() * length(chars) + 1)::int, 1)
           || substr(chars, floor(random() * length(chars) + 1)::int, 1)
           || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    select exists(select 1 from colegios where codigo = result) into ya_existe;
    exit when not ya_existe;
  end loop;
  return result;
end;
$$;

-- Genera contraseña aleatoria de 6 caracteres para alumnos
create or replace function generar_password()
returns text language plpgsql as $$
declare
  chars  text := 'abcdefghjkmnpqrstuvwxy3456789';
  result text := '';
  i      int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger perfiles_updated_at
  before update on perfiles
  for each row execute function update_updated_at();

-- ============================================================
-- STORAGE — 2 buckets necesarios
-- ============================================================

-- Bucket "libros" (público): imágenes de hojas, portadas, audios/videos
insert into storage.buckets (id, name, public)
values ('libros', 'libros', true)
on conflict (id) do nothing;

create policy "libros_upload" on storage.objects
  for insert to service_role
  with check (bucket_id = 'libros');

create policy "libros_public_read" on storage.objects
  for select using (bucket_id = 'libros');

create policy "libros_delete" on storage.objects
  for delete to service_role
  using (bucket_id = 'libros');

-- Bucket "entregas" (público): fotos, grabaciones, dibujos de alumnos
-- Estructura: {tipo}/{alumno_id}/{hoja_id}/{timestamp}.{ext}
insert into storage.buckets (id, name, public)
values ('entregas', 'entregas', true)
on conflict (id) do nothing;

create policy "entregas_upload" on storage.objects
  for insert to service_role
  with check (bucket_id = 'entregas');

create policy "entregas_public_read" on storage.objects
  for select using (bucket_id = 'entregas');

create policy "entregas_delete" on storage.objects
  for delete to service_role
  using (bucket_id = 'entregas');


-- ============================================================
-- ============================================================
-- MIGRACIÓN PARA BASE DE DATOS EXISTENTE
-- (NO ejecutar en instalación nueva — ya está incluido arriba)
-- Ejecutar solo si ya tienes datos en producción
-- ============================================================
-- ============================================================

/*

-- 1. Tabla ciclos
create table if not exists ciclos (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null unique,
  descripcion text,
  activo      boolean not null default false,
  orden       int not null default 0,
  created_at  timestamptz not null default now()
);
alter table ciclos enable row level security;
create policy "ciclos_select_all" on ciclos for select using (true);

-- 2. ciclo_id en grupos
alter table grupos add column if not exists ciclo_id uuid references ciclos(id) on delete set null;
create index if not exists idx_grupos_ciclo on grupos (ciclo_id);

-- 3. Historial de membresía en grupo_alumnos
alter table grupo_alumnos add column if not exists activo        boolean not null default true;
alter table grupo_alumnos add column if not exists fecha_ingreso timestamptz not null default now();
alter table grupo_alumnos add column if not exists fecha_egreso  timestamptz;

-- Si el campo se llamaba joined_at, puedes copiar los valores:
-- update grupo_alumnos set fecha_ingreso = joined_at where fecha_ingreso = now();

create index if not exists idx_grupo_alumnos_alumno on grupo_alumnos (alumno_id);

-- 4. Tabla admin_passwords
create table if not exists admin_passwords (
  id         uuid primary key default uuid_generate_v4(),
  etiqueta   text not null default 'Principal',
  hash       text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table admin_passwords enable row level security;

-- 5. Actualizar función my_alumno_grupo_id para filtrar activo = true
create or replace function my_alumno_grupo_id()
returns uuid language sql security definer stable as $$
  select ga.grupo_id
  from grupo_alumnos ga
  join perfiles p on p.id = ga.alumno_id
  where p.user_id = auth.uid()
    and ga.activo = true
  limit 1;
$$;

-- 6. Actualizar función my_grupo_ids para solo grupos activos del catequista
create or replace function my_grupo_ids()
returns uuid[] language sql security definer stable as $$
  select array_agg(id) from grupos
  where catequista_id = (select id from perfiles where user_id = auth.uid())
    and activo = true;
$$;

-- 7. Actualizar políticas RLS de visitas y entregas para activo = true
-- (Opcional si las políticas actuales ya funcionan — el filtro activo=true
--  en my_grupo_ids() ya limita el acceso a grupos activos)

*/
