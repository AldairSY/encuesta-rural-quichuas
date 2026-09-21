"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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
    [reset, setReset] = useState(false);
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
      setMessage("Simulación guardada. Los resultados reales no cambiaron.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
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
            <p className="notice">
              Estos valores se calculan exclusivamente a partir de respuestas
              válidas. No se pueden editar como porcentajes.
            </p>
            <ResultsDisplay rows={real} />
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
