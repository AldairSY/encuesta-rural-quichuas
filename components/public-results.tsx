"use client";

import { useEffect, useState } from "react";
import { Users, Building2, MapPin, Clock, RefreshCw } from "lucide-react";
import { api, peruDate, normalizedText } from "@/lib/client";
import type { Catalog, Resultado, Resumen } from "@/lib/types";
import { SelectField } from "./form-controls";
import { ResultsDisplay } from "./results-display";

interface ResultData {
  rows: Resultado[];
  summary: Resumen;
  centros: { centro_poblado_id: string; nombre: string; cantidad: number }[];
}

export function PublicResults() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [survey, setSurvey] = useState("");
  const [centro, setCentro] = useState("");
  const [data, setData] = useState<ResultData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api<Catalog>("public")
      .then((d) => {
        setCatalog(d);
        const params =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : null;
        const requested = params?.get("encuesta");
        const found = d.encuestas.find((item) => item.id === requested);
        if (found) {
          setSurvey(found.id);
        } else {
          setSurvey(
            d.encuestas.find((e) => e.estado === "ACTIVA")?.id ||
              d.encuestas[0]?.id ||
              "",
          );
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!survey) return;
    let alive = true;
    Promise.resolve().then(() => {
      if (alive) {
        setLoading(true);
        setError("");
      }
    });

    api<ResultData>(
      `results?encuesta=${survey}${centro ? `&centro=${centro}` : ""}`,
    )
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [survey, centro, refresh]);

  // Registro de herramienta para inspección o automatización
  useEffect(() => {
    const doc = document as Document & {
      modelContext?: {
        registerTool: (tool: unknown, options: { signal: AbortSignal }) => void;
      };
    };
    if (!doc.modelContext) return;
    const lifecycle = new AbortController();
    try {
      doc.modelContext.registerTool(
        {
          name: "filtrar_resultados_por_centro",
          description:
            "Selecciona un Centro Poblado y actualiza la vista de resultados reales.",
          inputSchema: {
            type: "object",
            properties: { centro_id: { type: "string" } },
            required: ["centro_id"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          execute: async (input: unknown) => {
            const v = input as { centro_id?: unknown };
            if (
              typeof v?.centro_id !== "string" ||
              (v.centro_id &&
                !catalog?.centros.some((c) => c.id === v.centro_id))
            )
              throw new Error("Centro no válido");
            if (!survey) throw new Error("No hay sondeo seleccionado");
            const result = await api<ResultData>(
              `results?encuesta=${survey}${v.centro_id ? `&centro=${v.centro_id}` : ""}`,
            );
            setCentro(v.centro_id);
            setData(result);
            return {
              total: result.rows.reduce(
                (n, r) => n + Number(r.cantidad_respuestas),
                0,
              ),
            };
          },
        },
        { signal: lifecycle.signal },
      );
    } catch {}
    return () => lifecycle.abort();
  }, [catalog, survey]);

  const e = catalog?.encuestas.find((item) => item.id === survey);
  const shownCentros =
    data?.centros.filter((c) => !centro || c.centro_poblado_id === centro) || [];

  const totalParticipacionesValidas = data?.rows.reduce(
    (acc, r) => acc + Number(r.cantidad_respuestas),
    0,
  ) ?? (data?.summary?.total_participaciones || 0);

  const totalCentrosParticipantes = shownCentros.length;
  const totalComunidadesParticipantes = catalog?.centros.length || 0;

  return (
    <div className="w-full max-w-[1040px] mx-auto pb-12">
      {/* Cabecera */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight">
          Resultados del sondeo
        </h1>
        <p className="text-base text-[#475569] mt-1">
          {e?.distrito || "Distrito"} · Consulta de respuestas agregadas
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-[#C81D25] text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Resumen Superior: 4 Tarjetas de Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Participaciones
            </span>
            <Users size={18} className="text-[#12355B]" />
          </div>
          <strong className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight block">
            {totalParticipacionesValidas.toLocaleString("es-PE")}
          </strong>
          <span className="text-xs text-slate-500 font-medium">Registradas</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Centros Poblados
            </span>
            <Building2 size={18} className="text-[#15803D]" />
          </div>
          <strong className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight block">
            {totalCentrosParticipantes}
          </strong>
          <span className="text-xs text-slate-500 font-medium">Con respuestas</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Comunidades
            </span>
            <MapPin size={18} className="text-[#C81D25]" />
          </div>
          <strong className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight block">
            {totalComunidadesParticipantes}
          </strong>
          <span className="text-xs text-slate-500 font-medium">Del distrito</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Última actualización
            </span>
            <Clock size={18} className="text-slate-500" />
          </div>
          <strong className="text-lg sm:text-xl font-bold text-[#0B2545] tracking-tight block mt-1">
            {data?.summary?.ultima_actualizacion
              ? peruDate(data.summary.ultima_actualizacion)
              : "Sin registros"}
          </strong>
          <span className="text-xs text-slate-500 font-medium">Hora de Perú</span>
        </div>
      </div>

      {/* Selector: Todos los Centros Poblados ▼ */}
      <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 sm:p-6 mb-8 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          <div className="sm:col-span-8">
            <SelectField
              id="results-centro"
              label="Filtrar por Centro Poblado o Comunidad"
              value={centro}
              onChange={setCentro}
              options={[
                { value: "", label: "Todos los Centros Poblados ▼" },
                ...(catalog?.centros || [])
                  .filter(
                    (c) =>
                      normalizedText(c.departamento) ===
                        normalizedText(e?.departamento || "") &&
                      normalizedText(c.provincia) ===
                        normalizedText(e?.provincia || "") &&
                      normalizedText(c.distrito) ===
                        normalizedText(e?.distrito || ""),
                  )
                  .map((c) => ({
                    value: c.id,
                    label: c.nombre,
                  })),
              ]}
            />
          </div>

          <div className="sm:col-span-4">
            <button
              className="btn-secondary-white w-full min-h-[48px] flex items-center justify-center gap-2"
              disabled={loading}
              onClick={() => setRefresh((v) => v + 1)}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Actualizando…" : "Actualizar"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de Resultados */}
      {loading && !data ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#12355B] mb-3" />
          <p className="text-sm font-semibold text-slate-600">Cargando resultados…</p>
        </div>
      ) : !e || !catalog?.config.mostrar_resultados || !e.mostrar_resultados ? (
        <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-8 text-center text-slate-500">
          <h3 className="text-lg font-bold text-[#0B2545] mb-2">Resultados no publicados</h3>
          <p className="text-sm">La publicación de resultados depende de la configuración establecida para este sondeo.</p>
        </div>
      ) : (
        data && (
          <div className="space-y-8">
            <ResultsDisplay rows={data.rows} />

            {/* Desglose de participación por comunidad */}
            {shownCentros.length > 0 && (
              <div className="bg-white border border-[#E2E8F0] rounded-[18px] p-6 sm:p-7 shadow-xs">
                <h3 className="text-lg font-extrabold text-[#0B2545] mb-1">
                  Participación por Centro Poblado y Comunidad
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mb-6">
                  Conteo de participaciones según el lugar de residencia declarado.
                </p>

                <div className="space-y-3">
                  {shownCentros.map((cp) => {
                    const maxCount = Math.max(
                      ...shownCentros.map((x) => Number(x.cantidad)),
                      1,
                    );
                    const pct = ((Number(cp.cantidad) / maxCount) * 100).toFixed(0);

                    return (
                      <div key={cp.centro_poblado_id} className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-800">
                          <span>{cp.nombre}</span>
                          <span className="text-[#12355B]">{cp.cantidad} votos</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-[#12355B] h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
