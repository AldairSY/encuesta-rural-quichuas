import type { Config, Encuesta, Resumen } from "./types";
export function environment() {
  return {
    url: process.env.SUPABASE_URL || "",
    key: process.env.SUPABASE_ANON_KEY || "",
  };
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function sb<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const { url, key } = environment();
  if (!url || !key)
    throw new ApiError(
      503,
      "CONFIG",
      "El servicio todavía no está configurado.",
    );
  const res = await fetch(`${url}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token || key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const value = await res.json().catch(() => null);
  const error = value as { code?: string; message?: string } | null;
  if (!res.ok)
    throw new ApiError(
      res.status,
      error?.code || "SERVICE",
      error?.message || "No se pudo completar la operación.",
    );
  return value as T;
}
export async function rpc<T = Record<string, unknown>>(
  name: string,
  body: unknown = {},
  token?: string,
) {
  return sb<T>(
    `/rest/v1/rpc/${name}`,
    { method: "POST", body: JSON.stringify(body) },
    token,
  );
}
export async function publicData() {
  try {
    const [configs, encuestas] = await Promise.all([
      sb<Config[]>("/rest/v1/configuracion?select=*"),
      sb<Encuesta[]>(
        "/rest/v1/encuestas?select=id,titulo,descripcion,departamento,provincia,distrito,fecha_inicio,fecha_fin,estado,mostrar_resultados&order=created_at.desc",
      ),
    ]);
    const encuesta =
      (encuestas as Encuesta[]).find((e) => e.estado === "ACTIVA") ||
      encuestas[0];
    const resumen = await rpc<Resumen>("get_resumen_publico", {
      encuesta_uuid: encuesta?.id || null,
    });
    return {
      config: (configs[0] || null) as Config | null,
      encuestas: encuestas as Encuesta[],
      resumen,
      error: false,
    };
  } catch {
    return {
      config: null,
      encuestas: [] as Encuesta[],
      resumen: null,
      error: true,
    };
  }
}
