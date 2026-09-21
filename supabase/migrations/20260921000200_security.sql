create function private.role() returns text language sql stable security definer set search_path='' as $$
 select rol from public.profiles where id=(select auth.uid()) and activo
$$;
grant usage on schema private to authenticated, anon;
revoke all on all tables in schema private from public,anon,authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.role() to authenticated,anon;
create function public.normalizar_nombre(value text) returns text language sql immutable set search_path='' as $$
 select upper(extensions.unaccent(regexp_replace(trim(value),'\s+',' ','g')))
$$;
create function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end$$;
create function private.normalizar_centro() returns trigger language plpgsql set search_path='' as $$begin new.nombre_normalizado=public.normalizar_nombre(new.nombre);return new;end$$;
create trigger normalizar_centro before insert or update on public.centros_poblados for each row execute function private.normalizar_centro();
do $$ declare t text; begin foreach t in array array['configuracion','centros_poblados','encuestas','candidatos','participantes','respuestas','resultado_simulacion'] loop
 execute format('create trigger updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
end loop;end$$;

revoke all on public.participantes,public.respuestas,public.fraud_events,public.audit_logs,public.resultado_simulacion,public.profiles from anon,authenticated;
revoke all on public.configuracion,public.encuestas,public.candidatos,public.centros_poblados from anon,authenticated;
grant select on public.configuracion,public.encuestas,public.candidatos,public.centros_poblados to anon,authenticated;
grant insert,update on public.encuestas,public.candidatos,public.centros_poblados to authenticated;
grant update on public.configuracion to authenticated;
grant select on public.profiles,public.resultado_simulacion,public.audit_logs to authenticated;

create policy config_read on public.configuracion for select to anon,authenticated using(true);
create policy config_write on public.configuracion for update to authenticated using((select private.role())='SUPER_ADMIN') with check((select private.role())='SUPER_ADMIN');
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select private.role())='SUPER_ADMIN');
create policy survey_read on public.encuestas for select to anon,authenticated using(estado in ('PROGRAMADA','ACTIVA','CERRADA') or (select private.role()) is not null);
create policy survey_insert on public.encuestas for insert to authenticated with check((select private.role()) in ('SUPER_ADMIN','ADMIN'));
create policy survey_update on public.encuestas for update to authenticated using((select private.role()) in ('SUPER_ADMIN','ADMIN')) with check((select private.role()) in ('SUPER_ADMIN','ADMIN'));
create policy centro_read on public.centros_poblados for select to anon,authenticated using(activo or (select private.role()) is not null);
create policy centro_insert on public.centros_poblados for insert to authenticated with check((select private.role()) in ('SUPER_ADMIN','ADMIN'));
create policy centro_update on public.centros_poblados for update to authenticated using((select private.role()) in ('SUPER_ADMIN','ADMIN')) with check((select private.role()) in ('SUPER_ADMIN','ADMIN'));
create policy candidato_read on public.candidatos for select to anon,authenticated using((activo and exists(select 1 from public.encuestas e where e.id=encuesta_id and e.estado in ('PROGRAMADA','ACTIVA','CERRADA'))) or (select private.role()) is not null);
create policy candidato_insert on public.candidatos for insert to authenticated with check((select private.role()) in ('SUPER_ADMIN','ADMIN'));
create policy candidato_update on public.candidatos for update to authenticated using((select private.role()) in ('SUPER_ADMIN','ADMIN')) with check((select private.role()) in ('SUPER_ADMIN','ADMIN'));
create policy simulation_read on public.resultado_simulacion for select to authenticated using((select private.role()) is not null);
create policy audit_read on public.audit_logs for select to authenticated using((select private.role()) is not null);
-- Sensitive tables deliberately have no direct read/write policies or grants.

create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare before_data jsonb;after_data jsonb;entity uuid;begin
 before_data=case when tg_op='INSERT' then null else to_jsonb(old) end;
 after_data=case when tg_op='DELETE' then null else to_jsonb(new) end;
 if tg_table_name='respuestas' then
  before_data=before_data - array['ip_hash','device_hash']; after_data=after_data - array['ip_hash','device_hash'];
 end if;
 if tg_table_name<>'configuracion' then entity=coalesce(after_data->>'id',before_data->>'id')::uuid;end if;
 insert into public.audit_logs(user_id,accion,entidad,entidad_id,datos_anteriores,datos_nuevos)
 values(auth.uid(),tg_op,tg_table_name,entity,before_data,after_data);
 return coalesce(new,old);
end$$;
do $$declare t text;begin foreach t in array array['configuracion','encuestas','candidatos','centros_poblados','profiles','resultado_simulacion'] loop
 execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',t);
end loop;end$$;
create trigger audit_response_change after update on public.respuestas for each row execute function private.audit_change();

create function public.claim_admin_enrollment() returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); matched text;begin
 if uid is null then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 select encode(extensions.digest(lower(trim(email)),'sha256'),'hex') into matched from auth.users where id=uid and email_confirmed_at is not null;
 perform 1 from private.admin_enrollment where email_hash=matched and claimed_by is null for update;
 if not found then return false;end if;
 insert into public.profiles(id,nombre,rol) values(uid,'Administrador principal','SUPER_ADMIN') on conflict(id) do nothing;
 update private.admin_enrollment set claimed_by=uid where email_hash=matched;
 return true;
end$$;
revoke all on all functions in schema public from public,anon,authenticated;
grant execute on function public.claim_admin_enrollment() to authenticated;
