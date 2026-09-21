import test from "node:test";
import assert from "node:assert/strict";
const origin = process.env.TEST_ORIGIN || "http://localhost:5173";
let catalog;
test("Catálogo se obtiene del Supabase configurado", async () => {
  const res = await fetch(`${origin}/api/public`);
  assert.equal(res.status, 200);
  catalog = await res.json();
  assert(catalog.config.nombre);
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
  "resultado_simulacion",
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
test("Edge desplegada valida DNI antes de registrar", async () => {
  const res = await fetch(`${catalog.connection.url}/functions/v1/participar`, {
    method: "POST",
    headers: {
      apikey: catalog.connection.key,
      Authorization: `Bearer ${catalog.connection.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ dni: "ABC" }),
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.code, "DNI_INVALIDO");
  assert(!("stack" in data));
});
test("La participación RPC directa no está expuesta al público", async () => {
  const res = await fetch(
    `${catalog.connection.url}/rest/v1/rpc/consume_attempt`,
    {
      method: "POST",
      headers: {
        apikey: catalog.connection.key,
        Authorization: `Bearer ${catalog.connection.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_ip_hash: "test", p_device_hash: "test" }),
    },
  );
  assert([401, 403].includes(res.status));
});
