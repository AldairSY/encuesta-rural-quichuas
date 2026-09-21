"use client";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SelectField } from "@/components/form-controls";
import { api, peruDate } from "@/lib/client";
import type { Catalog, Profile } from "@/lib/types";
type Entity = "participantes" | "respuestas" | "fraud_events" | "audit_logs";
type Row = Record<string, unknown>;
interface ListData {
  rows: Row[];
  total: number;
  page: number;
  page_size: number;
}
const labels: Record<string, string> = {
  dni: "DNI",
  nombre_completo: "Participante",
  centro: "C.P. / Comunidad",
  estado: "Estado",
  fraud_score: "Riesgo",
  requiere_revision: "Revisión",
  fecha_registro: "Registro",
  fecha_respuesta: "Respuesta",
  candidato: "Opción",
  motivo: "Motivo",
  explicacion: "Explicación",
  created_at: "Fecha",
  tipo: "Evento",
  ip_hash: "IP hash",
  device_hash: "Dispositivo",
  nivel_riesgo: "Riesgo",
  descripcion: "Descripción",
  administrador: "Administrador",
  accion: "Acción",
  entidad: "Entidad",
  datos_anteriores: "Antes",
  datos_nuevos: "Después",
  metadata: "Detalle",
};
const columns: Record<Entity, string[]> = {
  participantes: [
    "dni",
    "nombre_completo",
    "centro",
    "estado",
    "fraud_score",
    "requiere_revision",
    "fecha_registro",
  ],
  respuestas: [
    "dni",
    "centro",
    "candidato",
    "estado",
    "fraud_score",
    "fecha_respuesta",
  ],
  fraud_events: [
    "created_at",
    "tipo",
    "dni",
    "centro",
    "ip_hash",
    "device_hash",
    "nivel_riesgo",
    "estado",
  ],
  audit_logs: [
    "created_at",
    "administrador",
    "accion",
    "entidad",
    "datos_anteriores",
    "datos_nuevos",
    "metadata",
  ],
};
const reasons = [
  "DUPLICADO_CONFIRMADO",
  "REGISTRO_DE_PRUEBA",
  "ABUSO_AUTOMATIZADO",
  "DATOS_INVALIDOS",
  "CORRECCION_ADMINISTRATIVA",
  "OTRO",
];
export function Records({
  entity,
  catalog,
  profile,
}: {
  entity: Entity;
  catalog: Catalog;
  profile: Profile;
}) {
  const [data, setData] = useState<ListData | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [centro, setCentro] = useState(""),
    [state, setState] = useState(""),
    [risk, setRisk] = useState(""),
    [desde, setDesde] = useState(""),
    [hasta, setHasta] = useState(""),
    [survey, setSurvey] = useState(""),
    [reload, setReload] = useState(0),
    [loading, setLoading] = useState(false),
    [row, setRow] = useState<Row | null>(null),
    [reviewState, setReviewState] = useState(""),
    [reason, setReason] = useState("CORRECCION_ADMINISTRATIVA"),
    [explanation, setExplanation] = useState(""),
    [busy, setBusy] = useState(false),
    [fullDni, setFullDni] = useState(""),
    [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const canReview = ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"].includes(
      profile.rol,
    ),
    canEdit = ["SUPER_ADMIN", "ADMIN"].includes(profile.rol);
  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({
      entity,
      page: String(page),
      search: query,
      estado: state,
      riesgo: risk,
    });
    if (centro) params.set("centro", centro);
    if (survey) params.set("encuesta", survey);
    if (desde)
      params.set("desde", new Date(`${desde}T00:00:00-05:00`).toISOString());
    if (hasta)
      params.set(
        "hasta",
        new Date(
          new Date(`${hasta}T00:00:00-05:00`).getTime() + 86400000,
        ).toISOString(),
      );
    Promise.resolve().then(() => {
      if (alive) setLoading(true);
    });
    api<ListData>(`admin/list?${params}`)
      .then((d) => {
        if (alive) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    if (entity === "fraud_events")
      api<Record<string, number>>("admin/dashboard")
        .then((m) => {
          if (alive) setMetrics(m);
        })
        .catch(() => {});
    return () => {
      alive = false;
    };
  }, [entity, page, query, centro, state, risk, desde, hasta, survey, reload]);
  const filter = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    setPage(1);
  };
  function open(r: Row) {
    setRow(r);
    setReviewState(String(r.estado));
    setReason("CORRECCION_ADMINISTRATIVA");
    setExplanation("");
    setFullDni("");
    setError("");
  }
  async function review() {
    if (!row) return;
    setBusy(true);
    setError("");
    try {
      if (entity === "respuestas")
        await api("admin/review", {
          id: row.id,
          estado: reviewState,
          motivo: reason,
          explicacion: explanation,
        });
      if (entity === "participantes")
        await api("admin/participant", {
          id: row.id,
          estado: reviewState,
          motivo: explanation,
        });
      if (entity === "fraud_events")
        await api("admin/fraud-review", { id: row.id });
      setRow(null);
      setReload((v) => v + 1);
      setMessage("La revisión se guardó y quedó registrada en auditoría.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  const states =
    entity === "participantes"
      ? ["ACTIVO", "INACTIVO"]
      : entity === "respuestas"
        ? ["VALIDA", "EN_REVISION", "INVALIDADA"]
        : entity === "fraud_events"
          ? ["PENDIENTE", "REVISADO"]
          : [];
  return (
    <>
      {entity === "fraud_events" && metrics && (
        <div className="fraud-metrics">
          {[
            ["Alertas hoy", "alertas_hoy"],
            ["Riesgo alto", "riesgo_alto"],
            ["Pendientes", "alertas"],
            ["Nombres coincidentes", "nombres_coincidentes"],
            ["Actividad inusual", "actividad_inusual"],
          ].map(([name, key]) => (
            <div className="dashboard-stat" key={key}>
              <span>{name}</span>
              <strong>{metrics[key]}</strong>
            </div>
          ))}
        </div>
      )}
      <form
        className="record-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search);
        }}
      >
        <div className="field">
          <label htmlFor="record-search">
            {entity === "audit_logs"
              ? "Acción o entidad"
              : entity === "fraud_events"
                ? "Tipo de evento"
                : "DNI exacto o nombre"}
          </label>
          <input
            id="record-search"
            maxLength={160}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {entity !== "audit_logs" && (
          <>
            <SelectField
              id="record-centro"
              label="Comunidad"
              value={centro}
              onChange={filter(setCentro)}
              options={[
                { value: "", label: "Todas" },
                ...catalog.centros.map((c) => ({
                  value: c.id,
                  label: c.nombre,
                })),
              ]}
            />
            <SelectField
              id="record-state"
              label="Estado"
              value={state}
              onChange={filter(setState)}
              options={[
                { value: "", label: "Todos" },
                ...states.map((v) => ({
                  value: v,
                  label: v.replaceAll("_", " "),
                })),
              ]}
            />
            <SelectField
              id="record-risk"
              label="Riesgo"
              value={risk}
              onChange={filter(setRisk)}
              options={["", "BAJO", "MEDIO", "ALTO", "CRITICO"].map((v) => ({
                value: v,
                label: v || "Todos",
              }))}
            />
          </>
        )}
        {["respuestas", "fraud_events"].includes(entity) && (
          <SelectField
            id="record-survey"
            label="Encuesta"
            value={survey}
            onChange={filter(setSurvey)}
            options={[
              { value: "", label: "Todas" },
              ...catalog.encuestas.map((e) => ({
                value: e.id,
                label: e.titulo,
              })),
            ]}
          />
        )}
        <div className="field">
          <label htmlFor="from-date">Desde · Perú</label>
          <input
            id="from-date"
            type="date"
            value={desde}
            onChange={(e) => filter(setDesde)(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="to-date">Hasta · Perú</label>
          <input
            id="to-date"
            type="date"
            value={hasta}
            onChange={(e) => filter(setHasta)(e.target.value)}
          />
        </div>
        <button className="button" type="submit">
          Buscar
        </button>
      </form>
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {error && !row && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="table-panel" aria-busy={loading}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns[entity].map((c) => (
                <TableHead key={c}>{labels[c]}</TableHead>
              ))}
              {entity !== "audit_logs" && <TableHead>Revisión</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.rows.map((r) => (
              <TableRow key={String(r.id)}>
                {columns[entity].map((c) => (
                  <TableCell key={c}>
                    {r[c] === null || r[c] === undefined ? (
                      "—"
                    ) : typeof r[c] === "object" ? (
                      <details>
                        <summary>Ver detalle</summary>
                        <pre className="audit-json">
                          {JSON.stringify(r[c], null, 2)}
                        </pre>
                      </details>
                    ) : c.startsWith("fecha_") || c === "created_at" ? (
                      peruDate(String(r[c]))
                    ) : typeof r[c] === "boolean" ? (
                      r[c] ? (
                        "Sí"
                      ) : (
                        "No"
                      )
                    ) : ["estado", "nivel_riesgo"].includes(c) ? (
                      <span className="tag">{String(r[c])}</span>
                    ) : (
                      String(r[c])
                    )}
                  </TableCell>
                ))}
                {entity !== "audit_logs" && (
                  <TableCell>
                    {(entity === "participantes" ? canEdit : canReview) ? (
                      <button className="row-action" onClick={() => open(r)}>
                        Revisar
                      </button>
                    ) : (
                      "Solo lectura"
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {!data?.rows.length && (
              <TableRow>
                <TableCell colSpan={columns[entity].length + 1}>
                  <div className="table-empty">
                    {loading
                      ? "Consultando registros…"
                      : "No se encontraron registros."}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="pagination-row">
        <span>
          {data?.total || 0} registros · Página {page} de{" "}
          {Math.max(1, Math.ceil((data?.total || 0) / 25))}
        </span>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page <= 1}
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage((v) => v - 1);
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page * 25 >= (data?.total || 0)}
                onClick={(e) => {
                  e.preventDefault();
                  if (page * 25 < (data?.total || 0)) setPage((v) => v + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
      <Dialog
        open={!!row}
        onOpenChange={(v) => {
          if (!v && !busy) setRow(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisión administrativa</DialogTitle>
            <DialogDescription>
              Los cambios quedan registrados y requieren una decisión
              justificada.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <p>DNI: {fullDni || String(row?.dni || "No asociado")}</p>
          {entity === "fraud_events" ? (
            <>
              <p>{String(row?.tipo)}</p>
              <p>{String(row?.descripcion || "")}</p>
              <p>
                Marcar una alerta como revisada no cambia el estado de la
                respuesta. Gestiona la respuesta desde su sección.
              </p>
            </>
          ) : (
            <>
              <SelectField
                id="review-state"
                label="Nuevo estado"
                value={reviewState}
                onChange={setReviewState}
                options={states.map((v) => ({
                  value: v,
                  label: v.replaceAll("_", " "),
                }))}
              />
              {entity === "respuestas" && (
                <SelectField
                  id="review-reason"
                  label="Motivo"
                  value={reason}
                  onChange={setReason}
                  options={reasons.map((v) => ({
                    value: v,
                    label: v.replaceAll("_", " "),
                  }))}
                />
              )}
              <div className="field">
                <label htmlFor="review-explanation">
                  Explicación{" "}
                  {entity === "participantes" || reason === "OTRO"
                    ? "(obligatoria, mínimo 10 caracteres)"
                    : "(opcional)"}
                </label>
                <textarea
                  id="review-explanation"
                  value={explanation}
                  maxLength={2000}
                  rows={3}
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </div>
              {entity === "participantes" && (
                <button
                  className="inline-link"
                  disabled={busy || explanation.trim().length < 10}
                  onClick={async () => {
                    try {
                      setFullDni(
                        (
                          await api<{ dni: string }>("admin/reveal", {
                            id: row?.id,
                            motivo: explanation,
                          })
                        ).dni,
                      );
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Acceso denegado.",
                      );
                    }
                  }}
                >
                  Consultar DNI completo con el motivo indicado
                </button>
              )}
              {entity === "participantes" && (
                <p className="notice">
                  Cambiar el estado del participante no modifica su respuesta.
                  Para invalidar una respuesta, usa la sección Respuestas.
                </p>
              )}
            </>
          )}
          <div className="actions">
            <button
              className="button"
              disabled={
                busy ||
                (entity === "participantes" &&
                  explanation.trim().length < 10) ||
                (entity === "respuestas" &&
                  reason === "OTRO" &&
                  explanation.trim().length < 10)
              }
              onClick={review}
            >
              {busy
                ? "Guardando…"
                : entity === "fraud_events"
                  ? "Marcar revisado"
                  : "Guardar revisión"}
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setRow(null)}
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
