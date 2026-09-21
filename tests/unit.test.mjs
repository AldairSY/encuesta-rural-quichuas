import test from "node:test";
import assert from "node:assert/strict";
import { validateParticipation } from "../supabase/functions/_shared/validation.ts";
import { normalizePercentages } from "../lib/client.ts";
const valid = {
  dni: "00000001",
  nombres: "José",
  apellido_paterno: "Quispe",
  apellido_materno: "Huamán",
  centro_poblado_id: "a77c4a77-b901-43ac-b2ef-19f212336650",
  encuesta_id: "d671d9d5-e6a6-4afb-8762-672b7e5c4b83",
  candidato_id: "c2135e5a-c508-4871-8aca-835d5c81564c",
  device_id: "c2135e5a-c508-4871-8aca-835d5c81564c",
  session_id: "c2135e5a-c508-4871-8aca-835d5c81564c",
  privacidad_version: "1.0",
  acepta_privacidad: true,
};
test("DNI con ceros iniciales se conserva como texto", () => {
  const r = validateParticipation(valid);
  assert.equal(r.ok, true);
  assert.equal(r.data.dni, "00000001");
});
for (const dni of [
  "1234567",
  "123456789",
  "123A5678",
  "１２３４５６７８",
  " 12345678",
  12345678,
])
  test(`Rechaza formato DNI: ${dni}`, () =>
    assert.equal(validateParticipation({ ...valid, dni }).ok, false));
test("Consentimiento no puede falsificarse como cadena", () =>
  assert.equal(
    validateParticipation({ ...valid, acepta_privacidad: "true" }).ok,
    false,
  ));
test("UUID de comunidad inválido rechazado", () =>
  assert.equal(
    validateParticipation({ ...valid, centro_poblado_id: "x" }).ok,
    false,
  ));
test("Apellido materno es opcional", () =>
  assert.equal(
    validateParticipation({ ...valid, apellido_materno: "" }).ok,
    true,
  ));
test("Normalización porcentual reparte centésimas sin perder total", () => {
  const v = normalizePercentages([1, 1, 1]);
  assert.deepEqual(v, [33.34, 33.33, 33.33]);
  assert.equal(Math.round(v.reduce((a, b) => a + b, 0) * 100), 10000);
});
test("Normalización a cero reparte total determinísticamente", () =>
  assert.deepEqual(normalizePercentages([0, 0, 0]), [33.34, 33.33, 33.33]));
test("Valores cercanos preservan orden y total 100", () => {
  const v = normalizePercentages([123, 122, 121]);
  assert(v[0] > v[1] && v[1] > v[2]);
  assert.equal(Math.round(v.reduce((a, b) => a + b, 0) * 100), 10000);
});
