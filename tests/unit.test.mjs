import test from "node:test";
import assert from "node:assert/strict";
import { entitySchemas } from "../lib/schemas.ts";
import { detectImageMime, imageExtension } from "../lib/upload.ts";
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

const candidate = {
  encuesta_id: "d671d9d5-e6a6-4afb-8762-672b7e5c4b83",
  nombre_completo: "María Quispe",
  cargo: "Alcaldesa distrital",
  organizacion_politica: "Organización vecinal",
  foto_url: null,
  simbolo_url: null,
  numero_lista: "",
  descripcion: "",
  orden_visual: 0,
  activo: true,
};

test("Candidato acepta campos opcionales vacíos y los normaliza", () => {
  const parsed = entitySchemas.candidatos.parse(candidate);
  assert.equal(parsed.numero_lista, null);
  assert.equal(parsed.descripcion, null);
});

test("Descripción de candidato acepta hasta 5000 caracteres", () => {
  assert.equal(
    entitySchemas.candidatos.safeParse({
      ...candidate,
      descripcion: "a".repeat(5000),
    }).success,
    true,
  );
  assert.equal(
    entitySchemas.candidatos.safeParse({
      ...candidate,
      descripcion: "a".repeat(5001),
    }).success,
    false,
  );
});

test("Detecta imágenes por firma binaria", () => {
  assert.equal(
    detectImageMime(
      Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
    ),
    "image/png",
  );
  assert.equal(
    detectImageMime(
      Uint8Array.from([255, 216, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    ),
    "image/jpeg",
  );
  assert.equal(imageExtension("image/jpeg"), "jpg");
  assert.equal(detectImageMime(Uint8Array.from({ length: 12 }, () => 0)), null);
});
