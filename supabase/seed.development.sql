-- MANUAL DEVELOPMENT ONLY. Not included in config.toml and never run in production.
-- Run only on a Supabase development project, after the versioned migrations.
do $$declare e uuid;begin
 if current_setting('app.allow_demo_seed',true) is distinct from 'true' then raise exception 'Set app.allow_demo_seed=true explicitly on a DEVELOPMENT project.';end if;
 insert into public.encuestas(titulo,descripcion,departamento,provincia,distrito,estado,fecha_inicio,fecha_fin)
 values('SONDEO DEMO - SOLO DESARROLLO','Datos ficticios para pruebas.','DEMO','DEMO','DEMO','ACTIVA',now()-interval '1 day',now()+interval '7 days') returning id into e;
 insert into public.centros_poblados(nombre,tipo,departamento,provincia,distrito) values('C.P. COLCA DEMO','CENTRO_POBLADO','DEMO','DEMO','DEMO'),('C.P. SANTA ROSA DEMO','CENTRO_POBLADO','DEMO','DEMO','DEMO'),('COMUNIDAD DEMO','COMUNIDAD','DEMO','DEMO','DEMO');
 insert into public.candidatos(encuesta_id,nombre_completo,cargo,organizacion_politica,orden_visual)
 values(e,'CANDIDATO DEMO A','CARGO DEMO','ORGANIZACIÓN DEMO A',1),(e,'CANDIDATO DEMO B','CARGO DEMO','ORGANIZACIÓN DEMO B',2),(e,'CANDIDATO DEMO C','CARGO DEMO','ORGANIZACIÓN DEMO C',3);
end$$;
