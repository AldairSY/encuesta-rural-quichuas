# Informe técnico — Encuesta Rural

Fecha de trabajo: 21 de septiembre de 2026. Estado de publicación: pendiente de recuperar acceso al sitio privado registrado en la sesión original. Este informe distingue implementación, pruebas ejecutadas y acciones que requieren datos/credenciales del propietario.

## 1. Arquitectura encontrada

La carpeta `C:/Users/asus/Documents/TRABAJO_02` estaba vacía, sin repositorio Git, framework, dependencias, rutas, autenticación, variables ni migraciones. Supabase `BASE DE ENCUESTAS MDA` estaba activo, con PostgreSQL 17, sin tablas públicas, migraciones, buckets ni usuarios Auth en la inspección inicial. No se reemplazó una aplicación existente ni se eliminó información del usuario.

## 2. Arquitectura final

React 19, TypeScript, App Router, Vinext/Vite y Next.js 16. Supabase PostgreSQL es la única base. Supabase Auth autentica administradores; cookies HttpOnly contienen sesiones. Supabase Storage almacena imágenes y la Edge Function `participar` llama la RPC atómica. Sites usa un Worker ESM; Vercel compila la misma aplicación con Next.js. Los módulos SQLite/D1 de ejemplo, sin referencias desde la aplicación, se retiraron.

## 3–4. Archivos creados y modificados

Como no había proyecto, los archivos funcionales son nuevos. Se adaptaron layout, estilos, favicon, configuración y scripts del starter instalado durante esta tarea.

| Grupo | Archivos principales |
|---|---|
| Portada y páginas públicas | `app/page.tsx`, `app/[section]/page.tsx`, `components/public-shell.tsx` |
| Participación | `components/participation.tsx`, `components/candidate-card.tsx`, `components/form-controls.tsx` |
| Resultados | `components/public-results.tsx`, `components/results-display.tsx` |
| Administración | `app/admin/`, `components/admin/admin-root.tsx`, `catalog-manager.tsx`, `records.tsx`, `admin-results.tsx`, `configuration.tsx`, `login.tsx` |
| Backend | `app/api/[...path]/route.ts`, `lib/server.ts`, `lib/auth.ts`, `lib/schemas.ts` |
| Modelo y extensiones | `lib/types.ts`, `lib/client.ts`, `lib/identity.ts` |
| Diseño | `app/globals.css`, `app/application.css`, `app/layout.tsx`, `public/favicon.svg` |
| Supabase | `supabase/migrations/`, `supabase/functions/`, `supabase/config.toml`, `supabase/bootstrap-admin.sql` |
| Pruebas | `tests/unit.test.mjs`, `tests/http.test.mjs`, `supabase/tests/`, `scripts/verify.mjs` |
| Operación | `.env.example`, `.gitignore`, `README.md`, `vercel.json`, `.openai/hosting.json` |

Se conservaron las primitivas UI accesibles incluidas en el starter. No hay candidatos ni resultados hardcodeados en la aplicación. El único seed está explícitamente separado para desarrollo y no fue ejecutado en producción.

## 5–6. Tablas y relaciones

| Tabla | Relación / finalidad |
|---|---|
| `profiles` | ID → `auth.users`; rol y estado del administrador |
| `configuracion` | Fila única; identidad, ubicación, información y privacidad |
| `centros_poblados` | Comunidades administrables, desactivación sin borrado |
| `encuestas` | Ámbito, periodo, estado y publicación |
| `candidatos` | Cada candidato pertenece a una encuesta |
| `participantes` | DNI único, nombres, comunidad, aceptación y señales antifraude |
| `respuestas` | Encuesta, participante, candidato de esa misma encuesta y comunidad |
| `fraud_events` | Eventos vinculados opcionalmente a participante/encuesta |
| `audit_logs` | Administrador, acción, entidad y cambios |
| `resultado_simulacion` | Datos ficticios separados por encuesta/candidato |
| `private.rate_windows` | Contadores atómicos por minuto |
| `private.admin_enrollment` | Reserva de alta administrativa por hash de correo |

No existen políticas públicas de consulta de participantes o respuestas individuales. La aplicación no elimina físicamente estos registros.

## 7. Constraints

`UNIQUE(dni)` y `CHECK` de ocho dígitos; longitudes mínimas/máximas de nombres; `UNIQUE(encuesta_id, participante_id)`; clave foránea compuesta para impedir respuestas a un candidato de otra encuesta; estados y tipos restringidos; fechas coherentes; periodos obligatorios al activar/programar; puntajes 0–100; porcentajes simulados 0–100; motivos de invalidación enumerados y explicación para OTRO. La simulación valida total 100, IDs únicos, pertenencia y cobertura de candidatos dentro de una función transaccional.

## 8. Índices

Índices de nombre normalizado, comunidad, fecha de registro, IP/fecha y dispositivo/fecha. Respuestas por participante, candidato, comunidad, estado/encuesta y fecha. Eventos por IP, dispositivo, fecha y claves foráneas. Auditoría por fecha/usuario. Las restricciones únicas ya proporcionan los índices de DNI y encuesta/participante, por lo que no se duplican.

## 9. Triggers

`set_updated_at()` actualiza timestamps; `normalizar_centro()` genera el nombre normalizado. `audit_change()` registra cambios de encuestas, candidatos, comunidades, configuración, perfiles, simulación y revisión de respuestas. La auditoría excluye hashes técnicos de las revisiones de respuesta.

## 10. RLS y grants

RLS activo en todas las tablas propias. Público: configuración, encuestas publicadas y catálogo activo. Usuarios con rol: lectura administrativa mediante consultas/RPC acotadas. No se concede lectura directa de participantes/respuestas/eventos ni escritura directa de respuestas a `anon` o `authenticated`. Los logs no tienen edición por la interfaz normal.

El asesor de Supabase no encontró errores críticos; reportó advertencias por las RPC `SECURITY DEFINER` intencionalmente expuestas y avisos de tablas con RLS sin políticas. Se revisaron: las RPC públicas solo agregan datos y respetan visibilidad; las administrativas comprueban rol; las tablas sin políticas deniegan todo acceso directo. Estos avisos no se ocultaron ni se desactivó RLS para eliminarlos. Referencias: [RPC públicas con privilegios elevados](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [RPC autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## 11. RPC y funciones

- `registrar_participacion`: validaciones, locks, participante, respuesta y eventos en una transacción; ejecución solo `service_role`.
- `consume_attempt`: límite persistente; solo Edge/service role.
- `get_resultados_publicos`, `get_resultados_por_centro`, `get_resumen_publico`, `get_participacion_centros`: solo agregados reales.
- `admin_dashboard`, `admin_list`, `get_resultados_admin`: consultas por rol; páginas de 25 filas y DNI enmascarado.
- `review_response`, `review_fraud`, `update_participant`, `reveal_dni`: decisiones auditadas, acceso restringido.
- `save_simulation`, `reset_simulation`: afectan exclusivamente simulación y auditoría.
- `manage_profile`: solo SUPER_ADMIN; protege al último SUPER_ADMIN activo.
- `claim_admin_enrollment`: exige correo confirmado reservado; no confía en metadatos de registro.

Todas las funciones con privilegios elevados fijan `search_path=''` y califican sus objetos. Se siguió la [documentación oficial de funciones Supabase](https://supabase.com/docs/guides/database/functions).

## 12. Storage

Tres buckets configurados: `candidatos-fotos`, `candidatos-simbolos`, `branding`. JPEG, PNG y WEBP; máximo 3 MiB. La API valida firma/MIME/tamaño y Storage también restringe tipo/tamaño. ADMIN/SUPER_ADMIN cargan candidatos; branding exige SUPER_ADMIN. Los archivos se renombran con UUID. No hay base64 en PostgreSQL.

## 13–14. Auth y roles

Supabase Auth con email/contraseña, validación del usuario en servidor, refresh de sesión y cookies HttpOnly/SameSite/Secure en producción. Las escrituras API comprueban origen. No se entrega una service role al navegador.

| Rol | Permisos |
|---|---|
| SUPER_ADMIN | Configuración, roles y toda la operación |
| ADMIN | Encuestas, candidatos, comunidades, participantes, revisión, resultados y simulación |
| SUPERVISOR | Consulta, revisión de respuestas y eventos |
| VISUALIZADOR | Consulta; sin escritura |

La interfaz refleja los permisos, pero PostgreSQL/backend los impone también. El correo autorizado quedó reservado; la contraseña y confirmación deben completarse por su propietario.

## 15. Antifraude

HMAC-SHA256 para IP y dispositivo, IDs aleatorios propios, agente resumido, timestamp, duplicidad, coincidencia de nombres y velocidad. No se consultan IMEI/MAC ni servicios externos de IP. La conexión repetida es señal, no identidad. Límites: 120 intentos/IP/minuto, 12/dispositivo/minuto; respuesta 429 cuando corresponde. Nombre coincidente: +25; IP con al menos 30 registros/hora: +15; dispositivo con al menos 3: +35. Riesgo >=50 pasa a EN_REVISION. Estos umbrales están documentados y pueden ajustarse mediante migración; no se presentan como detección infalible.

## 16. Auditoría

Registro antes/después para entidades operativas y cambios de estado; consulta de DNI completo exige motivo y genera evento. La invalidación exige un motivo enumerado; OTRO exige al menos diez caracteres. No se borran votos silenciosamente y el porcentaje se recalcula desde las respuestas válidas.

## 17. Simulación

Pestañas Resultados reales / Modo prueba; editor de porcentajes y total, normalización exacta a 100 centésimas, presets, vista previa y restablecimiento. Banner permanente de datos ficticios. Los conteos simulados se redondean y pueden diferir mínimamente del total por redondeo, como cantidades aproximadas. `/resultados` no consulta la tabla simulada. La vista previa administrativa usa el mismo componente visual de resultados.

## 18. Variables

Web/Sites/Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_ORIGIN`. Edge: `SUPABASE_SERVICE_ROLE_KEY` inyectada por Supabase y `IP_HASH_SECRET` opcional recomendado. El fallback HMAC usa la clave de servicio solo dentro de Edge, con separación de dominios. No se extrajo ninguna service role al repositorio. `.env.local` está ignorado; `.env.example` solo documenta nombres y ejemplos.

## 19–23. Pruebas, lint, typecheck y builds

Resultados ya ejecutados:

- 13 pruebas unitarias: formato DNI, ceros iniciales, consentimiento, UUID, apellido opcional y normalización porcentual.
- 18 pruebas HTTP contra aplicación/Supabase reales: rutas, denegación admin, origen, privacidad REST, RPC pública y Edge desplegada.
- 26 grupos de aserciones SQL sobre funciones desplegadas: todos los casos solicitados salvo concurrencia, además de atomicidad, rate limit, roles y publicación oculta. Fixtures revertidos con ROLLBACK.
- Concurrencia: conexiones PostgreSQL 19090 y 19106 ejecutaron simultáneamente la misma RPC en un esquema QA aislado. Resultado: `{"ok":true}` y `{"ok":false,"code":"DNI_DUPLICADO"}`. Una sola participación/respuesta. El esquema QA fue eliminado después.
- Lint: sin errores ni advertencias en la última comprobación.
- Typecheck: sin errores.
- Build Sites/Vinext: exitoso, salida Worker ESM.
- Build Next.js/Vercel: exitoso, rutas públicas/admin/API generadas.

Los logs reproducibles se guardan en `docs/verification/` ejecutando `node scripts/verify.mjs`. La prueba SQL se encuentra en `supabase/tests/integration.sql` y la prueba concurrente en los tres archivos de concurrencia.

Revisión visual: portada de escritorio observada en Chrome, información real de Supabase y estados vacíos honestos. El control de viewport/Playwright del navegador devolvió errores de conexión; **no se afirma haber completado** las siete resoluciones solicitadas ni un recorrido visual autenticado de todas las pantallas. Los componentes tienen reglas responsive, pero esto no sustituye esas pruebas. WebMCP de filtrado está implementado por detección de capacidades; no hubo un contexto operativo para verificar su contrato.

## 24. Crear SUPER_ADMIN

La reserva del correo proporcionado está en `private.admin_enrollment` como hash. Abrir `/admin`, elegir Primer acceso, definir contraseña y confirmar el correo mediante Supabase Auth. Al iniciar sesión se reclama la reserva y se crea el perfil. Ningún otro correo recibe ese rol automáticamente. Para otra instalación, usar `supabase/bootstrap-admin.sql`. No se creó ni se transmitió una contraseña por herramientas.

## 25. Conectar Supabase

La conexión al proyecto indicado ya está configurada en `.env.local` y las variables del sitio registrado. En una base nueva, aplicar los seis archivos de migración ordenados y desplegar `participar` con `verify_jwt=true`. Los timestamps remotos del conector difieren de los nombres locales; al adoptar CLI en la base ya configurada, conciliar el historial antes de `db push`.

## 26. Vercel

`vercel.json` usa `npm ci`, `npm run build:vercel` y `.next`. Definir las tres variables web y las URLs de Auth. La compilación Next.js se probó realmente. No se publicó en una cuenta Vercel: el encargo solicitó dejarlo preparado y documentar el despliegue.

## 27. Configuración pendiente y límites

- El propietario debe completar su contraseña/confirmación de correo y configurar Site URL/Redirect URLs/SMTP de Auth si corresponde.
- Debe cargar candidatos, fotos, símbolos, comunidades, fechas e información institucional reales. No se inventaron esos datos.
- El sondeo está vacío y no acepta respuestas hasta que una encuesta tenga periodo activo y catálogos cargados.
- La publicación privada en Sites depende de recuperar la sesión con acceso al ID registrado en `.openai/hosting.json`; no se creó otro sitio al cambiar de sesión.
- El sitio privado solo permite revisión de su propietario. Publicar para ciudadanos requiere una decisión explícita sobre audiencia o despliegue Vercel público.
- No hay integración oficial de identidad; la interfaz dice únicamente datos registrados/validación de participación.
- `UNIQUE(dni)` es global según el encargo; otro sondeo no habilita registrar otra vez el mismo DNI.
- La carga de catálogos está acotada a 300 encuestas y 1.000 candidatos/comunidades por consulta; los registros personales sí usan paginación de servidor. Una instalación mayor requiere ampliar/paginar catálogos.
- La identidad web y las señales de dispositivo no impiden por sí solas la suplantación de un DNI; no se promete una verificación que no existe.

## Migraciones versionadas

1. `20260921000100_schema.sql`: esquema, constraints, índices y RLS habilitado.
2. `20260921000200_security.sql`: grants, políticas, triggers y reserva de administrador.
3. `20260921000300_participation_results.sql`: registro atómico, rate limiting y resultados.
4. `20260921000400_admin.sql`: consultas administrativas, revisión, auditoría, simulación y roles.
5. `20260921000500_storage.sql`: buckets y políticas de carga.
6. `20260921000600_admin_results.sql`: resultados reales administrativos independientes de publicación pública.

La inspección previa verificó la base vacía. No se realizaron DROP/TRUNCATE sobre tablas de producción. Los únicos objetos eliminados en PostgreSQL fueron los del esquema de pruebas `rural_qa`, tras verificar su contenido.
