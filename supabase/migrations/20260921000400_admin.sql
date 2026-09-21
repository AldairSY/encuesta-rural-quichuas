create function private.require_role(roles text[]) returns void language plpgsql stable security definer set search_path='' as $$begin
 if private.role() is null or not (private.role()=any(roles)) then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
end$$;
create function public.admin_dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform private.require_role(array['SUPER_ADMIN','ADMIN','SUPERVISOR','VISUALIZADOR']);
 return jsonb_build_object('participantes',(select count(*) from public.participantes),'validas',(select count(*) from public.respuestas where estado='VALIDA'),
 'en_revision',(select count(*) from public.respuestas where estado='EN_REVISION' or requiere_revision),'invalidadas',(select count(*) from public.respuestas where estado='INVALIDADA'),
 'centros',(select count(*) from public.centros_poblados where activo and tipo='CENTRO_POBLADO'),'comunidades',(select count(*) from public.centros_poblados where activo and tipo='COMUNIDAD'),
 'alertas',(select count(*) from public.fraud_events where estado='PENDIENTE'),'hoy',(select count(*) from public.participantes where fecha_registro>=date_trunc('day',now() at time zone 'America/Lima') at time zone 'America/Lima'),
 'alertas_hoy',(select count(*) from public.fraud_events where created_at>=date_trunc('day',now() at time zone 'America/Lima') at time zone 'America/Lima'),
 'riesgo_alto',(select count(*) from public.fraud_events where nivel_riesgo in ('ALTO','CRITICO') and estado='PENDIENTE'),
 'nombres_coincidentes',(select count(*) from public.fraud_events where tipo='NOMBRE_COINCIDENTE' and estado='PENDIENTE'),
 'actividad_inusual',(select count(*) from public.fraud_events where tipo in ('RATE_LIMIT','MULTIPLES_REGISTROS_IP','MULTIPLES_REGISTROS_DISPOSITIVO','PATRON_SOSPECHOSO') and estado='PENDIENTE'),
 'por_centro',(select coalesce(jsonb_agg(t),'[]') from (select c.nombre,count(r.id) cantidad from public.centros_poblados c join public.respuestas r on r.centro_poblado_id=c.id and r.estado='VALIDA' group by c.id order by cantidad desc limit 20)t));
end$$;

create function public.admin_list(p_entity text,p_page integer default 1,p_search text default '',p_centro uuid default null,p_estado text default '',p_riesgo text default '',p_desde timestamptz default null,p_hasta timestamptz default null,p_encuesta uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare source text;fields text;filters text;ordering text;rows jsonb;total bigint;begin
 perform private.require_role(array['SUPER_ADMIN','ADMIN','SUPERVISOR','VISUALIZADOR']);
 if p_page<1 or p_page>100000 then raise exception 'INVALID_PAGE';end if;
 case p_entity
 when 'participantes' then
 source='public.participantes p join public.centros_poblados c on c.id=p.centro_poblado_id';
 fields='p.id,''****''||right(p.dni,4) dni,p.nombre_completo,c.nombre centro,p.estado,p.fraud_score,p.requiere_revision,p.fecha_registro';
 filters='($1='''' or p.dni=$1 or p.nombre_normalizado like ''%''||public.normalizar_nombre($1)||''%'') and ($2 is null or p.centro_poblado_id=$2) and ($3='''' or p.estado=$3) and ($4='''' or case when p.fraud_score>=70 then ''CRITICO'' when p.fraud_score>=50 then ''ALTO'' when p.fraud_score>=25 then ''MEDIO'' else ''BAJO'' end=$4) and ($5 is null or p.fecha_registro>=$5) and ($6 is null or p.fecha_registro<$6)';ordering='p.fecha_registro desc,p.id';
 when 'respuestas' then
 source='public.respuestas r join public.participantes p on p.id=r.participante_id join public.centros_poblados c on c.id=r.centro_poblado_id join public.candidatos k on k.id=r.candidato_id';
 fields='r.id,''****''||right(p.dni,4) dni,c.nombre centro,k.nombre_completo candidato,r.estado,r.fraud_score,r.requiere_revision,r.fecha_respuesta,r.motivo,r.explicacion';
 filters='($1='''' or p.dni=$1 or p.nombre_normalizado like ''%''||public.normalizar_nombre($1)||''%'') and ($2 is null or r.centro_poblado_id=$2) and ($3='''' or r.estado=$3) and ($4='''' or case when r.fraud_score>=70 then ''CRITICO'' when r.fraud_score>=50 then ''ALTO'' when r.fraud_score>=25 then ''MEDIO'' else ''BAJO'' end=$4) and ($5 is null or r.fecha_respuesta>=$5) and ($6 is null or r.fecha_respuesta<$6) and ($7 is null or r.encuesta_id=$7)';ordering='r.fecha_respuesta desc,r.id';
 when 'fraud_events' then
 source='public.fraud_events f left join public.participantes p on p.id=f.participante_id left join public.centros_poblados c on c.id=p.centro_poblado_id';
 fields='f.id,f.created_at,f.tipo,''****''||right(p.dni,4) dni,c.nombre centro,left(f.ip_hash,10) ip_hash,left(f.device_hash,10) device_hash,f.nivel_riesgo,f.estado,f.descripcion';
 filters='($1='''' or f.tipo ilike ''%''||$1||''%'') and ($2 is null or p.centro_poblado_id=$2) and ($3='''' or f.estado=$3) and ($4='''' or f.nivel_riesgo=$4) and ($5 is null or f.created_at>=$5) and ($6 is null or f.created_at<$6) and ($7 is null or f.encuesta_id=$7)';ordering='f.created_at desc,f.id';
 when 'audit_logs' then
 source='public.audit_logs a left join public.profiles p on p.id=a.user_id';
 fields='a.id,a.created_at,coalesce(p.nombre,''Sistema'') administrador,a.accion,a.entidad,a.datos_anteriores,a.datos_nuevos,a.metadata';
 filters='($1='''' or a.entidad ilike ''%''||$1||''%'' or a.accion ilike ''%''||$1||''%'') and ($5 is null or a.created_at>=$5) and ($6 is null or a.created_at<$6)';ordering='a.created_at desc,a.id';
 else raise exception 'INVALID_ENTITY';end case;
 execute 'select count(*) from '||source||' where '||filters into total using left(p_search,160),p_centro,p_estado,p_riesgo,p_desde,p_hasta,p_encuesta;
 execute 'select coalesce(jsonb_agg(t),''[]''::jsonb) from (select '||fields||' from '||source||' where '||filters||' order by '||ordering||' limit 25 offset $8) t'
 into rows using left(p_search,160),p_centro,p_estado,p_riesgo,p_desde,p_hasta,p_encuesta,(p_page-1)*25;
 return jsonb_build_object('rows',rows,'total',total,'page',p_page,'page_size',25);
end$$;

create function public.review_response(p_id uuid,p_estado text,p_motivo text,p_explicacion text default '') returns void language plpgsql security definer set search_path='' as $$begin
 perform private.require_role(array['SUPER_ADMIN','ADMIN','SUPERVISOR']);
 if p_estado not in ('VALIDA','EN_REVISION','INVALIDADA') or p_motivo not in ('DUPLICADO_CONFIRMADO','REGISTRO_DE_PRUEBA','ABUSO_AUTOMATIZADO','DATOS_INVALIDOS','CORRECCION_ADMINISTRATIVA','OTRO') or p_motivo is null then raise exception 'INVALID_REVIEW';end if;
 if p_motivo='OTRO' and length(trim(coalesce(p_explicacion,'')))<10 then raise exception 'EXPLANATION_REQUIRED';end if;
 update public.respuestas set estado=p_estado,motivo=p_motivo,explicacion=left(p_explicacion,2000),requiere_revision=(p_estado='EN_REVISION'),revisado_por=auth.uid(),revisado_at=now() where id=p_id;
 if not found then raise exception 'NOT_FOUND';end if;
end$$;
create function public.review_fraud(p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform private.require_role(array['SUPER_ADMIN','ADMIN','SUPERVISOR']);
 update public.fraud_events set estado='REVISADO' where id=p_id;
 if not found then raise exception 'NOT_FOUND';end if;
 insert into public.audit_logs(user_id,accion,entidad,entidad_id,datos_nuevos) values(auth.uid(),'REVISAR','fraud_events',p_id,'{"estado":"REVISADO"}');
end$$;
create function public.update_participant(p_id uuid,p_estado text,p_motivo text) returns void language plpgsql security definer set search_path='' as $$declare prev text;begin
 perform private.require_role(array['SUPER_ADMIN','ADMIN']);
 if p_estado not in ('ACTIVO','INACTIVO') or length(trim(coalesce(p_motivo,'')))<10 then raise exception 'INVALID_REVIEW';end if;
 select estado into prev from public.participantes where id=p_id for update;
 if not found then raise exception 'NOT_FOUND';end if;
 update public.participantes set estado=p_estado where id=p_id;
 insert into public.audit_logs(user_id,accion,entidad,entidad_id,datos_anteriores,datos_nuevos,metadata) values(auth.uid(),'CAMBIAR_ESTADO','participantes',p_id,jsonb_build_object('estado',prev),jsonb_build_object('estado',p_estado),jsonb_build_object('motivo',left(p_motivo,2000)));
end$$;
create function public.reveal_dni(p_id uuid,p_motivo text) returns text language plpgsql security definer set search_path='' as $$declare value text;begin
 perform private.require_role(array['SUPER_ADMIN','ADMIN']);
 if length(trim(coalesce(p_motivo,'')))<10 then raise exception 'REASON_REQUIRED';end if;
 select dni into value from public.participantes where id=p_id;
 insert into public.audit_logs(user_id,accion,entidad,entidad_id,metadata) values(auth.uid(),'CONSULTAR_DNI','participantes',p_id,jsonb_build_object('motivo',left(p_motivo,2000)));
 return value;
end$$;

create function public.save_simulation(p_encuesta uuid,p_valores jsonb,p_total integer) returns void language plpgsql security definer set search_path='' as $$
declare n integer;total numeric;begin
 perform private.require_role(array['SUPER_ADMIN','ADMIN']);
 perform 1 from public.encuestas where id=p_encuesta for update;if not found then raise exception 'NOT_FOUND';end if;
 if jsonb_typeof(p_valores)<>'array' or jsonb_array_length(p_valores)>300 or p_total not between 0 and 10000000 then raise exception 'INVALID_SIMULATION';end if;
 select count(distinct x->>'candidato_id'),sum((x->>'porcentaje')::numeric) into n,total from jsonb_array_elements(p_valores)x;
 if n<>jsonb_array_length(p_valores) or n=0 or total<>100 or exists(select 1 from jsonb_array_elements(p_valores)x where (x->>'porcentaje')::numeric not between 0 and 100 or (x->>'porcentaje')::numeric<>round((x->>'porcentaje')::numeric,2) or not exists(select 1 from public.candidatos c where c.id=(x->>'candidato_id')::uuid and c.encuesta_id=p_encuesta)) then raise exception 'INVALID_SIMULATION';end if;
 if n<>(select count(*) from public.candidatos where encuesta_id=p_encuesta) then raise exception 'INCOMPLETE_SIMULATION';end if;
 delete from public.resultado_simulacion where encuesta_id=p_encuesta;
 insert into public.resultado_simulacion(encuesta_id,candidato_id,porcentaje,cantidad_simulada,total_simulado,created_by)
 select p_encuesta,(x->>'candidato_id')::uuid,(x->>'porcentaje')::numeric,round((x->>'porcentaje')::numeric*p_total/100)::integer,p_total,auth.uid() from jsonb_array_elements(p_valores)x;
end$$;
create function public.reset_simulation(p_encuesta uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform private.require_role(array['SUPER_ADMIN','ADMIN']);
 perform 1 from public.encuestas where id=p_encuesta for update;
 delete from public.resultado_simulacion where encuesta_id=p_encuesta;
end$$;
create function public.manage_profile(p_user_id uuid,p_nombre text,p_rol text,p_activo boolean) returns void language plpgsql security definer set search_path='' as $$begin
 perform private.require_role(array['SUPER_ADMIN']);
 perform pg_advisory_xact_lock(hashtextextended('rural:roles',0));
 if p_rol not in ('SUPER_ADMIN','ADMIN','SUPERVISOR','VISUALIZADOR') then raise exception 'INVALID_ROLE';end if;
 if exists(select 1 from public.profiles where id=p_user_id and activo and rol='SUPER_ADMIN') and (not p_activo or p_rol<>'SUPER_ADMIN') and (select count(*) from public.profiles where activo and rol='SUPER_ADMIN')<=1 then raise exception 'LAST_SUPER_ADMIN';end if;
 insert into public.profiles(id,nombre,rol,activo) values(p_user_id,left(p_nombre,120),p_rol,p_activo) on conflict(id) do update set nombre=excluded.nombre,rol=excluded.rol,activo=excluded.activo;
end$$;
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.role() to anon,authenticated;
revoke all on function public.admin_dashboard(),public.admin_list(text,integer,text,uuid,text,text,timestamptz,timestamptz,uuid),public.review_response(uuid,text,text,text),public.review_fraud(uuid),public.update_participant(uuid,text,text),public.reveal_dni(uuid,text),public.save_simulation(uuid,jsonb,integer),public.reset_simulation(uuid),public.manage_profile(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.admin_dashboard(),public.admin_list(text,integer,text,uuid,text,text,timestamptz,timestamptz,uuid),public.review_response(uuid,text,text,text),public.review_fraud(uuid),public.update_participant(uuid,text,text),public.reveal_dni(uuid,text),public.save_simulation(uuid,jsonb,integer),public.reset_simulation(uuid),public.manage_profile(uuid,text,text,boolean) to authenticated;
