create function public.consume_attempt(p_ip_hash text,p_device_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare hits integer;blocked boolean:=false;k text;lim integer;begin
 foreach k in array array[case when p_ip_hash is not null then 'ip:'||p_ip_hash end,case when p_device_hash is not null then 'device:'||p_device_hash end] loop
  if k is null then continue;end if;
  lim=case when k like 'ip:%' then 120 else 12 end;
  insert into private.rate_windows(key,ventana,intentos) values(k,date_trunc('minute',now()),1)
   on conflict(key,ventana) do update set intentos=private.rate_windows.intentos+1 returning intentos into hits;
  if hits>lim then blocked=true;end if;
 end loop;
 if blocked then insert into public.fraud_events(tipo,ip_hash,device_hash,nivel_riesgo,descripcion) values('RATE_LIMIT',p_ip_hash,p_device_hash,'ALTO','Exceso de solicitudes por minuto.');end if;
 delete from private.rate_windows where ventana<now()-interval '2 days';
 return not blocked;
end$$;

create function public.registrar_participacion(p_dni text,p_nombres text,p_apellido_paterno text,p_apellido_materno text,p_centro_poblado_id uuid,p_encuesta_id uuid,p_candidato_id uuid,p_ip_hash text,p_device_hash text,p_session_id uuid,p_user_agent text,p_privacidad_version text,p_acepta_privacidad boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.encuestas%rowtype;cp public.centros_poblados%rowtype;existing uuid;pid uuid;rid uuid;full_name text;norm text;score integer:=0;same_name boolean;ip_count integer;device_count integer;privacy text;
begin
 if p_dni is null or p_dni !~ '^[0-9]{8}$' then return jsonb_build_object('ok',false,'code','DNI_INVALIDO');end if;
 if p_nombres is null or length(trim(p_nombres)) not between 2 and 100 or p_apellido_paterno is null or length(trim(p_apellido_paterno)) not between 2 and 100
  or (nullif(trim(p_apellido_materno),'') is not null and length(trim(p_apellido_materno)) not between 2 and 100) then return jsonb_build_object('ok',false,'code','NOMBRE_INVALIDO');end if;
 if not coalesce(p_acepta_privacidad,false) then return jsonb_build_object('ok',false,'code','PRIVACIDAD');end if;
 select privacidad_version into privacy from public.configuracion where id=1;
 if p_privacidad_version is distinct from privacy then return jsonb_build_object('ok',false,'code','PRIVACIDAD_ACTUALIZADA');end if;
 -- Share locks serialize publication changes against the entire registration.
 select * into e from public.encuestas where id=p_encuesta_id for share;
 if not found or e.estado<>'ACTIVA' or now()<e.fecha_inicio or now()>=e.fecha_fin then return jsonb_build_object('ok',false,'code','ENCUESTA_CERRADA');end if;
 select * into cp from public.centros_poblados where id=p_centro_poblado_id and activo for share;
 if not found or public.normalizar_nombre(cp.departamento)<>public.normalizar_nombre(e.departamento) or public.normalizar_nombre(cp.provincia)<>public.normalizar_nombre(e.provincia) or public.normalizar_nombre(cp.distrito)<>public.normalizar_nombre(e.distrito) then return jsonb_build_object('ok',false,'code','CENTRO_INVALIDO');end if;
 perform 1 from public.candidatos where id=p_candidato_id and encuesta_id=e.id and activo for share;
 if not found then return jsonb_build_object('ok',false,'code','CANDIDATO_INVALIDO');end if;
 full_name=regexp_replace(trim(concat_ws(' ',trim(p_nombres),trim(p_apellido_paterno),nullif(trim(p_apellido_materno),''))),'\s+',' ','g');
 norm=public.normalizar_nombre(full_name);
 -- The shared name lock also makes concurrent homonym detection deterministic.
 perform pg_advisory_xact_lock(hashtextextended('nombre:'||norm,0));
 perform pg_advisory_xact_lock(hashtextextended('dni:'||p_dni,0));
 select id into existing from public.participantes where dni=p_dni;
 if existing is not null then
  insert into public.fraud_events(tipo,participante_id,encuesta_id,ip_hash,device_hash,descripcion,nivel_riesgo)
  values(case when exists(select 1 from public.respuestas where encuesta_id=e.id and participante_id=existing) then 'RESPUESTA_DUPLICADA' else 'DNI_DUPLICADO' end,existing,e.id,p_ip_hash,p_device_hash,'Intento de registro duplicado.','MEDIO');
  return jsonb_build_object('ok',false,'code','DNI_DUPLICADO');
 end if;
 select exists(select 1 from public.participantes where nombre_normalizado=norm) into same_name;
 select count(*) into ip_count from public.participantes where ip_hash=p_ip_hash and fecha_registro>now()-interval '1 hour';
 select count(*) into device_count from public.participantes where device_hash=p_device_hash and fecha_registro>now()-interval '1 hour';
 score=(case when same_name then 25 else 0 end)+(case when ip_count>=30 then 15 else 0 end)+(case when device_count>=3 then 35 else 0 end);
 begin
 insert into public.participantes(dni,nombres,apellido_paterno,apellido_materno,nombre_completo,nombre_normalizado,centro_poblado_id,ip_hash,device_hash,session_id,user_agent_resumido,fraud_score,requiere_revision,privacidad_version)
 values(p_dni,trim(p_nombres),trim(p_apellido_paterno),nullif(trim(p_apellido_materno),''),full_name,norm,cp.id,p_ip_hash,p_device_hash,p_session_id,left(p_user_agent,180),score,score>0,privacy) returning id into pid;
 insert into public.respuestas(encuesta_id,participante_id,candidato_id,centro_poblado_id,ip_hash,device_hash,fraud_score,requiere_revision,estado)
 values(e.id,pid,p_candidato_id,cp.id,p_ip_hash,p_device_hash,score,score>0,case when score>=50 then 'EN_REVISION' else 'VALIDA' end) returning id into rid;
 exception when unique_violation then
  insert into public.fraud_events(tipo,encuesta_id,ip_hash,device_hash,descripcion,nivel_riesgo) values('DNI_DUPLICADO',e.id,p_ip_hash,p_device_hash,'Colisión de registro simultáneo.','MEDIO');
  return jsonb_build_object('ok',false,'code','DNI_DUPLICADO');
 end;
 if same_name then insert into public.fraud_events(tipo,participante_id,encuesta_id,ip_hash,device_hash,descripcion,nivel_riesgo) values('NOMBRE_COINCIDENTE',pid,e.id,p_ip_hash,p_device_hash,'Nombre coincidente con DNI diferente; requiere revisión humana.','MEDIO');end if;
 if ip_count>=30 then insert into public.fraud_events(tipo,participante_id,encuesta_id,ip_hash,device_hash,descripcion,nivel_riesgo) values('MULTIPLES_REGISTROS_IP',pid,e.id,p_ip_hash,p_device_hash,'Varias personas comparten conexión. No implica duplicidad.','BAJO');end if;
 if device_count>=3 then insert into public.fraud_events(tipo,participante_id,encuesta_id,ip_hash,device_hash,descripcion,nivel_riesgo) values('MULTIPLES_REGISTROS_DISPOSITIVO',pid,e.id,p_ip_hash,p_device_hash,'Varios registros desde un dispositivo.','ALTO');end if;
 return jsonb_build_object('ok',true);
end$$;
revoke all on function public.consume_attempt(text,text) from public,anon,authenticated;
revoke all on function public.registrar_participacion(text,text,text,text,uuid,uuid,uuid,text,text,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.consume_attempt(text,text),public.registrar_participacion(text,text,text,text,uuid,uuid,uuid,text,text,uuid,text,text,boolean) to service_role;

create function private.results_visible(eid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select e.mostrar_resultados and c.mostrar_resultados and e.estado in ('ACTIVA','CERRADA') from public.encuestas e cross join public.configuracion c where e.id=eid and c.id=1),false)
$$;
create function public.get_resultados_por_centro(encuesta_uuid uuid,centro_poblado_uuid uuid default null)
returns table(candidato_id uuid,nombre_candidato text,organizacion_politica text,foto_url text,simbolo_url text,cantidad_respuestas bigint,porcentaje numeric)
language sql stable security definer set search_path='' as $$
 with counts as (
 select c.id,c.nombre_completo,c.organizacion_politica,c.foto_url,c.simbolo_url,c.orden_visual,count(r.id) as cantidad
 from public.candidatos c left join public.respuestas r on r.candidato_id=c.id and r.encuesta_id=c.encuesta_id and r.estado='VALIDA' and (centro_poblado_uuid is null or r.centro_poblado_id=centro_poblado_uuid)
 where c.encuesta_id=encuesta_uuid and private.results_visible(encuesta_uuid) group by c.id
 ) select id,nombre_completo,organizacion_politica,foto_url,simbolo_url,cantidad,coalesce(round(cantidad*100.0/nullif(sum(cantidad) over(),0),2),0.00)
 from counts order by cantidad desc,orden_visual,nombre_completo,id
$$;
create function public.get_resultados_publicos(encuesta_uuid uuid) returns table(candidato_id uuid,nombre_candidato text,organizacion_politica text,foto_url text,simbolo_url text,cantidad_respuestas bigint,porcentaje numeric)
language sql stable security definer set search_path='' as $$select * from public.get_resultados_por_centro(encuesta_uuid,null)$$;
create function public.get_resumen_publico(encuesta_uuid uuid default null) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('total_participaciones',case when private.results_visible(encuesta_uuid) then (select count(*) from public.respuestas where encuesta_id=encuesta_uuid and estado='VALIDA') else null end,
 'total_centros_poblados',(select count(*) from public.centros_poblados where activo and tipo='CENTRO_POBLADO'),
 'total_comunidades',(select count(*) from public.centros_poblados where activo and tipo='COMUNIDAD'),
 'ultima_actualizacion',case when private.results_visible(encuesta_uuid) then (select max(updated_at) from public.respuestas where encuesta_id=encuesta_uuid) else null end)
$$;
create function public.get_participacion_centros(encuesta_uuid uuid) returns table(centro_poblado_id uuid,nombre text,cantidad bigint) language sql stable security definer set search_path='' as $$
 select c.id,c.nombre,count(r.id) from public.centros_poblados c join public.respuestas r on r.centro_poblado_id=c.id
 where r.encuesta_id=encuesta_uuid and r.estado='VALIDA' and private.results_visible(encuesta_uuid) group by c.id order by count(r.id) desc,c.nombre
$$;
revoke all on function private.results_visible(uuid) from public,anon,authenticated;
revoke all on function public.get_resultados_por_centro(uuid,uuid),public.get_resultados_publicos(uuid),public.get_resumen_publico(uuid),public.get_participacion_centros(uuid) from public;
grant execute on function public.get_resultados_por_centro(uuid,uuid),public.get_resultados_publicos(uuid),public.get_resumen_publico(uuid),public.get_participacion_centros(uuid) to anon,authenticated;
alter function private.normalizar_centro() security definer;
