export interface ParticipationInput {
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  centro_poblado_id: string;
  encuesta_id: string;
  candidato_id: string;
  device_id: string;
  session_id: string;
  privacidad_version: string;
  acepta_privacidad: boolean;
}
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateParticipation(
  value: unknown,
): { ok: true; data: ParticipationInput } | { ok: false; code: string } {
  if (!value || typeof value !== "object")
    return { ok: false, code: "DATOS_INVALIDOS" };
  const v = value as Record<string, unknown>;
  if (typeof v.dni !== "string" || !/^\d{8}$/.test(v.dni))
    return { ok: false, code: "DNI_INVALIDO" };
  for (const key of ["nombres", "apellido_paterno"])
    if (
      typeof v[key] !== "string" ||
      String(v[key]).trim().length < 2 ||
      String(v[key]).length > 100
    )
      return { ok: false, code: "NOMBRE_INVALIDO" };
  if (
    v.apellido_materno !== undefined &&
    (typeof v.apellido_materno !== "string" ||
      v.apellido_materno.length > 100 ||
      v.apellido_materno.trim().length === 1)
  )
    return { ok: false, code: "NOMBRE_INVALIDO" };
  for (const key of [
    "centro_poblado_id",
    "encuesta_id",
    "candidato_id",
    "device_id",
    "session_id",
  ])
    if (typeof v[key] !== "string" || !uuidPattern.test(String(v[key])))
      return { ok: false, code: "DATOS_INVALIDOS" };
  if (
    v.acepta_privacidad !== true ||
    typeof v.privacidad_version !== "string" ||
    !v.privacidad_version ||
    v.privacidad_version.length > 100
  )
    return { ok: false, code: "PRIVACIDAD" };
  return {
    ok: true,
    data: {
      dni: v.dni,
      nombres: String(v.nombres).trim(),
      apellido_paterno: String(v.apellido_paterno).trim(),
      apellido_materno: String(v.apellido_materno || "").trim(),
      centro_poblado_id: String(v.centro_poblado_id),
      encuesta_id: String(v.encuesta_id),
      candidato_id: String(v.candidato_id),
      device_id: String(v.device_id),
      session_id: String(v.session_id),
      privacidad_version: v.privacidad_version,
      acepta_privacidad: true,
    },
  };
}
export const friendlyErrors: Record<string, string> = {
  DNI_INVALIDO: "El DNI debe contener exactamente 8 números.",
  NOMBRE_INVALIDO: "Revisa tus nombres y apellidos.",
  DNI_DUPLICADO: "Este DNI ya se encuentra registrado.",
  PRIVACIDAD: "Debes aceptar el aviso de privacidad.",
  PRIVACIDAD_ACTUALIZADA:
    "El aviso de privacidad cambió. Actualiza la página y revísalo.",
  ENCUESTA_CERRADA: "El sondeo no está abierto para participar.",
  CENTRO_INVALIDO: "Selecciona una comunidad activa del ámbito del sondeo.",
  CANDIDATO_INVALIDO: "La opción seleccionada ya no está disponible.",
  DATOS_INVALIDOS: "Revisa los datos del formulario.",
  RATE_LIMIT:
    "Se recibieron demasiadas solicitudes. Espera un minuto e inténtalo nuevamente.",
  SERVICE: "No se pudo registrar tu participación. Inténtalo nuevamente.",
};
