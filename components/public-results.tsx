"use client";
import { useEffect, useState } from "react";
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
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [survey, setSurvey] = useState(""),
    [centro, setCentro] = useState(""),
    [data, setData] = useState<ResultData | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    api<Catalog>("public")
      .then((d) => {
        setCatalog(d);
        setSurvey(
          d.encuestas.find((e) => e.estado === "ACTIVA")?.id ||
            d.encuestas[0]?.id ||
            "",
        );
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
  const e = catalog?.encuestas.find((e) => e.id === survey);
  const shownCentros =
    data?.centros.filter((c) => !centro || c.centro_poblado_id === centro) ||
    [];
  return (
    <div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="filter-bar">
        <SelectField
          id="results-survey"
          label="Sondeo"
          value={survey}
          onChange={(v) => {
            setSurvey(v);
            setCentro("");
          }}
          options={[
            { value: "", label: "Selecciona un sondeo" },
            ...(catalog?.encuestas || []).map((e) => ({
              value: e.id,
              label: e.titulo,
            })),
          ]}
        />
        <SelectField
          id="results-centro"
          label="Centro Poblado / Comunidad"
          value={centro}
          onChange={setCentro}
          options={[
            { value: "", label: "Todos" },
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
              .map((c) => ({ value: c.id, label: c.nombre })),
          ]}
        />
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => setRefresh((v) => v + 1)}
        >
          Actualizar
        </button>
      </div>
      {loading ? (
        <p role="status">Actualizando resultados…</p>
      ) : !e || !catalog?.config.mostrar_resultados || !e.mostrar_resultados ? (
        <div className="empty">
          <h2>Resultados no publicados</h2>
          <p>
            La publicación de resultados depende de la configuración del sondeo.
          </p>
        </div>
      ) : (
        data && (
          <>
            <ResultsDisplay rows={data.rows} />
            <p className="results-date">
              {shownCentros.length} comunidades participantes · Última
              actualización: {peruDate(data.summary.ultima_actualizacion)}
            </p>
            {shownCentros.length > 0 && (
              <section className="panel">
                <h2 className="section-title">Participación por comunidad</h2>
                {shownCentros.map((c) => (
                  <div key={c.centro_poblado_id} className="community-bar">
                    <span>{c.nombre}</span>
                    <meter
                      min={0}
                      max={Math.max(
                        ...shownCentros.map((x) => Number(x.cantidad)),
                        1,
                      )}
                      value={Number(c.cantidad)}
                    />
                    <strong>{c.cantidad}</strong>
                  </div>
                ))}
              </section>
            )}
          </>
        )
      )}
    </div>
  );
}
