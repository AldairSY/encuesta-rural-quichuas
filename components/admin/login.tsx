"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Vote, LockKeyhole } from "lucide-react";
import { api } from "@/lib/client";
export function Login() {
  const [signup, setSignup] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    api("auth/session")
      .then(() => {
        window.location.replace("/admin/dashboard");
      })
      .catch(() => {});
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      const result = await api<{ message?: string }>(
        signup ? "auth/signup" : "auth/login",
        { email: form.get("email"), password: form.get("password") },
      );
      if (signup) setMessage(result.message || "Revisa tu correo.");
      else window.location.assign("/admin/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-brand">
        <Vote size={28} />
        <strong>ENCUESTA RURAL</strong>
      </div>
      <section className="login-card">
        <LockKeyhole size={30} />
        <span className="eyebrow blue">ÁREA ADMINISTRATIVA</span>
        <h1>{signup ? "Activa tu cuenta" : "Bienvenido de nuevo"}</h1>
        <p>
          {signup
            ? "Registra el correo autorizado y elige una contraseña. El acceso se habilita tras confirmar tu correo en Supabase."
            : "Ingresa con tu cuenta de administración."}
        </p>
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
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              maxLength={254}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete={signup ? "new-password" : "current-password"}
            />
            {signup && <small>Utiliza al menos 12 caracteres.</small>}
          </div>
          <button className="button" type="submit" disabled={busy}>
            {busy
              ? "Procesando…"
              : signup
                ? "Crear cuenta y verificar correo"
                : "Iniciar sesión"}
          </button>
        </form>
        <button
          className="inline-link login-toggle"
          onClick={() => {
            setSignup((v) => !v);
            setError("");
            setMessage("");
          }}
        >
          {signup ? "Ya tengo una cuenta" : "Primer acceso: crear mi cuenta"}
        </button>
        <p className="login-help">
          El registro de una cuenta no concede permisos. Solo los correos
          autorizados pueden administrar el sistema.
        </p>
      </section>
      <Link className="inline-link" href="/">
        Volver al sondeo
      </Link>
    </main>
  );
}
