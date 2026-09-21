"use client";
import { useRef, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { SelectField, CheckField } from "@/components/form-controls";
import { CandidateCard } from "@/components/candidate-card";
import { api, peruDate } from "@/lib/client";
import type { Catalog, Profile, Candidato } from "@/lib/types";
type Entity = "encuestas" | "candidatos" | "centros_poblados";
type Values = Record<string, string | number | boolean | null>;
function localDate(v: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(v));
  return parts.replace(" ", "T");
}
export function Upload({
  label,
  bucket,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  bucket: string;
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="field">
      <label>
        {label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError("");
            if (file.size > 3145728) {
              setError("El máximo es 3 MB.");
              return;
            }
            setBusy(true);
            try {
              const form = new FormData();
              form.set("file", file);
              form.set("bucket", bucket);
              const res = await fetch("/api/admin/upload", {
                method: "POST",
                body: form,
              });
              const result = (await res.json()) as {
                url: string;
                message?: string;
              };
              if (!res.ok) throw new Error(result.message);
              onChange(result.url);
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "No se pudo subir la imagen.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <small>JPEG, PNG o WEBP · hasta 3 MB{busy ? " · Subiendo…" : ""}</small>
      {value && (
        <div className="upload-preview">
          <img src={value} alt={`Vista previa: ${label}`} />
          <button
            className="inline-link"
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Quitar de este registro
          </button>
        </div>
      )}
      {error && (
        <span className="notice error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
export function CatalogManager({
  entity,
  catalog,
  profile,
  reload,
}: {
  entity: Entity;
  catalog: Catalog;
  profile: Profile;
  reload: () => Promise<void>;
}) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [open, setOpen] = useState(false),
    [id, setId] = useState<string | null>(null),
    [values, setValues] = useState<Values>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const allowed = ["SUPER_ADMIN", "ADMIN"].includes(profile.rol);
  const needsSurvey = entity === "candidatos" && !catalog.encuestas.length;
  const rows = (entity === "encuestas"
    ? catalog.encuestas
    : entity === "candidatos"
      ? catalog.candidatos
      : catalog.centros) as unknown as Values[];
  const title =
    entity === "encuestas"
      ? "encuesta"
      : entity === "candidatos"
        ? "candidato"
        : "comunidad";
  function edit(row?: Values) {
    const base: Values =
      entity === "encuestas"
        ? {
            titulo: "",
            descripcion: "",
            departamento: catalog.config.departamento,
            provincia: catalog.config.provincia,
            distrito: catalog.config.distrito,
            fecha_inicio: "",
            fecha_fin: "",
            estado: "BORRADOR",
            mostrar_resultados: true,
          }
        : entity === "candidatos"
          ? {
              encuesta_id: catalog.encuestas[0]?.id || "",
              nombre_completo: "",
              cargo: "",
              organizacion_politica: "",
              foto_url: null,
              simbolo_url: null,
              numero_lista: "",
              descripcion: "",
              orden_visual: 0,
              activo: true,
            }
          : {
              nombre: "",
              tipo: "CENTRO_POBLADO",
              codigo: "",
              departamento: catalog.config.departamento,
              provincia: catalog.config.provincia,
              distrito: catalog.config.distrito,
              activo: true,
            };
    const next = row ? { ...base, ...row } : base;
    delete next.id;
    if (entity === "encuestas") {
      next.fecha_inicio = next.fecha_inicio
        ? localDate(String(next.fecha_inicio))
        : "";
      next.fecha_fin = next.fecha_fin ? localDate(String(next.fecha_fin)) : "";
    }
    setId(row ? String(row.id) : null);
    setValues(next);
    setError("");
    setOpen(true);
  }
  const set = (key: string, value: string | number | boolean | null) =>
    setValues((v) => ({ ...v, [key]: value }));
  const text = (key: string, label: string, required = true, type = "text") => (
    <div className="field" key={key}>
      <label htmlFor={`edit-${key}`}>{label}</label>
      <input
        id={`edit-${key}`}
        type={type}
        required={required}
        maxLength={key === "nombre_completo" ? 200 : 200}
        min={type === "number" ? 0 : undefined}
        value={String(values[key] ?? "")}
        disabled={busy}
        onChange={(e) =>
          set(key, type === "number" ? Number(e.target.value) : e.target.value)
        }
      />
    </div>
  );
  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = { ...values };
      if (entity === "encuestas") {
        data.fecha_inicio = data.fecha_inicio
          ? new Date(`${data.fecha_inicio}:00-05:00`).toISOString()
          : null;
        data.fecha_fin = data.fecha_fin
          ? new Date(`${data.fecha_fin}:00-05:00`).toISOString()
          : null;
      }
      await api("admin/save", { entity, id, data });
      setOpen(false);
      setMessage("Los cambios se guardaron correctamente.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  const filtered = rows.filter(
    (r) =>
      String(r.titulo || r.nombre_completo || r.nombre)
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()) &&
      (!status ||
        (entity === "encuestas"
          ? r.estado === status
          : String(r.activo) === status)),
  );
  return (
    <>
      <div className="admin-toolbar">
        <div className="field">
          <label htmlFor="catalog-search">Buscar {title}</label>
          <input
            id="catalog-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Escribe un nombre…"
          />
        </div>
        <SelectField
          id="catalog-status"
          label="Estado"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "Todos" },
            ...(entity === "encuestas"
              ? [
                  "BORRADOR",
                  "PROGRAMADA",
                  "ACTIVA",
                  "CERRADA",
                  "ARCHIVADA",
                ].map((v) => ({ value: v, label: v }))
              : [
                  { value: "true", label: "Activo" },
                  { value: "false", label: "Inactivo" },
                ]),
          ]}
        />
        {allowed && (
          <button
            className="button"
            onClick={() => edit()}
            disabled={needsSurvey}
            title={needsSurvey ? "Primero crea una encuesta." : undefined}
          >
            <Plus size={18} />
            Nueva/o {title}
          </button>
        )}
      </div>
      {needsSurvey && (
        <p className="notice" role="status">
          Primero crea una encuesta. Cada candidato debe pertenecer a una.
        </p>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      <div className="table-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {entity === "encuestas" ? "Título" : "Nombre"}
              </TableHead>
              <TableHead>
                {entity === "encuestas"
                  ? "Periodo"
                  : entity === "candidatos"
                    ? "Organización / cargo"
                    : "Tipo / distrito"}
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={String(row.id)}>
                <TableCell>
                  <strong>
                    {String(row.titulo || row.nombre_completo || row.nombre)}
                  </strong>
                </TableCell>
                <TableCell>
                  {entity === "encuestas"
                    ? `${peruDate(row.fecha_inicio as string | null)} – ${peruDate(row.fecha_fin as string | null)}`
                    : entity === "candidatos"
                      ? `${row.organizacion_politica} / ${row.cargo}`
                      : `${row.tipo} / ${row.distrito}`}
                </TableCell>
                <TableCell>
                  <span className="tag">
                    {String(row.estado || (row.activo ? "ACTIVO" : "INACTIVO"))}
                  </span>
                </TableCell>
                <TableCell>
                  {allowed ? (
                    <button className="row-action" onClick={() => edit(row)}>
                      <Pencil size={16} />
                      Editar
                    </button>
                  ) : (
                    "Solo lectura"
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="table-empty">
                    No hay registros que mostrar.
                    {allowed && " Crea el primero con el botón superior."}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {id ? "Editar" : "Crear"} {title}
            </DialogTitle>
            <DialogDescription>
              {entity === "candidatos"
                ? "Carga los datos reales del candidato. Las imágenes son opcionales."
                : "Completa los campos y guarda los cambios."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save}>
            {error && (
              <p
                ref={errorRef}
                className="notice error"
                role="alert"
                tabIndex={-1}
              >
                {error}
              </p>
            )}
            <div className="form-grid">
              {entity === "encuestas" ? (
                <>
                  {text("titulo", "Título")}
                  {text("departamento", "Departamento")}
                  {text("provincia", "Provincia")}
                  {text("distrito", "Distrito")}
                  {text(
                    "fecha_inicio",
                    "Inicio · hora de Perú",
                    false,
                    "datetime-local",
                  )}
                  {text(
                    "fecha_fin",
                    "Cierre · hora de Perú",
                    false,
                    "datetime-local",
                  )}
                  <SelectField
                    id="edit-state"
                    label="Estado"
                    value={String(values.estado)}
                    onChange={(v) => set("estado", v)}
                    options={[
                      "BORRADOR",
                      "PROGRAMADA",
                      "ACTIVA",
                      "CERRADA",
                      "ARCHIVADA",
                    ].map((v) => ({ value: v, label: v }))}
                  />
                  <CheckField
                    id="edit-show"
                    label="Publicar resultados"
                    checked={Boolean(values.mostrar_resultados)}
                    onChange={(v) => set("mostrar_resultados", v)}
                  />
                </>
              ) : entity === "candidatos" ? (
                <>
                  <SelectField
                    id="edit-survey"
                    label="Encuesta"
                    value={String(values.encuesta_id)}
                    onChange={(v) => set("encuesta_id", v)}
                    disabled={!!id}
                    options={[
                      { value: "", label: "Seleccionar encuesta" },
                      ...catalog.encuestas.map((e) => ({
                        value: e.id,
                        label: e.titulo,
                      })),
                    ]}
                  />
                  {text("nombre_completo", "Nombre completo")}
                  {text("cargo", "Cargo")}
                  {text("organizacion_politica", "Organización política")}
                  {text("numero_lista", "Número de lista", false)}
                  {text("orden_visual", "Orden visual", true, "number")}
                  <Upload
                    label="Fotografía"
                    bucket="candidatos-fotos"
                    value={values.foto_url as string | null}
                    onChange={(v) => set("foto_url", v)}
                  />
                  <Upload
                    label="Símbolo"
                    bucket="candidatos-simbolos"
                    value={values.simbolo_url as string | null}
                    onChange={(v) => set("simbolo_url", v)}
                  />
                  <CheckField
                    id="edit-active"
                    label="Candidato activo"
                    checked={Boolean(values.activo)}
                    onChange={(v) => set("activo", v)}
                  />
                </>
              ) : (
                <>
                  {text("nombre", "Nombre")}
                  <SelectField
                    id="edit-type"
                    label="Tipo"
                    value={String(values.tipo)}
                    onChange={(v) => set("tipo", v)}
                    options={[
                      "CENTRO_POBLADO",
                      "COMUNIDAD",
                      "ANEXO",
                      "CASERIO",
                      "OTRO",
                    ].map((v) => ({ value: v, label: v.replaceAll("_", " ") }))}
                  />
                  {text("codigo", "Código (opcional)", false)}
                  {text("departamento", "Departamento")}
                  {text("provincia", "Provincia")}
                  {text("distrito", "Distrito")}
                  <CheckField
                    id="edit-active"
                    label="Comunidad activa"
                    checked={Boolean(values.activo)}
                    onChange={(v) => set("activo", v)}
                  />
                </>
              )}
              {entity !== "centros_poblados" && (
                <div className="field full">
                  <label htmlFor="edit-description">Descripción</label>
                  <textarea
                    id="edit-description"
                    rows={3}
                    maxLength={5000}
                    value={String(values.descripcion || "")}
                    onChange={(e) => set("descripcion", e.target.value)}
                  />
                </div>
              )}
            </div>
            {entity === "candidatos" && (
              <details className="candidate-preview">
                <summary>Vista previa de la tarjeta pública</summary>
                <CandidateCard
                  candidate={
                    {
                      ...values,
                      id: id || "",
                      nombre_completo:
                        values.nombre_completo || "Nombre del candidato",
                      cargo: values.cargo || "Cargo",
                      organizacion_politica:
                        values.organizacion_politica || "Organización política",
                    } as unknown as Candidato
                  }
                />
              </details>
            )}
            <div className="actions">
              <button className="button" disabled={busy}>
                {busy ? "Guardando…" : "Guardar cambios"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
