"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Printer,
  BarChart3,
  ShieldCheck,
  CreditCard,
  Building2,
  Vote,
  FileCheck2,
} from "lucide-react";
import { api, normalizedText } from "@/lib/client";
import type { Catalog } from "@/lib/types";
import {
  validateParticipation,
  friendlyErrors,
} from "@/supabase/functions/_shared/validation";
import { SearchSelect, CheckField } from "./form-controls";
import { CandidateCard } from "./candidate-card";
import { Skeleton } from "@/components/ui/skeleton";

export function Participation() {
  const [data, setData] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0); // 0: Datos, 1: Comunidad, 2: Selección, 3: Confirmación, 4: Registrado
  const [busy, setBusy] = useState(false);
  const [survey, setSurvey] = useState("");
  const [candidate, setCandidate] = useState("");
  const [consent, setConsent] = useState(false);
  const [participationCode, setParticipationCode] = useState("");
  const [registeredAt, setRegisteredAt] = useState<Date | null>(null);

  const [form, setForm] = useState({
    dni: "",
    nombres: "",
    apellido_paterno: "",
    apellido_materno: "",
    centro_poblado_id: "",
  });

  const [now, setNow] = useState(0);
  const lock = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    api<Catalog>("public")
      .then((d) => {
        setData(d);
        const params =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : null;
        const requested = params?.get("encuesta");
        const found = d.encuestas.find((item) => item.id === requested);
        if (found) {
          setSurvey(found.id);
        } else {
          setSurvey(d.encuestas.find((e) => e.estado === "ACTIVA")?.id || "");
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    title.current?.focus();
    window.scrollTo({ top: 140, behavior: "smooth" });
  }, [step]);

  const activeSurvey =
    data?.encuestas.find((e) => e.estado === "ACTIVA") || data?.encuestas[0];
  const currentSurveyId = survey || activeSurvey?.id || "";
  const e = data?.encuestas.find((item) => item.id === currentSurveyId);
  const candidates =
    data?.candidatos.filter(
      (c) => c.encuesta_id === currentSurveyId && c.activo,
    ) || [];
  const selected = candidates.find((c) => c.id === candidate);

  const centros =
    data?.centros.filter(
      (c) =>
        c.activo &&
        normalizedText(c.departamento) === normalizedText(e?.departamento || "") &&
        normalizedText(c.provincia) === normalizedText(e?.provincia || "") &&
        normalizedText(c.distrito) === normalizedText(e?.distrito || ""),
    ) || [];

  const selectedCentro = centros.find((c) => c.id === form.centro_poblado_id);

  const active =
    !!e &&
    e.estado === "ACTIVA" &&
    (!e.fecha_inicio ||
      now === 0 ||
      new Date(e.fecha_inicio).getTime() <= now) &&
    (!e.fecha_fin || now === 0 || new Date(e.fecha_fin).getTime() > now);

  function go(next: number) {
    setError("");
    setStep(next);
  }

  async function submit() {
    if (lock.current || !data?.connection || !selected) return;
    lock.current = true;
    setBusy(true);
    setError("");

    try {
      let device: string;
      let session: string;
      try {
        device = localStorage.getItem("rural_device") || crypto.randomUUID();
        localStorage.setItem("rural_device", device);
        session = sessionStorage.getItem("rural_session") || crypto.randomUUID();
        sessionStorage.setItem("rural_session", session);
      } catch {
        device = crypto.randomUUID();
        session = crypto.randomUUID();
      }

      if (centros.length === 0 || !form.centro_poblado_id) {
        throw new Error(
          "Para registrar la participación es necesario seleccionar una comunidad válida. La administración debe agregar los centros poblados en /admin/centros-poblados.",
        );
      }

      const input = {
        ...form,
        encuesta_id: currentSurveyId,
        candidato_id: candidate,
        device_id: device,
        session_id: session,
        privacidad_version: data.config.privacidad_version,
        acepta_privacidad: consent,
      };

      const checked = validateParticipation(input);
      if (!checked.ok) throw new Error(friendlyErrors[checked.code]);

      const res = await fetch(
        `${data.connection.url}/functions/v1/participar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: data.connection.key,
            Authorization: `Bearer ${data.connection.key}`,
          },
          body: JSON.stringify(checked.data),
        },
      );

      const result = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !result.ok)
        throw new Error(result.message || friendlyErrors.SERVICE);

      const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      setParticipationCode(`ER-${randomCode}`);
      setRegisteredAt(new Date());

      go(4); // Pantalla de éxito
    } catch (err) {
      setError(err instanceof Error ? err.message : friendlyErrors.SERVICE);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!data) {
    return error ? (
      <div className="p-6 bg-red-50 text-[#C81D25] border border-red-200 rounded-xl" role="alert">
        {error}
      </div>
    ) : (
      <div className="py-12 space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  // 4 Pasos del Stepper visual
  const stepsList = [
    { num: 1, title: "Datos" },
    { num: 2, title: "Comunidad" },
    { num: 3, title: "Selección" },
    { num: 4, title: "Confirmación" },
  ];

  return (
    <div className="w-full max-w-[900px] mx-auto pb-12">
      {/* Título Superior */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2545] tracking-tight">
          Participa en el sondeo
        </h1>
        <p className="text-base text-[#475569] mt-2">
          {e?.distrito || "Distrito"} · Sondeo de opinión ciudadana
        </p>
      </div>

      {/* Selector de sondeo si hay más de 1 */}
      {data.encuestas.length > 1 && (
        <div className="mb-6 max-w-md mx-auto">
          <label htmlFor="survey-select" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
            Seleccionar sondeo
          </label>
          <select
            id="survey-select"
            value={currentSurveyId}
            disabled={step > 0 || busy}
            onChange={(ev) => {
              setSurvey(ev.target.value);
              setCandidate("");
              setForm({ ...form, centro_poblado_id: "" });
            }}
            className="w-full min-h-[48px] px-4 text-sm bg-white border-2 border-[#CBD5E1] rounded-xl font-bold text-[#0B2545] focus:border-[#12355B] focus:outline-none"
          >
            {data.encuestas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.titulo} ({item.estado})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Indicador Stepper Moderno */}
      {step < 4 && (
        <div className="mb-8 px-4 sm:px-8">
          <div className="flex items-center justify-between relative">
            {/* Línea conectora */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-[#E2E8F0] -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-[#12355B] -translate-y-1/2 transition-all duration-300 z-0"
              style={{
                width: `${(Math.min(step, 3) / 3) * 100}%`,
              }}
            />

            {stepsList.map((s, index) => {
              const isActive = step === index;
              const isCompleted = step > index;

              return (
                <div
                  key={s.num}
                  className="flex flex-col items-center relative z-10 bg-[#F7F9FC] px-2"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-[#12355B] text-white shadow-md ring-4 ring-blue-100"
                        : isCompleted
                          ? "bg-[#15803D] text-white"
                          : "bg-white border-2 border-[#E2E8F0] text-slate-400"
                    }`}
                  >
                    {isCompleted ? "✓" : s.num}
                  </div>
                  <span
                    className={`text-xs font-bold mt-2 whitespace-nowrap ${
                      isActive
                        ? "text-[#0B2545]"
                        : isCompleted
                          ? "text-slate-800"
                          : "text-slate-400"
                    }`}
                  >
                    {s.num} {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notificación de Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-[#C81D25] text-sm font-semibold flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-red-200 text-[#C81D25] flex items-center justify-center shrink-0">!</span>
          <span>{error}</span>
        </div>
      )}

      {/* Validación de disponibilidad del sondeo */}
      {step < 4 && (!active || !candidates.length) ? (
        <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-8 sm:p-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <Vote className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0B2545] mb-2">
            {!active
              ? "El sondeo no se encuentra disponible actualmente"
              : "No hay opciones registradas para este sondeo"}
          </h2>
          <p className="text-sm text-[#475569] max-w-md mx-auto mb-6">
            {!active
              ? "El periodo de participación para esta consulta ciudadana no está abierto en este momento."
              : "La administración habilitará los candidatos y opciones correspondientes para iniciar la consulta."}
          </p>
          <Link href="/informacion" className="btn-secondary-white">
            Ver información del sondeo
          </Link>
        </div>
      ) : (
        /* Tarjeta Central Blanca (max-width: 900px, border-radius: 20px, shadow elegante) */
        <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-6 sm:p-10 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          {/* ========================================================
              PASO 1: DATOS PERSONALES
             ======================================================== */}
          {step === 0 && (
            <div>
              <div className="border-b border-[#E2E8F0] pb-5 mb-6">
                <h2 ref={title} tabIndex={-1} className="text-2xl sm:text-3xl font-extrabold text-[#0B2545]">
                  Tus datos
                </h2>
                <p className="text-sm text-[#475569] mt-1">
                  Ingresa los 8 números de tu DNI para validar tu participación.
                </p>
              </div>

              {/* Guía visual sencilla del DNI */}
              <div className="flex items-center gap-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CreditCard size={24} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Documento Nacional de Identidad
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                    👉 <strong>Ingresa los 8 números de tu DNI</strong>. No compartiremos tus datos públicamente.
                  </p>
                </div>
              </div>

              <form
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (!/^\d{8}$/.test(form.dni)) {
                    setError("Ingresa un DNI válido de 8 dígitos numéricos.");
                    return;
                  }
                  if (form.nombres.trim().length < 2) {
                    setError("Completa tus nombres.");
                    return;
                  }
                  if (form.apellido_paterno.trim().length < 2) {
                    setError("Completa tu apellido paterno.");
                    return;
                  }
                  go(1);
                }}
              >
                <div className="space-y-6">
                  {/* DNI */}
                  <div>
                    <label htmlFor="dni" className="block text-sm font-bold text-[#0B2545] mb-2">
                      DNI <span className="text-[#C81D25]">*</span>
                    </label>
                    <input
                      id="dni"
                      required
                      inputMode="numeric"
                      pattern="[0-9]{8}"
                      maxLength={8}
                      minLength={8}
                      placeholder="Escribe los 8 números de tu DNI"
                      className="w-full min-h-[52px] px-4 text-lg font-mono tracking-widest bg-white border-2 border-[#CBD5E1] rounded-xl focus:border-[#12355B] focus:outline-none transition-colors"
                      value={form.dni}
                      onChange={(ev) => {
                        const val = ev.target.value.replace(/\D/g, "");
                        setForm({ ...form, dni: val });
                      }}
                    />
                  </div>

                  {/* Nombres */}
                  <div>
                    <label htmlFor="nombres" className="block text-sm font-bold text-[#0B2545] mb-2">
                      Nombres <span className="text-[#C81D25]">*</span>
                    </label>
                    <input
                      id="nombres"
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Tus nombres completos"
                      className="w-full min-h-[52px] px-4 text-base bg-white border-2 border-[#CBD5E1] rounded-xl focus:border-[#12355B] focus:outline-none transition-colors"
                      value={form.nombres}
                      onChange={(ev) =>
                        setForm({ ...form, nombres: ev.target.value })
                      }
                    />
                  </div>

                  {/* Grid Apellidos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="apellido_paterno" className="block text-sm font-bold text-[#0B2545] mb-2">
                        Apellido paterno <span className="text-[#C81D25]">*</span>
                      </label>
                      <input
                        id="apellido_paterno"
                        required
                        minLength={2}
                        maxLength={100}
                        placeholder="Primer apellido"
                        className="w-full min-h-[52px] px-4 text-base bg-white border-2 border-[#CBD5E1] rounded-xl focus:border-[#12355B] focus:outline-none transition-colors"
                        value={form.apellido_paterno}
                        onChange={(ev) =>
                          setForm({ ...form, apellido_paterno: ev.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label htmlFor="apellido_materno" className="block text-sm font-bold text-[#0B2545] mb-2">
                        Apellido materno <span className="text-slate-400 font-normal">(Opcional)</span>
                      </label>
                      <input
                        id="apellido_materno"
                        maxLength={100}
                        placeholder="Segundo apellido"
                        className="w-full min-h-[52px] px-4 text-base bg-white border-2 border-[#CBD5E1] rounded-xl focus:border-[#12355B] focus:outline-none transition-colors"
                        value={form.apellido_materno}
                        onChange={(ev) =>
                          setForm({ ...form, apellido_materno: ev.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex justify-end">
                  <button type="submit" className="btn-primary-red min-h-[52px] w-full sm:w-auto px-8">
                    <span>Siguiente: Comunidad</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================
              PASO 2: SELECCIÓN DE COMUNIDAD Y PRIVACIDAD
             ======================================================== */}
          {step === 1 && (
            <div>
              <div className="border-b border-[#E2E8F0] pb-5 mb-6">
                <h2 ref={title} tabIndex={-1} className="text-2xl sm:text-3xl font-extrabold text-[#0B2545]">
                  Selecciona tu comunidad
                </h2>
                <p className="text-sm text-[#475569] mt-1">
                  Indica el caserío, anexo o centro poblado donde vives en {e?.distrito || "el distrito"}.
                </p>
              </div>

              <form
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (centros.length > 0 && !form.centro_poblado_id) {
                    setError("Selecciona tu centro poblado o comunidad.");
                    return;
                  }
                  if (!consent) {
                    setError("Debes aceptar el aviso de privacidad para continuar.");
                    return;
                  }
                  go(2);
                }}
              >
                <div className="space-y-6 mb-8">
                  <div>
                    <label htmlFor="centro" className="block text-sm font-bold text-[#0B2545] mb-2 flex items-center gap-2">
                      <Building2 size={18} className="text-[#12355B]" />
                      <span>Centro Poblado / Comunidad / Anexo <span className="text-[#C81D25]">*</span></span>
                    </label>
                    {centros.length === 0 ? (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm">
                        <div className="font-bold mb-1 flex items-center gap-2">
                          <Building2 size={18} className="text-amber-700" />
                          <span>Comunidades pendientes de habilitación en el sistema</span>
                        </div>
                        <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                          Aún no se han registrado centros poblados ni comunidades para <strong>{e?.distrito || "este distrito"}</strong> en la base de datos.
                        </p>
                        <p className="text-xs text-amber-700 mt-2">
                          👉 Para habilitar el registro oficial de votos, el administrador debe ingresar al{" "}
                          <Link href="/admin/centros-poblados" className="underline font-bold text-[#12355B]">
                            Panel Administrativo &rarr; Centros Poblados
                          </Link>{" "}
                          y agregar al menos una comunidad (ej. {e?.distrito || "Andamarca"} Centro, Huayao, etc.).
                        </p>
                      </div>
                    ) : (
                      <SearchSelect
                        id="centro"
                        label=""
                        value={form.centro_poblado_id}
                        onChange={(v) =>
                          setForm({ ...form, centro_poblado_id: v })
                        }
                        options={centros}
                      />
                    )}
                  </div>

                  {/* Caja de privacidad */}
                  <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={22} className="text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-[#0B2545] text-sm mb-1">
                          Aviso de privacidad y uso de datos
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                          Tus datos personales no se mostrarán públicamente. Los resultados públicos
                          se presentan de forma agregada para garantizar la transparencia y neutralidad.
                        </p>
                        <CheckField
                          id="consent"
                          label="He leído y acepto los términos de participación en el sondeo ciudadano."
                          checked={consent}
                          onChange={setConsent}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-between gap-4">
                  <button
                    type="button"
                    className="btn-secondary-white min-h-[52px]"
                    onClick={() => go(0)}
                  >
                    <ArrowLeft size={18} />
                    <span>Volver a mis datos</span>
                  </button>
                  <button type="submit" className="btn-primary-red min-h-[52px]">
                    <span>Siguiente: Selección</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================
              PASO 3: SELECCIÓN DE CANDIDATO
             ======================================================== */}
          {step === 2 && (
            <div>
              <div className="border-b border-[#E2E8F0] pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 ref={title} tabIndex={-1} className="text-2xl sm:text-3xl font-extrabold text-[#0B2545]">
                    Elige una opción
                  </h2>
                  <p className="text-sm text-[#475569] mt-1">
                    SONDEO DE OPINIÓN · Toca la casilla o el botón para marcar tu candidato con una (X).
                  </p>
                </div>
                {selected && (
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full self-start sm:self-auto flex items-center gap-1.5">
                    <CheckCircle2 size={16} />
                    Opción elegida
                  </span>
                )}
              </div>

              {/* Grid de candidatos: Desktop 3, Tablet 2, Móvil 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {candidates.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    selected={candidate === c.id}
                    onSelect={() => setCandidate(c.id)}
                  />
                ))}
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  className="btn-secondary-white min-h-[52px]"
                  onClick={() => go(1)}
                >
                  <ArrowLeft size={18} />
                  <span>Volver a Comunidad</span>
                </button>
                <button
                  type="button"
                  className="btn-primary-red min-h-[52px]"
                  disabled={!selected}
                  onClick={() => go(3)}
                >
                  <span>Revisar selección</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              PASO 4: CONFIRMAR SELECCIÓN
             ======================================================== */}
          {step === 3 && selected && (
            <div className="max-w-xl mx-auto text-center">
              <div className="border-b border-[#E2E8F0] pb-5 mb-6">
                <h2 ref={title} tabIndex={-1} className="text-2xl sm:text-3xl font-extrabold text-[#0B2545]">
                  CONFIRME SU SELECCIÓN
                </h2>
                <p className="text-sm text-[#475569] mt-1">
                  Revisa tu opción antes de registrar. Una vez confirmada no podrá modificarse.
                </p>
              </div>

              {/* Resumen de participante */}
              <div className="text-left bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-4 mb-6 text-sm space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#0B2545] mb-2">
                  <FileCheck2 size={18} className="text-[#12355B]" />
                  <span>Tus datos de registro:</span>
                </div>
                <div className="text-slate-700">
                  <strong>DNI:</strong> {form.dni}
                </div>
                <div className="text-slate-700">
                  <strong>Participante:</strong> {form.nombres} {form.apellido_paterno} {form.apellido_materno}
                </div>
                <div className="text-slate-700">
                  <strong>Centro Poblado:</strong> {selectedCentro?.nombre || "Comunidad declarada"}
                </div>
              </div>

              {/* Tarjeta del candidato con la X */}
              <div className="my-6 max-w-sm mx-auto text-left">
                <CandidateCard candidate={selected} selected />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                <button
                  type="button"
                  className="btn-secondary-white w-full sm:w-auto min-h-[52px]"
                  disabled={busy}
                  onClick={() => go(2)}
                >
                  <ArrowLeft size={18} />
                  <span>CAMBIAR SELECCIÓN</span>
                </button>
                <button
                  type="button"
                  className="btn-primary-red w-full sm:w-auto min-h-[52px]"
                  disabled={busy}
                  onClick={submit}
                >
                  {busy ? (
                    <span>Registrando…</span>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      <span>CONFIRMAR PARTICIPACIÓN</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              PANTALLA DE ÉXITO: CONSTANCIA DE PARTICIPACIÓN
             ======================================================== */}
          {step === 4 && selected && (
            <div className="max-w-xl mx-auto text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={40} strokeWidth={2.5} />
              </div>
              <h2 ref={title} tabIndex={-1} className="text-2xl sm:text-3xl font-extrabold text-[#0B2545]">
                ✓ PARTICIPACIÓN REGISTRADA
              </h2>
              <p className="text-base text-slate-700 mt-2">
                Gracias por participar en <strong>{data.config.nombre || "Encuesta Rural"}</strong>.
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Tus datos personales no se mostrarán en los resultados públicos.
              </p>

              {/* Ficha Constancia de Participación */}
              <div className="receipt-box my-8 text-left bg-white border-2 border-[#12355B] rounded-2xl p-6 sm:p-7 shadow-md">
                <div className="border-b border-[#E2E8F0] pb-4 mb-4 text-center">
                  <span className="text-lg font-black text-[#0B2545] tracking-wider block">
                    {data.config.nombre || "ENCUESTA RURAL"}
                  </span>
                  <span className="text-xs uppercase font-bold text-slate-500 tracking-widest block mt-1">
                    Constancia de Participación
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Estado:</span>
                    <strong className="text-emerald-700 font-bold">Participación registrada correctamente</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Fecha:</span>
                    <strong className="text-slate-900">
                      {registeredAt
                        ? registeredAt.toLocaleDateString("es-PE", { timeZone: "America/Lima" })
                        : "—"}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Hora:</span>
                    <strong className="text-slate-900">
                      {registeredAt
                        ? registeredAt.toLocaleTimeString("es-PE", {
                            timeZone: "America/Lima",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Centro Poblado:</span>
                    <strong className="text-slate-900">{selectedCentro?.nombre || "Comunidad del distrito"}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Ámbito:</span>
                    <strong className="text-slate-900">
                      {data.config.distrito} · {data.config.provincia} · {data.config.departamento}
                    </strong>
                  </div>

                  <div className="pt-3 border-t border-dashed border-[#CBD5E1] text-center">
                    <span className="text-xs text-slate-500 block">Código de participación:</span>
                    <strong className="text-xl font-mono tracking-widest text-[#0B2545] block mt-1">
                      {participationCode}
                    </strong>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
                  Sondeo de opinión ciudadana independiente · Resultados referenciales
                </div>
              </div>

              {/* Botones de acción final */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  className="btn-secondary-white min-h-[52px] w-full sm:w-auto"
                  onClick={() => window.print()}
                >
                  <Printer size={18} />
                  <span>IMPRIMIR CONSTANCIA</span>
                </button>
                <Link href="/resultados" className="btn-primary-red min-h-[52px] w-full sm:w-auto">
                  <BarChart3 size={18} />
                  <span>VER RESULTADOS</span>
                </Link>
              </div>

              <div className="mt-6">
                <Link href="/" className="text-sm font-semibold text-[#12355B] hover:underline">
                  Volver a la portada principal
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
