create function public.get_resultados_admin(p_encuesta uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 perform private.require_role(array['SUPER_ADMIN','ADMIN','SUPERVISOR','VISUALIZADOR']);
 with counts as(select c.id candidato_id,c.nombre_completo nombre_candidato,c.organizacion_politica,c.foto_url,c.simbolo_url,c.orden_visual,count(r.id) cantidad_respuestas
 from public.candidatos c left join public.respuestas r on r.candidato_id=c.id and r.encuesta_id=c.encuesta_id and r.estado='VALIDA' where c.encuesta_id=p_encuesta group by c.id),
 data as(select candidato_id,nombre_candidato,organizacion_politica,foto_url,simbolo_url,cantidad_respuestas,coalesce(round(cantidad_respuestas*100.0/nullif(sum(cantidad_respuestas) over(),0),2),0) porcentaje from counts order by cantidad_respuestas desc,orden_visual,nombre_candidato,candidato_id)
 select coalesce(jsonb_agg(data),'[]') into result from data;return result;
end$$;
revoke all on function public.get_resultados_admin(uuid) from public,anon,authenticated;
grant execute on function public.get_resultados_admin(uuid) to authenticated;
