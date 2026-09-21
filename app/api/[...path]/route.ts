import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sb, rpc, publicData, environment, ApiError } from "@/lib/server";
import { authContext, setSession, clearSession } from "@/lib/auth";
import { entitySchemas, listSchema } from "@/lib/schemas";
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
  if (e instanceof z.ZodError)
    return response(
      { message: e.issues[0]?.message || "Revisa los datos ingresados." },
      400,
    );
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
  const [config, encuestas, centros, candidatos] = await Promise.all([
    sb<Config[]>("/rest/v1/configuracion?select=*", {}, token),
    sb(
      "/rest/v1/encuestas?select=id,titulo,descripcion,departamento,provincia,distrito,fecha_inicio,fecha_fin,estado,mostrar_resultados&order=created_at.desc&limit=300",
      {},
      token,
    ),
    sb(
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
  return { config: config[0], encuestas, centros, candidatos };
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
      const [rows, summary, centros] = await Promise.all([
        rpc("get_resultados_por_centro", {
          encuesta_uuid: id,
          centro_poblado_uuid: centro,
        }),
        rpc("get_resumen_publico", { encuesta_uuid: id }),
        rpc("get_participacion_centros", { encuesta_uuid: id }),
      ]);
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
      const png =
        bytes[0] === 137 &&
        bytes[1] === 80 &&
        bytes[2] === 78 &&
        bytes[3] === 71 &&
        bytes[4] === 13 &&
        bytes[5] === 10 &&
        bytes[6] === 26 &&
        bytes[7] === 10;
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const webp =
        new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
        new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
      const mime = png
        ? "image/png"
        : jpeg
          ? "image/jpeg"
          : webp
            ? "image/webp"
            : "";
      if (!mime || file.type !== mime)
        return response(
          { message: "Solo se aceptan imágenes JPEG, PNG o WEBP válidas." },
          400,
        );
      const name = `${crypto.randomUUID()}.${png ? "png" : jpeg ? "jpg" : "webp"}`;
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
