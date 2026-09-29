"use client";

import { UserRound, Check } from "lucide-react";
import type { Candidato } from "@/lib/types";

export function CandidateCard({
  candidate: c,
  selected,
  onSelect,
}: {
  candidate: Candidato;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <article
      className={`candidate-box-card bg-white border-2 rounded-[18px] overflow-hidden flex flex-col transition-all duration-200 ${
        selected
          ? "border-[#12355B] shadow-[0_8px_25px_rgba(18,53,91,0.12)] bg-[#F8FAFC]"
          : "border-[#E2E8F0] hover:border-slate-400 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
      } ${onSelect ? "cursor-pointer" : ""}`}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      aria-pressed={onSelect ? selected : undefined}
    >
      {/* 1. Foto grande arriba con altura uniforme */}
      <div className="candidate-img-container h-52 sm:h-56 w-full bg-[#F1F5F9] border-b border-[#E2E8F0] relative overflow-hidden flex items-center justify-center">
        {c.foto_url ? (
          <img
            src={c.foto_url}
            alt={c.nombre_completo}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <UserRound size={64} strokeWidth={1.2} />
            <span className="text-xs font-semibold">Foto del candidato</span>
          </div>
        )}

        {c.numero_lista && (
          <span className="absolute top-3 left-3 bg-[#0B2545] text-white text-xs font-extrabold px-2.5 py-1 rounded-md shadow-sm">
            Lista {c.numero_lista}
          </span>
        )}

        {selected && (
          <span className="absolute top-3 right-3 bg-[#15803D] text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
            <Check size={14} strokeWidth={3} />
            Seleccionado
          </span>
        )}
      </div>

      {/* 2. Cuerpo del candidato */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg sm:text-xl font-extrabold text-[#0B2545] leading-snug line-clamp-2 min-h-[3rem]">
          {c.nombre_completo}
        </h3>

        <div className="text-xs sm:text-sm font-bold text-[#C81D25] uppercase tracking-wider mt-1">
          {c.cargo || "Candidato a Alcalde Distrital"}
        </div>

        <p className="text-xs sm:text-sm text-[#475569] font-medium mt-1 mb-4 truncate">
          {c.organizacion_politica}
        </p>

        {/* Fila del símbolo político y casilla con X */}
        <div className="mt-auto pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-14 h-14 rounded-xl border border-[#E2E8F0] p-1.5 bg-white flex items-center justify-center shrink-0 shadow-2xs"
              title={`Símbolo de ${c.organizacion_politica}`}
            >
              {c.simbolo_url ? (
                <img
                  src={c.simbolo_url}
                  alt={c.organizacion_politica}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-[9px] font-bold text-slate-400 text-center leading-tight">
                  SÍMBOLO
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              Símbolo del partido
            </span>
          </div>

          {/* Casilla de selección con X visible */}
          <div
            className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all ${
              selected
                ? "border-[#C81D25] bg-red-50 text-[#C81D25]"
                : "border-dashed border-slate-300 bg-[#F8FAFC] text-slate-400"
            }`}
          >
            {selected ? (
              <span className="text-3xl font-black leading-none select-none">✕</span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider">Marcar</span>
            )}
          </div>
        </div>

        {/* Botón SELECCIONAR táctil (mínimo 48px - 52px) */}
        {onSelect && (
          <button
            type="button"
            className={`w-full min-h-[50px] rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              selected
                ? "bg-[#12355B] text-white shadow-sm"
                : "bg-white text-[#12355B] border-2 border-[#12355B] hover:bg-[#F1F5F9]"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {selected ? (
              <>
                <Check size={18} strokeWidth={2.5} />
                <span>✓ SELECCIONADO</span>
              </>
            ) : (
              <span>SELECCIONAR</span>
            )}
          </button>
        )}
      </div>
    </article>
  );
}
