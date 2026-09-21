"use client";
import { Progress } from "@/components/ui/progress";
import { UserRound } from "lucide-react";
import type { Resultado } from "@/lib/types";
export function ResultsDisplay({
  rows,
  simulation = false,
}: {
  rows: Resultado[];
  simulation?: boolean;
}) {
  const total = rows.reduce((n, r) => n + Number(r.cantidad_respuestas), 0);
  return (
    <div>
      {simulation && (
        <div className="simulation-banner" role="status">
          ⚠ SIMULACIÓN — DATOS FICTICIOS
          <br />
          <small>Estos valores no son resultados reales del sondeo.</small>
        </div>
      )}
      <div className="results-total">
        <strong>{total.toLocaleString("es-PE")}</strong>
        <span>participaciones {simulation ? "simuladas" : "válidas"}</span>
      </div>
      {!rows.length ? (
        <div className="empty">
          <h2>Sin resultados disponibles</h2>
          <p>
            Los resultados se mostrarán cuando existan opciones cargadas y se
            habilite su publicación.
          </p>
        </div>
      ) : (
        <div className="results-list">
          {rows.map((r) => (
            <article className="result-row" key={r.candidato_id}>
              <div className="result-identity">
                <div className="result-photo">
                  {r.foto_url ? (
                    <img
                      src={r.foto_url}
                      alt={r.nombre_candidato}
                      loading="lazy"
                    />
                  ) : (
                    <UserRound size={28} />
                  )}
                </div>
                <div>
                  <h3>{r.nombre_candidato}</h3>
                  <p>{r.organizacion_politica}</p>
                </div>
                <div className="result-symbol">
                  {r.simbolo_url ? (
                    <img
                      src={r.simbolo_url}
                      alt={`Símbolo de ${r.organizacion_politica}`}
                      loading="lazy"
                    />
                  ) : (
                    <span>
                      SÍMBOLO
                      <br />
                      NO CARGADO
                    </span>
                  )}
                </div>
              </div>
              <div className="result-values">
                <span>
                  {Number(r.cantidad_respuestas).toLocaleString("es-PE")}{" "}
                  participaciones{simulation ? " simuladas" : ""}
                </span>
                <strong>{Number(r.porcentaje).toFixed(2)}%</strong>
              </div>
              <Progress
                value={Number(r.porcentaje)}
                aria-label={`${r.nombre_candidato}: ${Number(r.porcentaje).toFixed(2)}%`}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
