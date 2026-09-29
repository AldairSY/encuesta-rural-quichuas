"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { SelectField } from "@/components/form-controls";
import { ResultsDisplay } from "@/components/results-display";
import type { Catalog, Profile, Resultado } from "@/lib/types";
import { api, normalizePercentages } from "@/lib/client";
interface SimRow {
  candidato_id: string;
  porcentaje: number;
  cantidad_simulada: number;
  total_simulado: number;
}
export function AdminResults({
  catalog,
  profile,
  previewOnly = false,
}: {
  catalog: Catalog;
  profile: Profile;
  previewOnly?: boolean;
}) {
  const [survey, setSurvey] = useState(catalog.encuestas[0]?.id || ""),
    [real, setReal] = useState<Resultado[]>([]),
    [values, setValues] = useState<Record<string, number>>({}),
    [total, setTotal] = useState(1500),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [reset, setReset] = useState(false),
    [showEditor, setShowEditor] = useState(false);
  const candidates = catalog.candidatos.filter((c) => c.encuesta_id === survey),
    editable = ["SUPER_ADMIN", "ADMIN"].includes(profile.rol);
  useEffect(() => {
    if (!survey) return;
    let alive = true;
    Promise.all([
      api<Resultado[]>(`admin/results?encuesta=${survey}`),
      api<SimRow[]>(`admin/simulation?encuesta=${survey}`),
    ])
      .then(([r, s]) => {
        if (alive) {
          setReal(r);
          setValues(
            Object.fromEntries(
              s.map((x) => [x.candidato_id, Number(x.porcentaje)]),
            ),
          );
          setTotal(s[0]?.total_simulado ?? 1500);
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [survey]);
  const sum =
    Math.round(candidates.reduce((n, c) => n + (values[c.id] || 0), 0) * 100) /
    100;
  const simulated: Resultado[] = candidates
    .map((c) => ({
      candidato_id: c.id,
      nombre_candidato: c.nombre_completo,
      organizacion_politica: c.organizacion_politica,
      foto_url: c.foto_url,
      simbolo_url: c.simbolo_url,
      cantidad_respuestas: Math.round(((values[c.id] || 0) * total) / 100),
      porcentaje: values[c.id] || 0,
    }))
    .sort(
      (a, b) =>
        b.porcentaje - a.porcentaje ||
        a.nombre_candidato.localeCompare(b.nombre_candidato),
    );
  function preset(kind: string) {
    const raw = candidates.map((_, i) =>
      kind === "EMPATE"
        ? 1
        : kind === "CERRADO"
          ? i < 2
            ? 49
            : 2 / Math.max(candidates.length - 2, 1)
          : kind === "AMPLIO"
            ? i === 0
              ? 80
              : 20 / Math.max(candidates.length - 1, 1)
            : (crypto.getRandomValues(new Uint32Array(1))[0] % 1000) + 1,
    );
    const normalized = normalizePercentages(raw);
    setValues(
      Object.fromEntries(candidates.map((c, i) => [c.id, normalized[i]])),
    );
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await api("admin/simulation", {
        encuesta: survey,
        total,
        valores: candidates.map((c) => ({
          candidato_id: c.id,
          porcentaje: values[c.id] || 0,
        })),
      });
      setMessage("Resultados guardados y actualizados correctamente.");
      setShowEditor(false);
      const [r, s] = await Promise.all([
        api<Resultado[]>(`admin/results?encuesta=${survey}`),
        api<SimRow[]>(`admin/simulation?encuesta=${survey}`),
      ]);
      setReal(r);
      if (s && s.length) {
        setValues(
          Object.fromEntries(
            s.map((x) => [x.candidato_id, Number(x.porcentaje)]),
          ),
        );
        setTotal(s[0]?.total_simulado ?? 1500);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  const hasRealVotes = real.some((r) => Number(r.cantidad_respuestas) > 0);
  const displayRows = hasRealVotes ? real : simulated;
  return (
    <>
      <SelectField
        id="admin-results-survey"
        label="Encuesta"
        value={survey}
        onChange={(v) => {
          setSurvey(v);
          setMessage("");
        }}
        options={[
          { value: "", label: "Seleccionar" },
          ...catalog.encuestas.map((e) => ({ value: e.id, label: e.titulo })),
        ]}
      />
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {!survey ? (
        <div className="empty">
          <h2>Crea una encuesta para comenzar</h2>
        </div>
      ) : previewOnly ? (
        <>
          <ResultsDisplay rows={simulated} simulation />
          <Link href="/admin/resultados" className="button secondary">
            Volver al editor
          </Link>
        </>
      ) : (
        <Tabs defaultValue="real">
          <TabsList>
            <TabsTrigger value="real">Resultados reales</TabsTrigger>
            <TabsTrigger value="simulation">Modo prueba</TabsTrigger>
          </TabsList>
          <TabsContent value="real">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
              <div>
                <h3 className="font-bold text-[#0B2545] text-base">
                  Resultados del Sondeo
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {hasRealVotes
                    ? "Calculado a partir de respuestas válidas de los participantes."
                    : "Mostrando los resultados configurados para este sondeo."}
                </p>
              </div>
              {editable && (
                <button
                  type="button"
                  className={
                    showEditor
                      ? "btn-secondary-white min-h-[44px] text-xs font-bold px-4 py-2 flex items-center gap-1.5"
                      : "btn-primary-red min-h-[44px] text-xs font-bold px-4 py-2 flex items-center gap-1.5"
                  }
                  onClick={() => setShowEditor(!showEditor)}
                >
                  <Pencil size={15} />
                  <span>{showEditor ? "Cerrar editor" : "Modificar resultados"}</span>
                </button>
              )}
            </div>

            {showEditor && editable && (
              <div className="mb-6 p-5 sm:p-6 bg-slate-50 border-2 border-[#12355B]/20 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                  <h4 className="font-extrabold text-[#0B2545] text-sm uppercase tracking-wide">
                    Editor de Resultados y Porcentajes
                  </h4>
                  <span className="text-xs font-semibold text-slate-500">
                    Encuesta: {catalog.encuestas.find((e) => e.id === survey)?.titulo}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="field">
                    <label htmlFor="edit-total-real">
                      Total general de participantes
                    </label>
                    <input
                      id="edit-total-real"
                      type="number"
                      min={0}
                      max={10000000}
                      step={1}
                      value={total}
                      disabled={busy}
                      onChange={(e) =>
                        setTotal(
                          Math.max(
                            0,
                            Math.min(10000000, Number(e.target.value)),
                          ),
                        )
                      }
                    />
                    <small className="text-slate-500">
                      Número total de votos sobre el cual se calculan los porcentajes.
                    </small>
                  </div>

                  <div className="flex flex-col justify-end">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <button
                        type="button"
                        className="button secondary text-xs py-2 px-3"
                        disabled={busy}
                        onClick={() => {
                          const v = normalizePercentages(
                            candidates.map((c) => values[c.id] || 0),
                          );
                          setValues(
                            Object.fromEntries(
                              candidates.map((c, i) => [c.id, v[i]]),
                            ),
                          );
                        }}
                      >
                        Normalizar a 100%
                      </button>
                      {[
                        ["EMPATE", "Empate"],
                        ["CERRADO", "Cerrado"],
                        ["AMPLIO", "Amplio"],
                        ["ALEATORIO", "Aleatorio"],
                      ].map(([kind, label]) => (
                        <button
                          key={kind}
                          type="button"
                          className="preset text-xs py-1.5 px-2.5"
                          onClick={() => preset(kind)}
                          disabled={busy}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {candidates.map((c) => {
                    const pct = values[c.id] ?? 0;
                    const votes = Math.round((pct * total) / 100);
                    return (
                      <div
                        key={c.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {c.foto_url && (
                            <img
                              src={c.foto_url}
                              alt=""
                              className="w-10 h-10 rounded-lg object-contain bg-slate-100 border border-slate-200 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-[#0B2545] truncate block">
                              {c.nombre_completo}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate block">
                              {c.organizacion_politica} · ~{votes.toLocaleString("es-PE")} votos
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            value={pct}
                            disabled={busy}
                            className="w-20 text-right text-xs font-bold border border-slate-300 rounded-lg py-1.5 px-2"
                            onChange={(e) =>
                              setValues({
                                ...values,
                                [c.id]:
                                  Math.round(
                                    Math.max(
                                      0,
                                      Math.min(100, Number(e.target.value)),
                                    ) * 100,
                                  ) / 100,
                              })
                            }
                          />
                          <span className="text-xs font-bold text-slate-500">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200">
                  <span
                    className={`text-xs font-bold ${
                      sum === 100 ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    Suma total: {sum.toFixed(2)}% {sum === 100 ? "✓ (Válido)" : "⚠️ Debe sumar exactamente 100%"}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="button secondary text-xs py-2 px-4"
                      disabled={busy}
                      onClick={() => setShowEditor(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="button text-xs py-2 px-5"
                      disabled={busy || sum !== 100}
                      onClick={save}
                    >
                      {busy ? "Guardando…" : "Guardar y publicar resultados"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <ResultsDisplay rows={displayRows} />
          </TabsContent>
          <TabsContent value="simulation">
            <div className="simulation-banner">
              ⚠ MODO PRUEBA / SIMULACIÓN
              <br />
              <small>LOS DATOS MOSTRADOS SON FICTICIOS.</small>
            </div>
            {!candidates.length ? (
              <div className="empty">
                <h2>No hay candidatos cargados</h2>
                <p>
                  Agrega candidatos a esta encuesta para probar la distribución.
                </p>
              </div>
            ) : (
              <div className="simulation-grid">
                <section className="panel">
                  <div className="field">
                    <label htmlFor="sim-total">
                      Total de participantes simulados
                    </label>
                    <input
                      id="sim-total"
                      type="number"
                      min={0}
                      max={10000000}
                      step={1}
                      value={total}
                      disabled={!editable || busy}
                      onChange={(e) =>
                        setTotal(
                          Math.max(
                            0,
                            Math.min(10000000, Number(e.target.value)),
                          ),
                        )
                      }
                    />
                  </div>
                  {candidates.map((c) => (
                    <div className="field" key={c.id}>
                      <label htmlFor={`sim-${c.id}`}>
                        {c.nombre_completo} · %
                      </label>
                      <input
                        id={`sim-${c.id}`}
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={values[c.id] ?? 0}
                        disabled={!editable || busy}
                        onChange={(e) =>
                          setValues({
                            ...values,
                            [c.id]:
                              Math.round(
                                Math.max(
                                  0,
                                  Math.min(100, Number(e.target.value)),
                                ) * 100,
                              ) / 100,
                          })
                        }
                      />
                    </div>
                  ))}
                  <p className={sum === 100 ? "notice success" : "notice"}>
                    TOTAL = {sum.toFixed(2)}%
                    {sum !== 100 && (
                      <>
                        <br />
                        Los porcentajes simulados no suman 100%.
                      </>
                    )}
                  </p>
                  {editable && (
                    <>
                      <div className="actions">
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() => {
                            const v = normalizePercentages(
                              candidates.map((c) => values[c.id] || 0),
                            );
                            setValues(
                              Object.fromEntries(
                                candidates.map((c, i) => [c.id, v[i]]),
                              ),
                            );
                          }}
                        >
                          Normalizar a 100%
                        </button>
                        {[
                          ["EMPATE", "Empate"],
                          ["CERRADO", "Resultado cerrado"],
                          ["AMPLIO", "Diferencia amplia"],
                          ["ALEATORIO", "Aleatorio"],
                        ].map(([kind, label]) => (
                          <button
                            key={kind}
                            className="preset"
                            onClick={() => preset(kind)}
                            disabled={busy}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="actions">
                        <button
                          className="button"
                          disabled={busy || sum !== 100}
                          onClick={save}
                        >
                          {busy ? "Guardando…" : "Aplicar simulación"}
                        </button>
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() => setReset(true)}
                        >
                          Restablecer
                        </button>
                      </div>
                    </>
                  )}
                  <p className="muted">
                    La vista previa se actualiza al editar. Guarda para abrir la
                    versión persistida.
                  </p>
                  <Link
                    className="inline-link"
                    href="/admin/resultados/preview"
                  >
                    Abrir vista previa guardada
                  </Link>
                </section>
                <ResultsDisplay rows={simulated} simulation />
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
      <AlertDialog open={reset} onOpenChange={setReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restablecer la simulación</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán los valores ficticios de esta encuesta. Las respuestas
              y resultados reales permanecerán intactos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await api("admin/simulation-reset", { encuesta: survey });
                  setValues({});
                  setMessage(
                    "Simulación restablecida. Los resultados reales no cambiaron.",
                  );
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "No se pudo restablecer.",
                  );
                }
              }}
            >
              Restablecer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
