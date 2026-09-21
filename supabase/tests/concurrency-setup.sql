-- Isolated QA schema in the SAME Supabase PostgreSQL, never exposed to PostgREST.
-- Copies deployed function source, changing schema qualification only.
create schema rural_qa;
revoke all on schema rural_qa from public,anon,authenticated;
do $$declare t text;definition text;begin
 foreach t in array array['configuracion','encuestas','centros_poblados','candidatos','participantes','respuestas','fraud_events'] loop
 execute format('create table rural_qa.%I (like public.%I including all)',t,t);
 execute format('alter table rural_qa.%I enable row level security',t);
 execute format('revoke all on rural_qa.%I from public,anon,authenticated',t);
 end loop;
 select pg_get_functiondef('public.normalizar_nombre(text)'::regprocedure) into definition;execute replace(definition,'public.','rural_qa.');
 select pg_get_functiondef('public.registrar_participacion(text,text,text,text,uuid,uuid,uuid,text,text,uuid,text,text,boolean)'::regprocedure) into definition;execute replace(definition,'public.','rural_qa.');
end$$;
revoke all on all functions in schema rural_qa from public,anon,authenticated;
alter table rural_qa.respuestas add foreign key(encuesta_id,candidato_id) references rural_qa.candidatos(encuesta_id,id);
alter table rural_qa.respuestas add foreign key(participante_id) references rural_qa.participantes(id);
insert into rural_qa.configuracion default values;
insert into rural_qa.encuestas(titulo,departamento,provincia,distrito,estado,fecha_inicio,fecha_fin) values('DEMO CONCURRENCIA AISLADA','Junín','Concepción','Andamarca','ACTIVA',now()-interval '1 day',now()+interval '1 day');
insert into rural_qa.centros_poblados(nombre,tipo,departamento,provincia,distrito) values('COMUNIDAD DEMO AISLADA','COMUNIDAD','Junín','Concepción','Andamarca');
insert into rural_qa.candidatos(encuesta_id,nombre_completo,cargo,organizacion_politica) select id,'CANDIDATO DEMO AISLADO','CARGO DEMO','ORGANIZACION DEMO' from rural_qa.encuestas;
