import { z } from "zod";
const short = z.string().trim().min(2).max(200);
const nullable = z.string().trim().max(2000).nullable().optional();
const image = z
  .string()
  .url()
  .refine((s) => s.startsWith("https://"))
  .nullable()
  .optional();
export const entitySchemas = {
  encuestas: z
    .object({
      titulo: short,
      descripcion: z.string().max(5000),
      departamento: short,
      provincia: short,
      distrito: short,
      fecha_inicio: z.string().datetime().nullable(),
      fecha_fin: z.string().datetime().nullable(),
      estado: z.enum([
        "BORRADOR",
        "PROGRAMADA",
        "ACTIVA",
        "CERRADA",
        "ARCHIVADA",
      ]),
      mostrar_resultados: z.boolean(),
    })
    .refine(
      (v) => !v.fecha_inicio || !v.fecha_fin || v.fecha_fin > v.fecha_inicio,
      "El cierre debe ser posterior al inicio.",
    )
    .refine(
      (v) =>
        !["ACTIVA", "PROGRAMADA"].includes(v.estado) ||
        (v.fecha_inicio && v.fecha_fin),
      "Define el inicio y cierre.",
    ),
  candidatos: z.object({
    encuesta_id: z.string().uuid(),
    nombre_completo: short,
    cargo: z.string().min(2).max(120),
    organizacion_politica: short,
    foto_url: image,
    simbolo_url: image,
    numero_lista: nullable,
    descripcion: nullable,
    orden_visual: z.number().int().min(0).max(10000),
    activo: z.boolean(),
  }),
  centros_poblados: z.object({
    nombre: z.string().trim().min(2).max(160),
    tipo: z.enum(["CENTRO_POBLADO", "COMUNIDAD", "ANEXO", "CASERIO", "OTRO"]),
    codigo: nullable,
    departamento: short,
    provincia: short,
    distrito: short,
    activo: z.boolean(),
  }),
  configuracion: z.object({
    nombre: z.string().trim().min(1).max(100),
    subtitulo: short,
    logo_url: image,
    departamento: short,
    provincia: short,
    distrito: short,
    bienvenida: z.string().min(10).max(2000),
    privacidad: z.string().min(20).max(10000),
    privacidad_version: z.string().min(1).max(100),
    informacion_institucional: z.string().max(5000),
    mostrar_resultados: z.boolean(),
    responsable: z.string().max(200),
    ambito: z.string().max(500),
    metodo: z.string().max(2000),
    financiacion: z.string().max(2000),
    observaciones: z.string().max(5000),
  }),
};
export const listSchema = z.object({
  entity: z.enum(["participantes", "respuestas", "fraud_events", "audit_logs"]),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  search: z.string().max(160).default(""),
  centro: z.string().uuid().nullable().default(null),
  estado: z.string().max(30).default(""),
  riesgo: z.enum(["", "BAJO", "MEDIO", "ALTO", "CRITICO"]).default(""),
  desde: z.string().datetime().nullable().default(null),
  hasta: z.string().datetime().nullable().default(null),
  encuesta: z.string().uuid().nullable().default(null),
});
