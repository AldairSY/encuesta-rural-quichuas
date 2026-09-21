import {
  validateParticipation,
  friendlyErrors,
  uuidPattern,
} from "../_shared/validation.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
async function digest(value: string, scope: string) {
  const secret =
    Deno.env.get("IP_HASH_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("Unavailable");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`encuesta-rural:v1:${scope}:${value}`),
  );
  return Array.from(new Uint8Array(bytes), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
async function rpc(name: string, body: unknown) {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/${name}`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error("Database unavailable");
  return res.json();
}
function reply(code: string, status = 400) {
  return Response.json(
    {
      ok: false,
      code,
      message: friendlyErrors[code] || friendlyErrors.SERVICE,
    },
    {
      status,
      headers: { ...cors, ...(status === 429 ? { "Retry-After": "60" } : {}) },
    },
  );
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply("DATOS_INVALIDOS", 405);
  try {
    if (Number(req.headers.get("content-length") || 0) > 8192)
      return reply("DATOS_INVALIDOS", 413);
    const text = await req.text();
    if (new TextEncoder().encode(text).length > 8192)
      return reply("DATOS_INVALIDOS", 413);
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(text);
    } catch {
      return reply("DATOS_INVALIDOS");
    }
    // Supabase's managed gateway appends the peer address. Never trust the user-controlled first XFF entry.
    const peer = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
    const ip = peer && /^[0-9a-f:.]+$/i.test(peer) ? peer : null;
    const device =
      typeof input?.device_id === "string" && uuidPattern.test(input.device_id)
        ? input.device_id
        : null;
    const ipHash = ip ? await digest(ip, "ip") : null;
    const deviceHash = device ? await digest(device, "device") : null;
    if (
      !(await rpc("consume_attempt", {
        p_ip_hash: ipHash,
        p_device_hash: deviceHash,
      }))
    )
      return reply("RATE_LIMIT", 429);
    const checked = validateParticipation(input);
    if (!checked.ok) return reply(checked.code);
    const v = checked.data;
    const result = await rpc("registrar_participacion", {
      p_dni: v.dni,
      p_nombres: v.nombres,
      p_apellido_paterno: v.apellido_paterno,
      p_apellido_materno: v.apellido_materno,
      p_centro_poblado_id: v.centro_poblado_id,
      p_encuesta_id: v.encuesta_id,
      p_candidato_id: v.candidato_id,
      p_ip_hash: ipHash,
      p_device_hash: deviceHash,
      p_session_id: v.session_id,
      p_user_agent: (req.headers.get("user-agent") || "").slice(0, 180),
      p_privacidad_version: v.privacidad_version,
      p_acepta_privacidad: v.acepta_privacidad,
    });
    if (!result.ok)
      return reply(result.code, result.code === "DNI_DUPLICADO" ? 409 : 400);
    return Response.json({ ok: true }, { headers: cors });
  } catch {
    return reply("SERVICE", 503);
  }
});
