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
    <div className="space-y-4">
      {simulation && (
        <div className="bg-amber-50 border-2 border-amber-400 text-amber-900 p-4 rounded-xl mb-6">
          <div className="font-bold text-sm uppercase tracking-wide">⚠ SIMULACIÓN — DATOS FICTICIOS</div>
          <small className="text-xs text-amber-700">Estos valores no son resultados reales del sondeo.</small>
        </div>
      )}

      {/* Resumen Total */}
      <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Total General del Sondeo
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <strong className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight">
              {total.toLocaleString("es-PE")}
            </strong>
            <span className="text-sm font-semibold text-slate-600">
              participaciones {simulation ? "simuladas" : "válidas"}
            </span>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Resultados agregados
        </span>
      </div>

      {!rows.length ? (
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-8 text-center text-slate-500">
          <h3 className="text-lg font-bold text-[#0B2545] mb-1">Sin resultados disponibles</h3>
          <p className="text-sm">Los resultados se mostrarán cuando existan opciones activas y respuestas registradas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const count = Number(r.cantidad_respuestas);
            const pct = Number(r.porcentaje);

            return (
              <article
                key={r.candidato_id}
                className="bg-white border border-[#E2E8F0] hover:border-slate-300 rounded-[16px] p-5 sm:p-6 shadow-xs transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* [SÍMBOLO] [FOTO] NOMBRE ORGANIZACIÓN */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Símbolo */}
                    <div
                      className="w-14 h-14 rounded-xl border border-[#E2E8F0] p-1 bg-white flex items-center justify-center shrink-0 shadow-2xs"
                      title={r.organizacion_politica}
                    >
                      {r.simbolo_url ? (
                        <img
                          src={r.simbolo_url}
                          alt={r.organizacion_politica}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 text-center">
                          SÍMBOLO
                        </span>
                      )}
                    </div>

                    {/* Foto */}
                    <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-[#E2E8F0] flex items-center justify-center">
                      {r.foto_url ? (
                        <img
                          src={r.foto_url}
                          alt={r.nombre_candidato}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <UserRound size={28} className="text-slate-400" />
                      )}
                    </div>

                    {/* Nombre y Organización */}
                    <div className="min-w-0">
                      <h4 className="text-base sm:text-lg font-extrabold text-[#0B2545] leading-snug truncate">
                        {r.nombre_candidato}
                      </h4>
                      <p className="text-xs sm:text-sm text-[#475569] font-medium truncate mt-0.5">
                        {r.organizacion_politica}
                      </p>
                    </div>
                  </div>

                  {/* Participaciones y Porcentaje */}
                  <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <strong className="text-2xl sm:text-3xl font-black text-[#12355B] tracking-tight">
                      {pct.toFixed(2)}%
                    </strong>
                    <span className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">
                      {count.toLocaleString("es-PE")} participaciones{simulation ? " simuladas" : ""}
                    </span>
                  </div>
                </div>

                {/* Barra horizontal moderna */}
                <div className="mt-4">
                  <Progress
                    value={pct}
                    className="h-3 bg-slate-100 rounded-full"
                    aria-label={`${r.nombre_candidato}: ${pct.toFixed(2)}%`}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
