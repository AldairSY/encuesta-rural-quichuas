import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { sb, rpc, publicData, environment, ApiError } from "@/lib/server";
import { authContext, setSession, clearSession } from "@/lib/auth";
import { entitySchemas, listSchema } from "@/lib/schemas";
import { detectImageMime, imageExtension } from "@/lib/upload";
import type { AuthSession } from "@/lib/auth";
import type { Config, Profile } from "@/lib/types";
const writeRoles = ["SUPER_ADMIN", "ADMIN"];
function response(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}
function handleError(e: unknown) {
  if (e instanceof z.ZodError) {
    const issue = e.issues[0];
    const field = String(issue?.path.at(-1) || "");
    const labels: Record<string, string> = {
      encuesta_id: "Encuesta",
      nombre_completo: "Nombre completo",
      cargo: "Cargo",
      organizacion_politica: "Organización política",
      descripcion: "Descripción",
      orden_visual: "Orden visual",
      nombre: "Nombre",
      departamento: "Departamento",
      provincia: "Provincia",
      distrito: "Distrito",
    };
    const label = labels[field] || "datos ingresados";
    const detail =
      issue?.code === "too_big"
        ? `El campo «${label}» supera el máximo permitido.`
        : issue?.code === "too_small"
          ? `Completa correctamente el campo «${label}».`
          : `Revisa el campo «${label}».`;
    return response({ message: detail }, 400);
  }
  if (e instanceof ApiError) {
    const message =
      e.code === "23505"
        ? "El registro ya existe."
        : e.code === "42501"
          ? "No tienes permiso para esta operación."
          : e.status === 401
            ? "Correo o contraseña incorrectos, o sesión vencida."
            : e.status === 403
              ? "Tu cuenta no tiene permisos para esta operación."
              : e.code === "CONFIG"
                ? e.message
                : "No se pudo completar la operación. Revisa los datos e inténtalo nuevamente.";
    return response(
      { message },
      e.status >= 500
        ? 503
        : e.status === 401
          ? 401
          : e.status === 403
            ? 403
            : 400,
    );
  }
  return response(
    { message: "No se pudo completar la operación. Inténtalo nuevamente." },
    500,
  );
}
async function catalogs(token?: string) {
  const [configs, encuestasRaw, centrosRaw, candidatos] = await Promise.all([
    sb<Config[]>("/rest/v1/configuracion?select=*", {}, token),
    sb<Record<string, unknown>[]>(
      "/rest/v1/encuestas?select=id,titulo,descripcion,departamento,provincia,distrito,fecha_inicio,fecha_fin,estado,mostrar_resultados&order=created_at.desc&limit=300",
      {},
      token,
    ),
    sb<Record<string, unknown>[]>(
      "/rest/v1/centros_poblados?select=id,nombre,tipo,codigo,departamento,provincia,distrito,activo&order=nombre&limit=1000",
      {},
      token,
    ),
    sb(
      "/rest/v1/candidatos?select=id,encuesta_id,nombre_completo,cargo,organizacion_politica,foto_url,simbolo_url,numero_lista,descripcion,orden_visual,activo&order=orden_visual,nombre_completo&limit=1000",
      {},
      token,
    ),
  ]);

  const configRaw = configs[0];
  const config = configRaw
    ? {
        ...configRaw,
        distrito:
          configRaw.distrito === "Andamarca"
            ? "Quichuas"
            : configRaw.distrito || "Quichuas",
        provincia:
          configRaw.provincia === "Concepción"
            ? "Tayacaja"
            : configRaw.provincia || "Tayacaja",
        departamento:
          configRaw.departamento === "Junín"
            ? "Huancavelica"
            : configRaw.departamento || "Huancavelica",
      }
    : configRaw;

  const encuestas = (encuestasRaw || []).map((e) => ({
    ...e,
    titulo: String(e.titulo || "")
      .replaceAll("Andamarca", "Quichuas")
      .replaceAll(
        "Municipalidad Distrital de Andamarca",
        "Municipalidad Distrital de Quichuas",
      ),
    descripcion: String(e.descripcion || "")
      .replaceAll("Andamarca", "Quichuas")
      .replaceAll("Concepción", "Tayacaja")
      .replaceAll("Junín", "Huancavelica")
      .replaceAll(
        "Municipalidad Distrital de Andamarca",
        "Municipalidad Distrital de Quichuas",
      ),
    distrito: e.distrito === "Andamarca" ? "Quichuas" : e.distrito,
    provincia: e.provincia === "Concepción" ? "Tayacaja" : e.provincia,
    departamento: e.departamento === "Junín" ? "Huancavelica" : e.departamento,
  }));

  const centros = (centrosRaw || []).map((c) => ({
    ...c,
    distrito: c.distrito === "Andamarca" ? "Quichuas" : c.distrito,
    provincia: c.provincia === "Concepción" ? "Tayacaja" : c.provincia,
    departamento: c.departamento === "Junín" ? "Huancavelica" : c.departamento,
  }));

  return { config, encuestas, centros, candidatos };
}
export async function GET(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname.replace("/api/", "");
    if (path === "public")
      return response({ ...(await catalogs()), connection: environment() });
    if (path === "summary") return response(await publicData());
    if (path === "results") {
      const id = z
        .string()
        .uuid()
        .parse(req.nextUrl.searchParams.get("encuesta"));
      const centro = z
        .string()
        .uuid()
        .nullable()
        .parse(req.nextUrl.searchParams.get("centro"));
      const [rowsRaw, summaryRaw, centrosRaw] = await Promise.all([
        rpc<
          {
            candidato_id: string;
            nombre_candidato: string;
            organizacion_politica: string;
            foto_url: string | null;
            simbolo_url: string | null;
            cantidad_respuestas: number;
            porcentaje: number;
          }[]
        >("get_resultados_por_centro", {
          encuesta_uuid: id,
          centro_poblado_uuid: centro,
        }),
        rpc<{
          total_participaciones: number | null;
          total_centros_poblados: number;
          total_comunidades: number;
          ultima_actualizacion: string | null;
        }>("get_resumen_publico", { encuesta_uuid: id }),
        rpc("get_participacion_centros", { encuesta_uuid: id }),
      ]);

      let rows = rowsRaw || [];
      let summary = summaryRaw;
      const centros = centrosRaw || [];

      const totalReal =
        (summary?.total_participaciones ?? 0) > 0 ||
        rows.some((r) => Number(r.cantidad_respuestas) > 0);

      if (!totalReal && !centro) {
        try {
          const jar = await cookies();
          const token = jar.get("rural_access")?.value;
          const simRows = await sb<
            {
              candidato_id: string;
              porcentaje: number;
              cantidad_simulada: number;
              total_simulado: number;
            }[]
          >(
            `/rest/v1/resultado_simulacion?select=candidato_id,porcentaje,cantidad_simulada,total_simulado&encuesta_id=eq.${id}`,
            {},
            token,
          );

          if (simRows && simRows.length > 0) {
            const simMap = new Map(simRows.map((s) => [s.candidato_id, s]));
            rows = rows
              .map((r) => {
                const sim = simMap.get(r.candidato_id);
                return {
                  ...r,
                  cantidad_respuestas: sim
                    ? sim.cantidad_simulada
                    : r.cantidad_respuestas,
                  porcentaje: sim ? Number(sim.porcentaje) : r.porcentaje,
                };
              })
              .sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje));

            const totalSim = simRows[0]?.total_simulado ?? 0;
            summary = {
              ...summary,
              total_participaciones: totalSim,
            };
          }
        } catch {
          // Si no hay token de admin o no se pudo consultar, continuar con valores reales
        }
      }

      return response({ rows, summary, centros });
    }
    const { token, profile } = await authContext();
    if (path === "auth/session") return response({ profile });
    if (path === "admin/catalogs") return response(await catalogs(token));
    if (path === "admin/dashboard")
      return response(await rpc("admin_dashboard", {}, token));
    if (path === "admin/list") {
      const q = listSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
      return response(
        await rpc(
          "admin_list",
          {
            p_entity: q.entity,
            p_page: q.page,
            p_search: q.search,
            p_centro: q.centro,
            p_estado: q.estado,
            p_riesgo: q.riesgo,
            p_desde: q.desde,
            p_hasta: q.hasta,
            p_encuesta: q.encuesta,
          },
          token,
        ),
      );
    }
    if (path === "admin/simulation") {
      const id = z
        .string()
        .uuid()
        .parse(req.nextUrl.searchParams.get("encuesta"));
      return response(
        await sb(
          `/rest/v1/resultado_simulacion?select=candidato_id,porcentaje,cantidad_simulada,total_simulado&encuesta_id=eq.${id}`,
          {},
          token,
        ),
      );
    }
    if (path === "admin/results") {
      const id = z
        .string()
        .uuid()
        .parse(req.nextUrl.searchParams.get("encuesta"));
      return response(
        await rpc("get_resultados_admin", { p_encuesta: id }, token),
      );
    }
    if (path === "admin/profiles") {
      if (profile.rol !== "SUPER_ADMIN") throw new ApiError(403, "ROLE", "");
      return response(
        await sb(
          "/rest/v1/profiles?select=id,nombre,rol,activo&order=created_at&limit=200",
          {},
          token,
        ),
      );
    }
    return response({ message: "Recurso no encontrado." }, 404);
  } catch (e) {
    return handleError(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    const expected = process.env.APP_ORIGIN || req.nextUrl.origin;
    if (!origin || origin !== expected) throw new ApiError(403, "ORIGIN", "");
    const path = req.nextUrl.pathname.replace("/api/", "");
    if (Number(req.headers.get("content-length") || 0) > 3300000)
      return response(
        { message: "El archivo supera el tamaño permitido." },
        413,
      );
    if (path === "auth/login" || path === "auth/signup") {
      const input = z
        .object({
          email: z.string().email().max(254),
          password: z.string().min(12).max(128),
        })
        .parse(await req.json());
      if (path === "auth/signup") {
        await sb("/auth/v1/signup", {
          method: "POST",
          body: JSON.stringify(input),
        });
        return response({
          message:
            "Revisa tu correo y confirma la cuenta. Después podrás iniciar sesión. Si tu correo está autorizado, se activará tu acceso.",
        });
      }
      const session = await sb<AuthSession>(
        "/auth/v1/token?grant_type=password",
        { method: "POST", body: JSON.stringify(input) },
      );
      await rpc("claim_admin_enrollment", {}, session.access_token);
      const profiles = await sb<Profile[]>(
        `/rest/v1/profiles?select=id,rol,activo&id=eq.${session.user.id}&activo=eq.true`,
        {},
        session.access_token,
      );
      if (!profiles.length) throw new ApiError(403, "ROLE", "");
      await setSession(session);
      return response({ ok: true });
    }
    if (path === "auth/logout") {
      try {
        const a = await authContext();
        await sb("/auth/v1/logout", { method: "POST" }, a.token);
      } catch {}
      await clearSession();
      return response({ ok: true });
    }
    const { token, profile } = await authContext();
    if (path === "admin/upload") {
      if (!writeRoles.includes(profile.rol))
        throw new ApiError(403, "ROLE", "");
      const form = await req.formData();
      const file = form.get("file");
      const bucket = z
        .enum(["candidatos-fotos", "candidatos-simbolos", "branding"])
        .parse(form.get("bucket"));
      if (bucket === "branding" && profile.rol !== "SUPER_ADMIN")
        throw new ApiError(403, "ROLE", "");
      if (!(file instanceof File) || file.size > 3145728 || file.size < 12)
        return response(
          { message: "Selecciona una imagen de hasta 3 MB." },
          400,
        );
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = detectImageMime(bytes);
      if (!mime)
        return response(
          { message: "Solo se aceptan imágenes JPEG, PNG o WEBP válidas." },
          400,
        );
      const name = `${crypto.randomUUID()}.${imageExtension(mime)}`;
      const env = environment();
      const uploaded = await fetch(
        `${env.url}/storage/v1/object/${bucket}/${name}`,
        {
          method: "POST",
          headers: {
            apikey: env.key,
            Authorization: `Bearer ${token}`,
            "Content-Type": mime,
            "x-upsert": "false",
          },
          body: bytes,
        },
      );
      if (!uploaded.ok) throw new ApiError(400, "UPLOAD", "");
      return response({
        url: `${env.url}/storage/v1/object/public/${bucket}/${name}`,
      });
    }
    const body = z.record(z.unknown()).parse(await req.json());
    if (path === "admin/save") {
      const { entity, id, data } = z
        .object({
          entity: z.enum([
            "encuestas",
            "candidatos",
            "centros_poblados",
            "configuracion",
          ]),
          id: z.union([z.string().uuid(), z.literal(1)]).nullable(),
          data: z.unknown(),
        })
        .parse(body);
      if (
        !writeRoles.includes(profile.rol) ||
        (entity === "configuracion" && profile.rol !== "SUPER_ADMIN")
      )
        throw new ApiError(403, "ROLE", "");
      const validated = entitySchemas[entity].parse(data);
      if (entity === "configuracion" && id !== 1)
        throw new ApiError(400, "INPUT", "");
      await sb(
        `/rest/v1/${entity}${id ? `?id=eq.${id}` : ""}`,
        {
          method: id ? "PATCH" : "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify(validated),
        },
        token,
      );
      return response({ ok: true });
    }
    if (path === "admin/review") {
      const b = z
        .object({
          id: z.string().uuid(),
          estado: z.enum(["VALIDA", "EN_REVISION", "INVALIDADA"]),
          motivo: z.enum([
            "DUPLICADO_CONFIRMADO",
            "REGISTRO_DE_PRUEBA",
            "ABUSO_AUTOMATIZADO",
            "DATOS_INVALIDOS",
            "CORRECCION_ADMINISTRATIVA",
            "OTRO",
          ]),
          explicacion: z.string().max(2000),
        })
        .parse(body);
      await rpc(
        "review_response",
        {
          p_id: b.id,
          p_estado: b.estado,
          p_motivo: b.motivo,
          p_explicacion: b.explicacion,
        },
        token,
      );
      return response({ ok: true });
    }
    if (path === "admin/fraud-review") {
      await rpc(
        "review_fraud",
        { p_id: z.string().uuid().parse(body.id) },
        token,
      );
      return response({ ok: true });
    }
    if (path === "admin/participant") {
      const b = z
        .object({
          id: z.string().uuid(),
          estado: z.enum(["ACTIVO", "INACTIVO"]),
          motivo: z.string().min(10).max(2000),
        })
        .parse(body);
      await rpc(
        "update_participant",
        { p_id: b.id, p_estado: b.estado, p_motivo: b.motivo },
        token,
      );
      return response({ ok: true });
    }
    if (path === "admin/reveal") {
      const b = z
        .object({ id: z.string().uuid(), motivo: z.string().min(10).max(2000) })
        .parse(body);
      return response({
        dni: await rpc("reveal_dni", { p_id: b.id, p_motivo: b.motivo }, token),
      });
    }
    if (path === "admin/simulation") {
      const b = z
        .object({
          encuesta: z.string().uuid(),
          total: z.number().int().min(0).max(10000000),
          valores: z
            .array(
              z.object({
                candidato_id: z.string().uuid(),
                porcentaje: z.number().min(0).max(100),
              }),
            )
            .min(1)
            .max(300),
        })
        .parse(body);
      await rpc(
        "save_simulation",
        { p_encuesta: b.encuesta, p_valores: b.valores, p_total: b.total },
        token,
      );
      return response({ ok: true });
    }
    if (path === "admin/simulation-reset") {
      await rpc(
        "reset_simulation",
        { p_encuesta: z.string().uuid().parse(body.encuesta) },
        token,
      );
      return response({ ok: true });
    }
    if (path === "admin/profile") {
      const b = z
        .object({
          user_id: z.string().uuid(),
          nombre: z.string().min(2).max(120),
          rol: z.enum(["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "VISUALIZADOR"]),
          activo: z.boolean(),
        })
        .parse(body);
      await rpc(
        "manage_profile",
        {
          p_user_id: b.user_id,
          p_nombre: b.nombre,
          p_rol: b.rol,
          p_activo: b.activo,
        },
        token,
      );
      return response({ ok: true });
    }
    return response({ message: "Recurso no encontrado." }, 404);
  } catch (e) {
    return handleError(e);
  }
}
