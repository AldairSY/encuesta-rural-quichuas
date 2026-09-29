-- Migración para reflejar automáticamente los resultados simulados/modo prueba en la vista pública
-- cuando aún no existan votos reales registrados.

create or replace function public.get_resultados_por_centro(encuesta_uuid uuid, centro_poblado_uuid uuid default null)
returns table(candidato_id uuid, nombre_candidato text, organizacion_politica text, foto_url text, simbolo_url text, cantidad_respuestas bigint, porcentaje numeric)
language plpgsql stable security definer set search_path='' as $$
declare
  v_total_real bigint;
  v_total_sim bigint;
begin
  if not private.results_visible(encuesta_uuid) then
    return;
  end if;

  -- Contar votos reales
  select count(r.id) into v_total_real
  from public.respuestas r
  where r.encuesta_id = encuesta_uuid
    and r.estado = 'VALIDA'
    and (centro_poblado_uuid is null or r.centro_poblado_id = centro_poblado_uuid);

  -- Si hay votos reales en la base de datos, mostrar los resultados reales
  if v_total_real > 0 then
    return query
    with counts as (
      select c.id, c.nombre_completo, c.organizacion_politica, c.foto_url, c.simbolo_url, c.orden_visual, count(r.id) as cantidad
      from public.candidatos c
      left join public.respuestas r on r.candidato_id = c.id
        and r.encuesta_id = c.encuesta_id
        and r.estado = 'VALIDA'
        and (centro_poblado_uuid is null or r.centro_poblado_id = centro_poblado_uuid)
      where c.encuesta_id = encuesta_uuid
      group by c.id
    )
    select counts.id, counts.nombre_completo, counts.organizacion_politica, counts.foto_url, counts.simbolo_url, counts.cantidad,
      coalesce(round(counts.cantidad * 100.0 / nullif(sum(counts.cantidad) over(), 0), 2), 0.00)
    from counts
    order by counts.cantidad desc, counts.orden_visual, counts.nombre_completo, counts.id;
    return;
  end if;

  -- Si no hay votos reales pero hay simulación configurada (y no estamos filtrando por un centro poblado específico):
  if centro_poblado_uuid is null then
    select coalesce(max(s.total_simulado), 0) into v_total_sim
    from public.resultado_simulacion s
    where s.encuesta_id = encuesta_uuid;

    if v_total_sim > 0 then
      return query
      select c.id, c.nombre_completo, c.organizacion_politica, c.foto_url, c.simbolo_url,
        coalesce(s.cantidad_simulada, 0)::bigint as cantidad,
        coalesce(s.porcentaje, 0.00)::numeric as porcentaje
      from public.candidatos c
      left join public.resultado_simulacion s on s.candidato_id = c.id and s.encuesta_id = c.encuesta_id
      where c.encuesta_id = encuesta_uuid
      order by coalesce(s.porcentaje, 0) desc, c.orden_visual, c.nombre_completo, c.id;
      return;
    end if;
  end if;

  -- Caso base sin votos ni simulación: todos los candidatos en 0
  return query
  select c.id, c.nombre_completo, c.organizacion_politica, c.foto_url, c.simbolo_url,
    0::bigint as cantidad,
    0.00::numeric as porcentaje
  from public.candidatos c
  where c.encuesta_id = encuesta_uuid
  order by c.orden_visual, c.nombre_completo, c.id;
end$$;

create or replace function public.get_resumen_publico(encuesta_uuid uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_total bigint;
  v_simulado bigint;
  v_ultima timestamptz;
begin
  if not private.results_visible(encuesta_uuid) then
    return jsonb_build_object(
      'total_participaciones', null,
      'total_centros_poblados', (select count(*) from public.centros_poblados where activo and tipo='CENTRO_POBLADO'),
      'total_comunidades', (select count(*) from public.centros_poblados where activo and tipo='COMUNIDAD'),
      'ultima_actualizacion', null
    );
  end if;

  select count(*), max(updated_at) into v_total, v_ultima
  from public.respuestas
  where encuesta_id = encuesta_uuid and estado = 'VALIDA';

  if v_total = 0 then
    select coalesce(max(total_simulado), 0) into v_simulado
    from public.resultado_simulacion
    where encuesta_id = encuesta_uuid;

    if v_simulado > 0 then
      v_total := v_simulado;
    end if;
  end if;

  return jsonb_build_object(
    'total_participaciones', v_total,
    'total_centros_poblados', (select count(*) from public.centros_poblados where activo and tipo='CENTRO_POBLADO'),
    'total_comunidades', (select count(*) from public.centros_poblados where activo and tipo='COMUNIDAD'),
    'ultima_actualizacion', v_ultima
  );
end$$;

grant select on public.resultado_simulacion to anon, authenticated;
drop policy if exists simulation_read_anon on public.resultado_simulacion;
create policy simulation_read_anon on public.resultado_simulacion for select to anon using (true);
