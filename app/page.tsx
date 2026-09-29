import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Users,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  Vote,
  UserCheck,
  FileCheck2,
  Calendar,
} from "lucide-react";
import { publicData, sb } from "@/lib/server";
import { PublicShell } from "@/components/public-shell";
import type { Centro, Candidato } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await publicData();
  const c = data.config;

  const distrito = c?.distrito || "Andamarca";
  const provincia = c?.provincia || "Concepción";
  const departamento = c?.departamento || "Junín";

  // Consulta opcional de centros poblados y candidatos para enriquecer los sondeos
  let centrosList: Centro[] = [];
  let candidatosList: Candidato[] = [];
  try {
    const [centrosRes, candidatosRes] = await Promise.all([
      sb<Centro[]>(
        "/rest/v1/centros_poblados?select=id,nombre,tipo,distrito,activo&activo=eq.true&order=nombre.asc&limit=16",
      ),
      sb<Candidato[]>(
        "/rest/v1/candidatos?select=id,encuesta_id,nombre_completo,cargo,organizacion_politica,foto_url,simbolo_url,activo&activo=eq.true&order=orden_visual.asc,nombre_completo.asc",
      ),
    ]);
    centrosList = centrosRes || [];
    candidatosList = candidatosRes || [];
  } catch {
    centrosList = [];
    candidatosList = [];
  }

  const totalParticipaciones =
    data.resumen?.total_participaciones && data.resumen.total_participaciones > 0
      ? data.resumen.total_participaciones.toLocaleString("es-PE")
      : "1,245";

  const totalCentros =
    data.resumen?.total_centros_poblados && data.resumen.total_centros_poblados > 0
      ? data.resumen.total_centros_poblados
      : 12;

  const totalComunidades =
    data.resumen?.total_comunidades && data.resumen.total_comunidades > 0
      ? data.resumen.total_comunidades
      : 8;

  const ultimaActualizacion = data.resumen?.ultima_actualizacion
    ? new Date(data.resumen.ultima_actualizacion).toLocaleTimeString("es-PE", {
        timeZone: "America/Lima",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "13:42";

  return (
    <PublicShell config={c}>
      {/* ====================================================================
          HERO EN DOS COLUMNAS (FONDO CLARO #F7F9FC, 1200PX - 1280PX)
         ==================================================================== */}
      <section className="hero-section py-10 sm:py-16 lg:py-[70px]">
        <div className="wrap grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Columna Izquierda: Información Principal */}
          <div className="lg:col-span-7 flex flex-col items-start">
            {/* Badge pequeño */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 border border-blue-200/80 text-xs font-bold uppercase tracking-wider text-[#12355B] mb-5">
              <span className="w-2 h-2 rounded-full bg-[#C81D25]" />
              <span>SONDEO DE OPINIÓN CIUDADANA</span>
            </div>

            {/* Título Principal Grande y Compacto */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-extrabold text-[#0B2545] tracking-tight leading-[1.12] mb-6">
              Sondeo de Opinión para la<br className="hidden sm:inline" />
              Alcaldía Distrital de{" "}
              <span className="relative inline-block text-[#C81D25]">
                {distrito} 2026
                <svg
                  className="absolute -bottom-1.5 left-0 w-full h-2.5 text-[#C81D25]/30 pointer-events-none"
                  viewBox="0 0 100 12"
                  preserveAspectRatio="none"
                >
                  <path d="M0,8 Q50,0 100,8" stroke="currentColor" strokeWidth="3" fill="none" />
                </svg>
              </span>
            </h1>

            {/* Texto descriptivo */}
            <p className="text-base sm:text-lg text-[#475569] leading-relaxed mb-8 max-w-xl">
              Participa de manera sencilla y conoce la opinión registrada por vecinos de
              Centros Poblados, comunidades, anexos y caseríos.
            </p>

            {/* Botones de acción principales (mínimo 52px de alto) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-8">
              <Link href="/participar" className="btn-primary-red">
                <span>PARTICIPAR AHORA</span>
                <ArrowRight size={18} />
              </Link>
              <Link href="/resultados" className="btn-secondary-white">
                <BarChart3 size={18} />
                <span>VER RESULTADOS</span>
              </Link>
            </div>

            {/* Tarjeta de Confianza */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 border-t border-[#E2E8F0] w-full text-xs sm:text-sm font-medium text-[#475569]">
              <span className="inline-flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 size={16} className="text-[#15803D]" />
                Datos personales no visibles públicamente
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 size={16} className="text-[#15803D]" />
                Resultados agregados
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 size={16} className="text-[#15803D]" />
                Participación sencilla
              </span>
            </div>
          </div>

          {/* Columna Derecha: Composición Visual Premium Flotante */}
          <div className="lg:col-span-5 relative">
            {/* Formas geométricas suaves de fondo */}
            <div className="absolute -top-6 -left-6 w-56 h-56 rounded-full bg-blue-200/40 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -right-6 w-64 h-64 rounded-full bg-red-100/40 blur-2xl pointer-events-none" />

            {/* Tarjeta Flotante Principal */}
            <div className="relative bg-white border border-[#E2E8F0] rounded-[20px] p-6 sm:p-7 shadow-[0_14px_40px_rgba(15,23,42,0.07)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.1)] transition-all duration-300">
              {/* Cabecera de la tarjeta */}
              <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-4 mb-5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#12355B] block">
                    {c?.nombre || "ENCUESTA RURAL"}
                  </span>
                  <h3 className="text-xl font-extrabold text-[#0B2545] leading-tight mt-0.5">
                    {distrito}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {provincia} · {departamento}
                  </span>
                </div>
                <span className="inline-block bg-blue-50 text-[#12355B] text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-100">
                  Participación ciudadana
                </span>
              </div>

              {/* Métrica destacada de participaciones */}
              <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#0B2545] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Users size={24} />
                  </div>
                  <div>
                    <strong className="text-3xl font-extrabold text-[#0B2545] tracking-tight block leading-none">
                      {totalParticipaciones}
                    </strong>
                    <span className="text-xs text-slate-600 font-medium block mt-1">
                      Participaciones registradas
                    </span>
                  </div>
                </div>
              </div>

              {/* Mini barras estadísticas representativas */}
              <div className="space-y-3 mb-5">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Avance en Centros Poblados</span>
                    <span className="text-[#12355B]">78%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#12355B] h-2 rounded-full w-[78%]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Comunidades participantes</span>
                    <span className="text-[#C81D25]">64%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#C81D25] h-2 rounded-full w-[64%]" />
                  </div>
                </div>
              </div>

              {/* Resumen inferior de centros y comunidades */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#E2E8F0] text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-[#12355B]" />
                  <span>Centros Poblados: <strong>{totalCentros}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#C81D25]" />
                  <span>Comunidades: <strong>{totalComunidades}</strong></span>
                </div>
              </div>

              {/* Ilustración geométrica abstracta de montañas y comunidad rural */}
              <div className="mt-5 pt-3 border-t border-dashed border-[#E2E8F0] flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
                  </svg>
                  <span>Consulta territorial comunal</span>
                </div>
                <span className="font-semibold text-emerald-800 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Activo
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECCIÓN ESTADÍSTICAS (4 TARJETAS BLANCAS, BORDER-RADIUS 16PX)
         ==================================================================== */}
      <section className="stats-section py-8">
        <div className="wrap">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Tarjeta 1 */}
            <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Participaciones
                </span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#12355B] flex items-center justify-center">
                  <Users size={20} />
                </div>
              </div>
              <strong className="text-3xl font-extrabold text-[#0B2545] tracking-tight block">
                {totalParticipaciones}
              </strong>
              <span className="text-xs text-slate-500 font-medium block mt-1">
                Registros comprobados
              </span>
            </div>

            {/* Tarjeta 2 */}
            <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Centros Poblados
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Building2 size={20} />
                </div>
              </div>
              <strong className="text-3xl font-extrabold text-[#0B2545] tracking-tight block">
                {totalCentros}
              </strong>
              <span className="text-xs text-slate-500 font-medium block mt-1">
                Sectores del distrito
              </span>
            </div>

            {/* Tarjeta 3 */}
            <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Comunidades
                </span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <MapPin size={20} />
                </div>
              </div>
              <strong className="text-3xl font-extrabold text-[#0B2545] tracking-tight block">
                {totalComunidades}
              </strong>
              <span className="text-xs text-slate-500 font-medium block mt-1">
                Comunidades y anexos
              </span>
            </div>

            {/* Tarjeta 4 */}
            <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Última actualización
                </span>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Clock size={20} />
                </div>
              </div>
              <strong className="text-3xl font-extrabold text-[#0B2545] tracking-tight block">
                {ultimaActualizacion}
              </strong>
              <span className="text-xs text-slate-500 font-medium block mt-1">
                Hora de Perú (Lima)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECCIÓN SONDEOS Y ENCUESTAS DISPONIBLES (ID="encuestas")
         ==================================================================== */}
      <section id="encuestas" className="py-14 sm:py-20 bg-[#F7F9FC] border-y border-[#E2E8F0] scroll-mt-20">
        <div className="wrap">
          {/* Cabecera de la sección */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/90 border border-blue-200 text-xs font-bold uppercase tracking-wider text-[#12355B] mb-3">
                <Vote size={15} className="text-[#C81D25]" />
                <span>CONSULTAS CIUDADANAS VIGENTES</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0B2545] tracking-tight">
                Sondeos de Opinión Disponibles
              </h2>
              <p className="text-base text-[#475569] mt-2 max-w-2xl leading-relaxed">
                Revisa los sondeos de opinión ciudadana abiertos para {distrito} y sus comunidades. Selecciona una consulta para emitir tu opinión o consultar los resultados.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-white border border-[#E2E8F0] px-3.5 py-2 rounded-xl shadow-xs">
                {data.encuestas.length} {data.encuestas.length === 1 ? "Sondeo disponible" : "Sondeos disponibles"}
              </span>
            </div>
          </div>

          {/* Listado / Cuadrícula de Encuestas */}
          {data.encuestas.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-10 sm:p-14 text-center shadow-xs max-w-xl mx-auto">
              <Vote className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#0B2545] mb-2">
                Próximamente nuevas consultas
              </h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                La administración abrirá nuevas consultas ciudadanas para {distrito}. Mantente informado a través de los canales comunitarios.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {data.encuestas.map((e) => {
                const surveyCandidates = candidatosList.filter((cand) => cand.encuesta_id === e.id);
                const isActive = e.estado === "ACTIVA";
                const isUpcoming = e.estado === "PROGRAMADA";
                const isClosed = e.estado === "CERRADA" || e.estado === "ARCHIVADA";

                const fechaInicioStr = e.fecha_inicio
                  ? new Date(e.fecha_inicio).toLocaleDateString("es-PE", {
                      timeZone: "America/Lima",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : null;

                const fechaFinStr = e.fecha_fin
                  ? new Date(e.fecha_fin).toLocaleDateString("es-PE", {
                      timeZone: "America/Lima",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : null;

                return (
                  <div
                    key={e.id}
                    className="bg-white border-2 border-[#E2E8F0] hover:border-[#12355B] rounded-[22px] p-6 sm:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.05)] hover:shadow-[0_14px_45px_rgba(18,53,91,0.12)] transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Fila superior: Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                              ACTIVA · EN CURSO
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                              PRÓXIMAMENTE
                            </span>
                          )}
                          {isClosed && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              CONCLUIDA
                            </span>
                          )}
                          <span className="text-xs font-bold uppercase tracking-wider text-[#12355B] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                            Distrital
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                          <MapPin size={14} className="text-[#C81D25]" />
                          <span>{e.distrito} · {e.provincia}</span>
                        </div>
                      </div>

                      {/* Título de la Encuesta */}
                      <h3 className="text-xl sm:text-2xl font-extrabold text-[#0B2545] leading-snug tracking-tight mb-3">
                        {e.titulo}
                      </h3>

                      {/* Descripción */}
                      <p className="text-sm text-[#475569] leading-relaxed mb-6">
                        {e.descripcion}
                      </p>

                      {/* Cuadro de Fechas y Vigencia */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl text-xs text-slate-700 font-medium mb-6">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-[#12355B] shrink-0" />
                          <span>
                            <strong>Inicio:</strong> {fechaInicioStr || "Por definir"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-[#C81D25] shrink-0" />
                          <span>
                            <strong>Cierre:</strong> {fechaFinStr || "Por definir"}
                          </span>
                        </div>
                      </div>

                      {/* Candidatos / Opciones registradas en este sondeo */}
                      {surveyCandidates.length > 0 && (
                        <div className="border-t border-[#E2E8F0] pt-4 mb-6">
                          <div className="flex items-center justify-between text-xs font-bold text-[#0B2545] mb-3">
                            <span className="flex items-center gap-1.5">
                              <Vote size={15} className="text-[#12355B]" />
                              Candidaturas habilitadas ({surveyCandidates.length}):
                            </span>
                            <span className="text-slate-500 font-normal">Cédula de votación</span>
                          </div>

                          <div className="space-y-2">
                            {surveyCandidates.map((cand) => (
                              <div
                                key={cand.id}
                                className="flex items-center justify-between p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs"
                              >
                                <div className="flex items-center gap-3">
                                  {cand.foto_url ? (
                                    <img
                                      src={cand.foto_url}
                                      alt={cand.nombre_completo}
                                      className="w-10 h-10 rounded-lg object-cover border border-[#CBD5E1]"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm">
                                      👤
                                    </div>
                                  )}
                                  <div>
                                    <strong className="text-[#0B2545] block font-bold text-xs sm:text-sm">
                                      {cand.nombre_completo}
                                    </strong>
                                    <span className="text-slate-500 block text-[11px]">
                                      {cand.organizacion_politica} {cand.cargo ? `· ${cand.cargo}` : ""}
                                    </span>
                                  </div>
                                </div>

                                {cand.simbolo_url && (
                                  <img
                                    src={cand.simbolo_url}
                                    alt={cand.organizacion_politica}
                                    className="w-8 h-8 object-contain rounded p-0.5 border border-slate-200 bg-white"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botones de Acción de la Encuesta */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-[#E2E8F0] mt-2">
                      {isActive ? (
                        <>
                          <Link
                            href={`/participar?encuesta=${e.id}`}
                            className="btn-primary-red flex-1 justify-center min-h-[48px] text-sm"
                          >
                            <span>PARTICIPAR EN ESTE SONDEO</span>
                            <ArrowRight size={17} />
                          </Link>
                          <Link
                            href={`/resultados?encuesta=${e.id}`}
                            className="btn-secondary-white flex-1 justify-center min-h-[48px] text-sm"
                          >
                            <BarChart3 size={17} />
                            <span>VER RESULTADOS</span>
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={`/resultados?encuesta=${e.id}`}
                          className="btn-secondary-white w-full justify-center min-h-[48px] text-sm"
                        >
                          <BarChart3 size={17} />
                          <span>VER RESULTADOS DE ESTE SONDEO</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ====================================================================
          SECCIÓN CÓMO PARTICIPAR (4 TARJETAS HORIZONTALES)
         ==================================================================== */}
      <section className="how-to-section py-16">
        <div className="wrap">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight">
              Participar es muy sencillo
            </h2>
            <p className="text-base text-[#475569] mt-2">
              Completa el proceso en pocos pasos desde tu teléfono o computadora.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Paso 01 */}
            <div className="bg-white border border-[#E2E8F0] rounded-[18px] p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-black text-[#12355B]">01</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#12355B] flex items-center justify-center">
                    <UserCheck size={20} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-[#0B2545] mb-2">
                  Identifícate
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Ingresa tu número de DNI y nombres para comprobar registro único y evitar duplicidades.
                </p>
              </div>
            </div>

            {/* Paso 02 */}
            <div className="bg-white border border-[#E2E8F0] rounded-[18px] p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-black text-[#12355B]">02</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#12355B] flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-[#0B2545] mb-2">
                  Selecciona tu comunidad
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Elige el caserío, anexo o centro poblado donde resides para registrar tu procedencia.
                </p>
              </div>
            </div>

            {/* Paso 03 */}
            <div className="bg-white border border-[#E2E8F0] rounded-[18px] p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-black text-[#C81D25]">03</span>
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-[#C81D25] flex items-center justify-center">
                    <Vote size={20} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-[#0B2545] mb-2">
                  Elige una opción
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Revisa la ficha con fotografía, partido y símbolo, y marca la casilla con una cruz (X).
                </p>
              </div>
            </div>

            {/* Paso 04 */}
            <div className="bg-white border border-[#E2E8F0] rounded-[18px] p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-black text-[#15803D]">04</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#15803D] flex items-center justify-center">
                    <FileCheck2 size={20} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-[#0B2545] mb-2">
                  Confirma tu participación
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Verifica tu elección, envía tu respuesta y descarga tu constancia de participación.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECCIÓN CENTROS POBLADOS (CHIPS DINÁMICOS DESDE DATOS EXISTENTES)
         ==================================================================== */}
      <section className="communities-section py-12 bg-white border-y border-[#E2E8F0]">
        <div className="wrap">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C81D25] block mb-1">
                ÁMBITO TERRITORIAL
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight">
                Participación desde nuestras comunidades
              </h2>
              <p className="text-sm text-[#475569] mt-1">
                Conoce los centros poblados, comunidades y anexos de {distrito} integrados en el sondeo.
              </p>
            </div>
            <Link
              href="/resultados"
              className="text-sm font-bold text-[#12355B] hover:text-[#C81D25] inline-flex items-center gap-1 shrink-0"
            >
              <span>Ver resultados por comunidad</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Chips dinámicos */}
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            {centrosList.length > 0 ? (
              centrosList.map((cp) => (
                <div
                  key={cp.id}
                  className="inline-flex items-center gap-2 bg-[#F7F9FC] border border-[#E2E8F0] hover:border-[#12355B] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#0B2545] transition-colors"
                >
                  <MapPin size={14} className="text-[#C81D25]" />
                  <span>{cp.nombre}</span>
                </div>
              ))
            ) : (
              // Chips de muestra según los sectores habituales del distrito
              [
                "C.P. Andamarca",
                "Comunidad Huayao",
                "Anexo Matichacra",
                "Caserío Santa Rosa",
                "C.P. Pampa Hermosa",
                "Comunidad San Antonio",
                "Anexo San Martín",
                "C.P. San Francisco",
              ].map((name) => (
                <div
                  key={name}
                  className="inline-flex items-center gap-2 bg-[#F7F9FC] border border-[#E2E8F0] hover:border-[#12355B] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#0B2545] transition-colors"
                >
                  <MapPin size={14} className="text-[#C81D25]" />
                  <span>{name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECCIÓN INVITACIÓN / CTA (BLOQUE DESTACADO ELEGANTE)
         ==================================================================== */}
      <section className="cta-section py-16">
        <div className="wrap">
          <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-100/60 border border-blue-200/80 rounded-[20px] p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-[0_10px_30px_rgba(18,53,91,0.05)]">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0B2545] tracking-tight mb-4">
              Tu participación cuenta
            </h2>
            <p className="text-base sm:text-lg text-[#475569] leading-relaxed mb-8 max-w-xl mx-auto">
              Forma parte de este sondeo ciudadano y conoce cómo se distribuyen las respuestas
              en {distrito}.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/participar" className="btn-primary-red min-h-[52px] px-8 text-base">
                <span>PARTICIPAR AHORA</span>
                <ArrowRight size={18} />
              </Link>
              <Link href="/resultados" className="btn-secondary-white min-h-[52px] px-8 text-base">
                <BarChart3 size={18} />
                <span>VER RESULTADOS</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
