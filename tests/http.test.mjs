import test from "node:test";
import assert from "node:assert/strict";
const origin = process.env.TEST_ORIGIN || "http://localhost:5173";
// Permite probar por un puerto local distinto del origen fijado en el servidor.
const requestOrigin = process.env.APP_ORIGIN || origin;
let catalog;
test("Catálogo se obtiene del Supabase configurado", async () => {
  const res = await fetch(`${origin}/api/public`);
  assert.equal(res.status, 200);
  catalog = await res.json();
  assert(catalog.config.nombre);
  const claims = JSON.parse(
    Buffer.from(catalog.connection.key.split(".")[1], "base64url"),
  );
  assert.equal(claims.role, "anon");
  assert.match(catalog.connection.url, /^https:\/\/.+\.supabase\.co$/);
});
for (const path of [
  "/",
  "/participar",
  "/resultados",
  "/informacion",
  "/admin",
])
  test(`Ruta ${path}`, async () => {
    const res = await fetch(origin + path);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert(text.includes("Encuesta Rural") || text.includes("ENCUESTA RURAL"));
  });
test("Página admin privada redirige sin sesión", async () => {
  const res = await fetch(`${origin}/admin/dashboard`, { redirect: "manual" });
  assert([303, 307].includes(res.status));
  assert(res.headers.get("location").includes("/admin"));
});
test("API admin deniega acceso sin sesión", async () => {
  const res = await fetch(`${origin}/api/admin/dashboard`);
  assert.equal(res.status, 401);
});
test("API rechaza origen ajeno", async () => {
  const res = await fetch(`${origin}/api/admin/save`, {
    method: "POST",
    headers: {
      Origin: "https://example.invalid",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(res.status, 403);
});
for (const table of [
  "participantes",
  "respuestas",
  "fraud_events",
  "audit_logs",
  "profiles",
])
  test(`REST anónimo protege ${table}`, async () => {
    if (!catalog) catalog = await (await fetch(`${origin}/api/public`)).json();
    const res = await fetch(
      `${catalog.connection.url}/rest/v1/${table}?select=id&limit=1`,
      {
        headers: {
          apikey: catalog.connection.key,
          Authorization: `Bearer ${catalog.connection.key}`,
        },
      },
    );
    assert([401, 403].includes(res.status));
  });
test("RPC agregada anónima permitida", async () => {
  const res = await fetch(
    `${catalog.connection.url}/rest/v1/rpc/get_resumen_publico`,
    {
      method: "POST",
      headers: {
        apikey: catalog.connection.key,
        Authorization: `Bearer ${catalog.connection.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ encuesta_uuid: null }),
    },
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert(!("dni" in data));
  assert(!("ip_hash" in data));
});
// No POST a participar: incluso un DNI inválido incrementa rate_windows.
test("Edge acepta CORS desde el dominio de producción", async () => {
  const res = await fetch(`${catalog.connection.url}/functions/v1/participar`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://encuesta-rural-quichuas.vercel.app",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,apikey,content-type",
    },
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
  assert.match(res.headers.get("access-control-allow-methods"), /POST/);
  assert.match(
    res.headers.get("access-control-allow-headers"),
    /authorization/,
  );
});

test("Edge responde sin registrar intentos ni participaciones", async () => {
  const res = await fetch(`${catalog.connection.url}/functions/v1/participar`, {
    headers: {
      apikey: catalog.connection.key,
      Authorization: `Bearer ${catalog.connection.key}`,
    },
  });
  assert.equal(res.status, 405);
  const data = await res.json();
  assert.equal(data.code, "DATOS_INVALIDOS");
  assert(!("stack" in data));
});

test("La RPC antifraude rechaza GET sin modificar contadores", async () => {
  const res = await fetch(
    `${catalog.connection.url}/rest/v1/rpc/consume_attempt?p_ip_hash=test&p_device_hash=test`,
    {
      headers: {
        apikey: catalog.connection.key,
        Authorization: `Bearer ${catalog.connection.key}`,
      },
    },
  );
  assert([401, 403, 405].includes(res.status));
});

test("Resultados conservan la simulación pública configurada", async () => {
  // La migración 20260928000100 permite leer estos resultados públicamente.
  const res = await fetch(
    `${catalog.connection.url}/rest/v1/resultado_simulacion?select=candidato_id,porcentaje,cantidad_simulada,total_simulado&limit=1`,
    {
      headers: {
        apikey: catalog.connection.key,
        Authorization: `Bearer ${catalog.connection.key}`,
      },
    },
  );
  assert.equal(res.status, 200);
  assert(Array.isArray(await res.json()));
});

test("Resultados y resumen responden para las encuestas visibles", async () => {
  for (const encuesta of catalog.encuestas) {
    const res = await fetch(`${origin}/api/results?encuesta=${encuesta.id}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert(Array.isArray(data.rows));
    assert(Array.isArray(data.centros));
    assert(data.summary);
  }
});

test("Storage sirve las imágenes existentes sin modificarlas", async () => {
  const urls = new Set(
    [
      catalog.config.logo_url,
      ...catalog.candidatos.flatMap((c) => [c.foto_url, c.simbolo_url]),
    ].filter(Boolean),
  );
  for (const url of urls) {
    assert.equal(new URL(url).protocol, "https:");
    const res = await fetch(url, { method: "HEAD" });
    assert.equal(res.status, 200);
    assert(res.headers.get("content-type")?.startsWith("image/"));
  }
});

test("Auth de Supabase está disponible", async () => {
  const res = await fetch(`${catalog.connection.url}/auth/v1/health`, {
    headers: { apikey: catalog.connection.key },
  });
  assert.equal(res.status, 200);
});

test("El mismo origen alcanza la validación de login sin iniciar sesión", async () => {
  const res = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { Origin: requestOrigin, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(res.status, 400);
});

test("La subida de imágenes exige sesión antes de procesar archivos", async () => {
  const res = await fetch(`${origin}/api/admin/upload`, {
    method: "POST",
    headers: { Origin: requestOrigin },
  });
  assert.equal(res.status, 401);
});
