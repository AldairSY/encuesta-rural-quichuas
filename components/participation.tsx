"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { api, normalizedText } from "@/lib/client";
import type { Catalog } from "@/lib/types";
import {
  validateParticipation,
  friendlyErrors,
} from "@/supabase/functions/_shared/validation";
import { SelectField, SearchSelect, CheckField } from "./form-controls";
import { CandidateCard } from "./candidate-card";
import { Skeleton } from "@/components/ui/skeleton";
export function Participation() {
  const [data, setData] = useState<Catalog | null>(null),
    [error, setError] = useState(""),
    [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [survey, setSurvey] = useState(""),
    [candidate, setCandidate] = useState(""),
    [consent, setConsent] = useState(false);
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
        setSurvey(d.encuestas.find((e) => e.estado === "ACTIVA")?.id || "");
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    title.current?.focus();
  }, [step]);
  const e = data?.encuestas.find((e) => e.id === survey),
    candidates =
      data?.candidatos.filter((c) => c.encuesta_id === survey && c.activo) ||
      [],
    selected = candidates.find((c) => c.id === candidate);
  const centros =
    data?.centros.filter(
      (c) =>
        c.activo &&
        normalizedText(c.departamento) ===
          normalizedText(e?.departamento || "") &&
        normalizedText(c.provincia) === normalizedText(e?.provincia || "") &&
        normalizedText(c.distrito) === normalizedText(e?.distrito || ""),
    ) || [];
  const active =
    !!e &&
    e.estado === "ACTIVA" &&
    !!e.fecha_inicio &&
    !!e.fecha_fin &&
    new Date(e.fecha_inicio).getTime() <= now &&
    new Date(e.fecha_fin).getTime() > now;
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
        session =
          sessionStorage.getItem("rural_session") || crypto.randomUUID();
        sessionStorage.setItem("rural_session", session);
      } catch {
        device = crypto.randomUUID();
        session = crypto.randomUUID();
      }
      const input = {
        ...form,
        encuesta_id: survey,
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
      setForm({
        dni: "",
        nombres: "",
        apellido_paterno: "",
        apellido_materno: "",
        centro_poblado_id: "",
      });
      go(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : friendlyErrors.SERVICE);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!data)
    return error ? (
      <div className="notice error" role="alert">
        {error}
      </div>
    ) : (
      <Skeleton className="h-64 w-full" />
    );
  return (
    <div className="participation-layout">
      <div>
        <ol className="steps" aria-label="Pasos de participación">
          {["Identificación", "Selección", "Confirmación", "Registro"].map(
            (label, i) => (
              <li
                key={label}
                aria-current={step === i ? "step" : undefined}
                className={step >= i ? "current" : ""}
              >
                <span>{i < step ? "✓" : i + 1}</span>
                {label}
              </li>
            ),
          )}
        </ol>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {step < 3 && (
          <SelectField
            id="survey"
            label="Sondeo"
            value={survey}
            options={[
              { value: "", label: "Selecciona un sondeo" },
              ...data.encuestas.map((e) => ({ value: e.id, label: e.titulo })),
            ]}
            disabled={step > 0 || busy}
            onChange={(v) => {
              setSurvey(v);
              setCandidate("");
              setForm({ ...form, centro_poblado_id: "" });
            }}
          />
        )}
        {step < 3 && (!active || !candidates.length || !centros.length) ? (
          <div className="empty">
            <h2>El sondeo aún no está disponible</h2>
            <p>
              La administración debe abrir el periodo de participación y cargar
              las opciones y comunidades correspondientes.
            </p>
            <Link className="button secondary" href="/informacion">
              Consultar información
            </Link>
          </div>
        ) : (
          <>
            {step === 0 && (
              <form
                className="panel"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (!/^\d{8}$/.test(form.dni)) {
                    setError(friendlyErrors.DNI_INVALIDO);
                    return;
                  }
                  if (!form.centro_poblado_id || !consent) {
                    setError(
                      "Selecciona tu comunidad y acepta el aviso de privacidad.",
                    );
                    return;
                  }
                  go(1);
                }}
              >
                <h2 ref={title} tabIndex={-1}>
                  Datos del participante
                </h2>
                <p>
                  El DNI permite evitar registros duplicados. No verificamos la
                  identidad mediante RENIEC.
                </p>
                <div className="form-grid">
                  {[
                    { key: "dni", label: "DNI", max: 8, min: 8 },
                    { key: "nombres", label: "Nombres", max: 100, min: 2 },
                    {
                      key: "apellido_paterno",
                      label: "Apellido paterno",
                      max: 100,
                      min: 2,
                    },
                    {
                      key: "apellido_materno",
                      label: "Apellido materno (opcional)",
                      max: 100,
                      min: 2,
                    },
                  ].map((f) => (
                    <div className="field" key={f.key}>
                      <label htmlFor={f.key}>{f.label}</label>
                      <input
                        id={f.key}
                        required={f.key !== "apellido_materno"}
                        minLength={f.min}
                        maxLength={f.max}
                        inputMode={f.key === "dni" ? "numeric" : "text"}
                        pattern={f.key === "dni" ? "[0-9]{8}" : undefined}
                        autoComplete="off"
                        value={form[f.key as keyof typeof form]}
                        onChange={(ev) =>
                          setForm({ ...form, [f.key]: ev.target.value })
                        }
                      />
                    </div>
                  ))}
                  <div className="full">
                    <SearchSelect
                      id="centro"
                      label="Centro Poblado / Comunidad"
                      value={form.centro_poblado_id}
                      onChange={(v) =>
                        setForm({ ...form, centro_poblado_id: v })
                      }
                      options={centros}
                    />
                  </div>
                </div>
                <div className="privacy-box">
                  <h3>Privacidad de tus datos</h3>
                  <p>{data.config.privacidad}</p>
                  <CheckField
                    id="consent"
                    label="He leído y acepto el aviso de privacidad."
                    checked={consent}
                    onChange={setConsent}
                  />
                </div>
                <div className="actions">
                  <button className="button" type="submit">
                    Continuar <ArrowRight size={18} />
                  </button>
                </div>
              </form>
            )}
            {step === 1 && (
              <section>
                <h2 ref={title} tabIndex={-1}>
                  Selecciona una opción
                </h2>
                <p>
                  SONDEO DE OPINIÓN · {e?.distrito}. Solo puedes seleccionar una
                  opción.
                </p>
                <div className="candidate-grid">
                  {candidates.map((c) => (
                    <CandidateCard
                      candidate={c}
                      key={c.id}
                      selected={candidate === c.id}
                      onSelect={() => setCandidate(c.id)}
                    />
                  ))}
                </div>
                <div className="actions">
                  <button className="button secondary" onClick={() => go(0)}>
                    Volver
                  </button>
                  <button
                    className="button"
                    disabled={!selected}
                    onClick={() => go(2)}
                  >
                    Revisar selección
                  </button>
                </div>
              </section>
            )}
            {step === 2 && selected && (
              <section className="confirmation">
                <h2 ref={title} tabIndex={-1}>
                  Confirmar selección
                </h2>
                <p>
                  Revisa tu selección antes de confirmar. La respuesta no se
                  podrá modificar desde el área pública.
                </p>
                <CandidateCard candidate={selected} selected />
                <div className="actions">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => go(1)}
                  >
                    Volver
                  </button>
                  <button className="button" disabled={busy} onClick={submit}>
                    {busy ? "Registrando…" : "Confirmar respuesta"}
                  </button>
                </div>
              </section>
            )}
            {step === 3 && selected && (
              <section className="confirmation">
                <CheckCircle2 className="success-icon" size={50} />
                <h2 ref={title} tabIndex={-1}>
                  Participación registrada correctamente
                </h2>
                <p>Gracias por participar. Tu selección quedó registrada.</p>
                <CandidateCard candidate={selected} />
                <div className="actions">
                  <Link href="/resultados" className="button">
                    Ver resultados
                  </Link>
                  <Link href="/" className="button secondary">
                    Volver al inicio
                  </Link>
                </div>
              </section>
            )}
          </>
        )}
      </div>
      <aside className="help-panel">
        <span className="eyebrow blue">ANTES DE PARTICIPAR</span>
        <h3>Tu información está protegida.</h3>
        <p>
          Los resultados son agregados. No publicamos DNI, nombres de
          participantes ni respuestas individuales.
        </p>
        <hr />
        <p>
          El sistema comprueba el formato del DNI y la duplicidad de registro.
          No constituye una verificación oficial de identidad.
        </p>
        <Link className="inline-link" href="/informacion#privacidad">
          Leer aviso de privacidad
        </Link>
      </aside>
    </div>
  );
}
