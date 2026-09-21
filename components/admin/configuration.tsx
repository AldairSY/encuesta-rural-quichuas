"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SelectField, CheckField } from "@/components/form-controls";
import { Upload } from "./catalog-manager";
import type { Catalog, Profile, Role } from "@/lib/types";
import { api } from "@/lib/client";
export function Configuration({
  catalog,
  profile,
  reload,
}: {
  catalog: Catalog;
  profile: Profile;
  reload: () => Promise<void>;
}) {
  const [config, setConfig] = useState(catalog.config),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const allowed = profile.rol === "SUPER_ADMIN";
  const fields = (items: [keyof typeof config, string, boolean?][]) =>
    items.map(([key, label, multi]) => (
      <div className={`field ${multi ? "full" : ""}`} key={key}>
        <label htmlFor={`config-${key}`}>{label}</label>
        {multi ? (
          <textarea
            id={`config-${key}`}
            rows={5}
            maxLength={key === "privacidad" ? 10000 : 5000}
            value={String(config[key] || "")}
            disabled={!allowed || busy}
            onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
          />
        ) : (
          <input
            id={`config-${key}`}
            value={String(config[key] || "")}
            maxLength={200}
            disabled={!allowed || busy}
            onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
          />
        )}
      </div>
    ));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (
        config.privacidad !== catalog.config.privacidad &&
        config.privacidad_version === catalog.config.privacidad_version
      )
        throw new Error(
          "Cambia la versión del aviso al modificar el texto de privacidad.",
        );
      await api("admin/save", { entity: "configuracion", id: 1, data: config });
      setMessage("Configuración guardada.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!allowed && (
        <p className="notice">
          Puedes consultar la configuración. Solo SUPER_ADMIN puede modificarla.
        </p>
      )}
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
      <Tabs defaultValue="identity">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="identity">Identidad</TabsTrigger>
          <TabsTrigger value="location">Ubicación</TabsTrigger>
          <TabsTrigger value="privacy">Privacidad</TabsTrigger>
          <TabsTrigger value="information">Información</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>
        <form onSubmit={save}>
          <TabsContent value="identity">
            <section className="panel">
              <h2 className="section-title">Identidad institucional</h2>
              <div className="form-grid">
                {fields([
                  ["nombre", "Nombre del sistema"],
                  ["subtitulo", "Subtítulo"],
                  ["bienvenida", "Texto de bienvenida", true],
                ])}
                <Upload
                  label="Logo institucional"
                  bucket="branding"
                  value={config.logo_url}
                  onChange={(v) => setConfig({ ...config, logo_url: v })}
                  disabled={!allowed || busy}
                />
                <div className="full">
                  <CheckField
                    id="global-results"
                    label="Permitir la publicación de resultados"
                    checked={config.mostrar_resultados}
                    onChange={(v) =>
                      setConfig({ ...config, mostrar_resultados: v })
                    }
                    disabled={!allowed}
                  />
                </div>
              </div>
            </section>
          </TabsContent>
          <TabsContent value="location">
            <section className="panel">
              <h2 className="section-title">Ubicación predeterminada</h2>
              <div className="form-grid">
                {fields([
                  ["departamento", "Departamento"],
                  ["provincia", "Provincia"],
                  ["distrito", "Distrito"],
                ])}
              </div>
              <p>
                Esta ubicación se utiliza como valor inicial para nuevos sondeos
                y comunidades. Los registros existentes conservan su ámbito.
              </p>
              <Link href="/admin/encuestas" className="inline-link">
                Configurar títulos, periodos y publicación de cada sondeo
              </Link>
            </section>
          </TabsContent>
          <TabsContent value="privacy">
            <section className="panel">
              <h2 className="section-title">Aviso de privacidad</h2>
              {fields([
                ["privacidad_version", "Versión del aviso"],
                ["privacidad", "Texto de privacidad", true],
              ])}
              <p>
                Cada participación registra la versión aceptada y la fecha.
                Cambia la versión cuando actualices el texto.
              </p>
            </section>
          </TabsContent>
          <TabsContent value="information">
            <section className="panel">
              <h2 className="section-title">Información del sondeo</h2>
              <div className="form-grid">
                {fields([
                  ["responsable", "Responsable"],
                  ["ambito", "Ámbito"],
                  ["metodo", "Método de recolección", true],
                  ["financiacion", "Financiación", true],
                  [
                    "informacion_institucional",
                    "Información institucional",
                    true,
                  ],
                  ["observaciones", "Observaciones", true],
                ])}
              </div>
            </section>
          </TabsContent>
          {allowed && (
            <div className="actions">
              <button className="button" disabled={busy}>
                {busy ? "Guardando…" : "Guardar configuración"}
              </button>
            </div>
          )}
        </form>
        <TabsContent value="roles">
          <Roles profile={profile} />
        </TabsContent>
      </Tabs>
    </>
  );
}
function Roles({ profile }: { profile: Profile }) {
  const [rows, setRows] = useState<Profile[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [userId, setUserId] = useState(""),
    [name, setName] = useState(""),
    [role, setRole] = useState<Role>("VISUALIZADOR"),
    [active, setActive] = useState(true),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (profile.rol === "SUPER_ADMIN")
      api<Profile[]>("admin/profiles")
        .then(setRows)
        .catch((e) => setError(e.message));
  }, [profile.rol]);
  if (profile.rol !== "SUPER_ADMIN")
    return (
      <p className="notice">
        La administración de roles está reservada a SUPER_ADMIN.
      </p>
    );
  return (
    <section className="panel">
      <h2 className="section-title">Administradores y permisos</h2>
      <p>
        Crea la cuenta en Supabase Auth o mediante Primer acceso y copia su
        identificador de usuario. El rol no se toma de los datos enviados
        durante el registro.
      </p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="notice success">{message}</p>}
      <div className="role-list">
        {rows.map((r) => (
          <button
            key={r.id}
            className="role-item"
            onClick={() => {
              setUserId(r.id);
              setName(r.nombre);
              setRole(r.rol);
              setActive(r.activo);
            }}
          >
            <strong>{r.nombre}</strong>
            <span>
              {r.rol} · {r.activo ? "Activo" : "Inactivo"}
            </span>
          </button>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("admin/profile", {
              user_id: userId,
              nombre: name,
              rol: role,
              activo: active,
            });
            setRows(await api<Profile[]>("admin/profiles"));
            setMessage("Permisos guardados y auditados.");
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "No se pudo guardar.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor="role-id">ID de usuario de Supabase Auth</label>
            <input
              id="role-id"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="role-name">Nombre del administrador</label>
            <input
              id="role-name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <SelectField
            id="role-value"
            label="Rol"
            value={role}
            onChange={(v) => setRole(v as Role)}
            options={["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "VISUALIZADOR"].map(
              (v) => ({ value: v, label: v.replaceAll("_", " ") }),
            )}
          />
          <CheckField
            id="role-active"
            label="Cuenta activa"
            checked={active}
            onChange={setActive}
          />
        </div>
        <button className="button" disabled={busy}>
          {busy ? "Guardando…" : "Guardar permisos"}
        </button>
      </form>
    </section>
  );
}
