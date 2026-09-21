-- Initial schema: no candidates, communities or responses are seeded in production.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create extension if not exists unaccent with schema extensions;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete restrict,
 nombre text not null default '', rol text not null check (rol in ('SUPER_ADMIN','ADMIN','SUPERVISOR','VISUALIZADOR')),
 activo boolean not null default true, created_at timestamptz not null default now()
);
create table public.configuracion (
 id integer primary key default 1 check(id=1), nombre text not null default 'ENCUESTA RURAL' check(length(trim(nombre)) between 1 and 100),
 subtitulo text not null default 'Sistema de Participación Ciudadana', logo_url text,
 departamento text not null default 'Junín', provincia text not null default 'Concepción', distrito text not null default 'Andamarca',
 bienvenida text not null default 'Participa en el sondeo de opinión de tu distrito, Centro Poblado o Comunidad.',
 privacidad text not null default 'Los datos proporcionados serán utilizados para registrar y validar su participación, prevenir registros duplicados y proteger la integridad del sondeo. Los datos personales no serán mostrados públicamente.',
 privacidad_version text not null default '1.0', informacion_institucional text not null default '', mostrar_resultados boolean not null default true,
 responsable text not null default '', ambito text not null default '', metodo text not null default 'Participación voluntaria mediante formulario web. Sin muestreo científico.',
 financiacion text not null default '', observaciones text not null default '', updated_at timestamptz not null default now()
);
insert into public.configuracion default values;
create table public.centros_poblados (
 id uuid primary key default gen_random_uuid(), nombre text not null check(length(trim(nombre)) between 2 and 160), nombre_normalizado text not null default '',
 tipo text not null check(tipo in ('CENTRO_POBLADO','COMUNIDAD','ANEXO','CASERIO','OTRO')), codigo text,
 departamento text not null, provincia text not null, distrito text not null, activo boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.encuestas (
 id uuid primary key default gen_random_uuid(), titulo text not null check(length(trim(titulo)) between 3 and 200), descripcion text not null default '',
 departamento text not null, provincia text not null, distrito text not null, fecha_inicio timestamptz, fecha_fin timestamptz,
 estado text not null default 'BORRADOR' check(estado in ('BORRADOR','PROGRAMADA','ACTIVA','CERRADA','ARCHIVADA')),
 mostrar_resultados boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(fecha_fin is null or fecha_inicio is null or fecha_fin>fecha_inicio),
 check(estado not in ('ACTIVA','PROGRAMADA') or (fecha_inicio is not null and fecha_fin is not null))
);
create table public.candidatos (
 id uuid primary key default gen_random_uuid(), encuesta_id uuid not null references public.encuestas(id) on delete restrict,
 nombre_completo text not null check(length(trim(nombre_completo)) between 2 and 200), cargo text not null check(length(trim(cargo)) between 2 and 120),
 organizacion_politica text not null check(length(trim(organizacion_politica)) between 2 and 200), foto_url text, simbolo_url text, numero_lista text,
 descripcion text, orden_visual integer not null default 0, activo boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(encuesta_id,id),
 check(foto_url is null or foto_url ~ '^https://'),check(simbolo_url is null or simbolo_url ~ '^https://')
);
create table public.participantes (
 id uuid primary key default gen_random_uuid(), dni varchar(8) not null unique check(dni ~ '^[0-9]{8}$'),
 nombres text not null check(length(trim(nombres)) between 2 and 100), apellido_paterno text not null check(length(trim(apellido_paterno)) between 2 and 100),
 apellido_materno text check(apellido_materno is null or length(trim(apellido_materno)) between 2 and 100),
 nombre_completo text not null, nombre_normalizado text not null, centro_poblado_id uuid not null references public.centros_poblados(id) on delete restrict,
 estado text not null default 'ACTIVO' check(estado in ('ACTIVO','INACTIVO')), fecha_registro timestamptz not null default now(),
 ip_hash text, device_hash text, session_id uuid, user_agent_resumido text, fraud_score integer not null default 0 check(fraud_score between 0 and 100),
 requiere_revision boolean not null default false, privacidad_version text not null, privacidad_aceptada_at timestamptz not null default now(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.respuestas (
 id uuid primary key default gen_random_uuid(), encuesta_id uuid not null references public.encuestas(id) on delete restrict,
 participante_id uuid not null references public.participantes(id) on delete restrict, candidato_id uuid not null,
 centro_poblado_id uuid not null references public.centros_poblados(id) on delete restrict,
 estado text not null default 'VALIDA' check(estado in ('VALIDA','EN_REVISION','INVALIDADA')), fecha_respuesta timestamptz not null default now(),
 ip_hash text, device_hash text, fraud_score integer not null default 0 check(fraud_score between 0 and 100), requiere_revision boolean not null default false,
 motivo text, explicacion text, revisado_por uuid references public.profiles(id), revisado_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(encuesta_id,participante_id), foreign key(encuesta_id,candidato_id) references public.candidatos(encuesta_id,id) on delete restrict,
 check(estado<>'INVALIDADA' or motivo is not null),
 check(motivo is null or motivo in ('DUPLICADO_CONFIRMADO','REGISTRO_DE_PRUEBA','ABUSO_AUTOMATIZADO','DATOS_INVALIDOS','CORRECCION_ADMINISTRATIVA','OTRO')),
 check(motivo is distinct from 'OTRO' or length(trim(explicacion))>=10)
);
create table public.fraud_events (
 id uuid primary key default gen_random_uuid(), tipo text not null check(tipo in ('DNI_DUPLICADO','NOMBRE_COINCIDENTE','RESPUESTA_DUPLICADA','MULTIPLES_REGISTROS_IP','MULTIPLES_REGISTROS_DISPOSITIVO','RATE_LIMIT','PATRON_SOSPECHOSO')),
 participante_id uuid references public.participantes(id), encuesta_id uuid references public.encuestas(id), ip_hash text, device_hash text,
 descripcion text, metadata jsonb not null default '{}'::jsonb, nivel_riesgo text not null default 'BAJO' check(nivel_riesgo in ('BAJO','MEDIO','ALTO','CRITICO')),
 estado text not null default 'PENDIENTE' check(estado in ('PENDIENTE','REVISADO')), created_at timestamptz not null default now()
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), accion text not null, entidad text not null, entidad_id uuid,
 datos_anteriores jsonb, datos_nuevos jsonb, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.resultado_simulacion (
 id uuid primary key default gen_random_uuid(), encuesta_id uuid not null references public.encuestas(id), candidato_id uuid not null,
 porcentaje numeric(5,2) not null check(porcentaje between 0 and 100), cantidad_simulada integer not null default 0 check(cantidad_simulada>=0),
 total_simulado integer not null default 0 check(total_simulado>=0), created_by uuid references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(encuesta_id,candidato_id),
 foreign key(encuesta_id,candidato_id) references public.candidatos(encuesta_id,id)
);
create table private.rate_windows (key text not null, ventana timestamptz not null, intentos integer not null default 1, primary key(key,ventana));
create table private.admin_enrollment (email_hash text primary key, claimed_by uuid references auth.users(id), created_at timestamptz not null default now());

create index participantes_nombre_idx on public.participantes(nombre_normalizado);
create index participantes_centro_idx on public.participantes(centro_poblado_id);
create index participantes_fecha_idx on public.participantes(fecha_registro);
create index participantes_ip_fecha_idx on public.participantes(ip_hash,fecha_registro) where ip_hash is not null;
create index participantes_device_fecha_idx on public.participantes(device_hash,fecha_registro) where device_hash is not null;
create index respuestas_participante_idx on public.respuestas(participante_id);
create index respuestas_candidato_idx on public.respuestas(candidato_id);
create index respuestas_centro_idx on public.respuestas(centro_poblado_id);
create index respuestas_estado_encuesta_idx on public.respuestas(estado,encuesta_id);
create index respuestas_fecha_idx on public.respuestas(fecha_respuesta);
create index respuestas_revisor_idx on public.respuestas(revisado_por);
create index fraud_ip_idx on public.fraud_events(ip_hash) where ip_hash is not null;
create index fraud_device_idx on public.fraud_events(device_hash) where device_hash is not null;
create index fraud_fecha_idx on public.fraud_events(created_at desc);
create index fraud_participante_idx on public.fraud_events(participante_id);
create index fraud_encuesta_idx on public.fraud_events(encuesta_id);
create index audit_fecha_idx on public.audit_logs(created_at desc);
create index audit_user_idx on public.audit_logs(user_id);
create index simulacion_creator_idx on public.resultado_simulacion(created_by);
create index simulacion_candidato_idx on public.resultado_simulacion(candidato_id);

alter table public.profiles enable row level security;
alter table public.configuracion enable row level security;
alter table public.centros_poblados enable row level security;
alter table public.encuestas enable row level security;
alter table public.candidatos enable row level security;
alter table public.participantes enable row level security;
alter table public.respuestas enable row level security;
alter table public.fraud_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.resultado_simulacion enable row level security;
alter table private.rate_windows enable row level security;
alter table private.admin_enrollment enable row level security;
