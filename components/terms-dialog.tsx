"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Lock, BarChart3, Vote, Check, Info } from "lucide-react";

interface TermsDialogProps {
  distrito?: string;
  provincia?: string;
  departamento?: string;
}

const STORAGE_KEY = "encuesta_rural_terminos_aceptados_v1";

let memoryForceOpen = false;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("open-terms-dialog", callback);
  window.addEventListener("close-terms-dialog", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("open-terms-dialog", callback);
    window.removeEventListener("close-terms-dialog", callback);
  };
}

function getSnapshot() {
  if (memoryForceOpen) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== "true";
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

export function TermsDialog({
  distrito = "Quichuas",
  provincia = "Tayacaja",
  departamento = "Huancavelica",
}: TermsDialogProps) {
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [acceptedCheckbox, setAcceptedCheckbox] = useState(true);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignorar error de almacenamiento
    }
    memoryForceOpen = false;
    window.dispatchEvent(new Event("close-terms-dialog"));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg sm:max-w-xl bg-white rounded-[24px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera Institucional */}
        <div className="bg-gradient-to-r from-[#0B2545] to-[#12355B] text-white p-5 sm:p-6 pb-5 relative shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#C81D25] text-white font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full">
              TRANSPARENCIA CIUDADANA
            </span>
            <span className="text-slate-300 text-xs font-medium">
              {distrito} · {provincia} · {departamento}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <ShieldCheck className="text-emerald-400" size={24} />
            </div>
            <div>
              <h2
                id="terms-modal-title"
                className="text-lg sm:text-xl font-extrabold text-white leading-tight"
              >
                Términos del Sondeo y Compromiso de Transparencia
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                Bienvenido al sistema de participación ciudadana comunal. Por favor, lee las siguientes condiciones antes de continuar.
              </p>
            </div>
          </div>
        </div>

        {/* Contenido con scroll amigable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-sm text-[#475569]">
          {/* Tarjeta 1: Carácter referencial */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#F7F9FC] border border-[#E2E8F0]">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#12355B] flex items-center justify-center shrink-0 mt-0.5">
              <Vote size={18} />
            </div>
            <div>
              <h3 className="font-bold text-[#0B2545] text-sm">
                1. Sondeo de opinión cívico y referencial
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Esta consulta es un ejercicio de participación libre e independiente para conocer el sentir de los vecinos. <strong>No constituye una elección oficial ni tiene relación con la ONPE o el JNE.</strong>
              </p>
            </div>
          </div>

          {/* Tarjeta 2: Privacidad de datos */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#15803D] flex items-center justify-center shrink-0 mt-0.5">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-emerald-950 text-sm">
                2. Protección estricta de tus datos
              </h3>
              <p className="text-xs sm:text-sm text-emerald-900 mt-1 leading-relaxed">
                Tu DNI y nombres solo se emplean para verificar que cada persona participe una única vez y prevenir duplicidades. <strong>Tus datos personales nunca serán mostrados públicamente ni compartidos con terceros.</strong>
              </p>
            </div>
          </div>

          {/* Tarjeta 3: Resultados agregados */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#F7F9FC] border border-[#E2E8F0]">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-[#C81D25] flex items-center justify-center shrink-0 mt-0.5">
              <BarChart3 size={18} />
            </div>
            <div>
              <h3 className="font-bold text-[#0B2545] text-sm">
                3. Resultados públicos agregados
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Las estadísticas mostradas al público se presentan únicamente de forma general y agregada por centro poblado y comunidad, garantizando la reserva de las respuestas individuales.
              </p>
            </div>
          </div>

          {/* Aviso sobre uso responsable */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
            <Info size={16} className="shrink-0 text-amber-700" />
            <span>
              La participación es libre, voluntaria y dirigida a los habitantes del distrito de <strong>{distrito}</strong> y sus comunidades.
            </span>
          </div>

          {/* Checkbox de Aceptación */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors mt-2 select-none">
            <input
              type="checkbox"
              checked={acceptedCheckbox}
              onChange={(e) => setAcceptedCheckbox(e.target.checked)}
              className="w-5 h-5 rounded-md text-[#C81D25] border-slate-300 focus:ring-[#12355B] mt-0.5 cursor-pointer accent-[#C81D25]"
            />
            <span className="text-xs sm:text-sm text-[#0B2545] font-semibold">
              He leído y acepto los términos de participación, transparencia y protección de datos para el sondeo de {distrito}.
            </span>
          </label>
        </div>

        {/* Pie del modal con botón de acción destacado */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <Link
            href="/informacion"
            onClick={handleAccept}
            className="text-xs text-slate-500 hover:text-[#12355B] underline text-center sm:text-left py-1"
          >
            Ver información y metodología completa
          </Link>

          <button
            type="button"
            disabled={!acceptedCheckbox}
            onClick={handleAccept}
            className={`min-h-[48px] sm:min-h-[50px] px-6 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
              acceptedCheckbox
                ? "bg-[#C81D25] hover:bg-[#A3161D] text-white active:scale-[0.98] cursor-pointer"
                : "bg-slate-300 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Check size={18} />
            <span>ENTENDIDO Y ACEPTAR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
