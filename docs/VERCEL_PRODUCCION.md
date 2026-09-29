# Preparación para Vercel — 28 de septiembre de 2026

Código preparado para importar en Vercel. Este informe no acredita un despliegue
real ni una sesión administrativa autenticada en el dominio final.

## Configuración

- Repositorio: https://github.com/AldairSY/encuesta-rural-quichuas
- Proyecto: `encuesta-rural-quichuas`.
- Framework: **Next.js**. Root Directory: **./**.
- Build Command, Output Directory e Install Command: detección automática, sin overrides.
- `npm run build` ejecuta Next.js 16.3.6; `npm start` sirve la compilación.
- `dev:sites`, `build:sites` y `start:sites` conservan el flujo de Cloudflare.

## Variables exactas

| Nombre | Tipo | Production | Preview |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Pública; enviada por `/api/public` al navegador | Obligatoria | Obligatoria |
| `SUPABASE_ANON_KEY` | Pública; JWT con rol `anon` | Obligatoria | Obligatoria |
| `APP_ORIGIN` | Configuración privada del servidor, no secreta | `https://encuesta-rural-quichuas.vercel.app` | Omitir para aceptar el origen propio de cada Preview, o usar su dominio exacto |

Copiar los valores de Supabase desde `.env.local`. No copiar a producción el origen
local; usar el dominio sin barra final. El origen de Production no sirve para Preview.
Los nombres no llevan `NEXT_PUBLIC_`. La clave `anon` local fue comprobada; no es
una service role. Una clave `sb_publishable_...` no reemplaza el JWT usado por la
Edge Function actual con `verify_jwt=true`.

Solo en Supabase Edge se usan `SUPABASE_SERVICE_ROLE_KEY` (inyectada por Supabase),
`SUPABASE_URL` (inyectada) e `IP_HASH_SECRET` (opcional, con fallback a la clave de
servicio para HMAC). No agregar service role ni IP_HASH_SECRET a Vercel.

`NODE_ENV` es administrada por el framework. `TEST_ORIGIN` es de pruebas. Las
variables de Sites, Wrangler, Miniflare, sandbox e instalación no son requisitos
del servidor Next.js. No se encontraron requisitos `DATABASE_*` ni `NEXT_PUBLIC_*`.

## Verificaciones realizadas

- `npm install`: correcto.
- `npm run build`: correcto con Next.js 16.3.6, incluidos tipos y todas las rutas.
- `npm run build:sites`: correcto.
- `npm run typecheck`: correcto.
- `npm run lint`: sin errores; dos advertencias de navegación con
  `window.location.assign` en componentes administrativos existentes. Se conserva
  la recarga completa tras login/logout para no alterar las sesiones.
- `npm test`: 16 pruebas correctas.
- Suite HTTP contra el servidor Next.js de producción local y Supabase remoto:
  24 pruebas correctas. Se utilizó un puerto local separado del servidor existente,
  conservando `APP_ORIGIN` de `.env.local`.
- `npm audit --omit=dev`: cero vulnerabilidades reportadas tras actualizar Next.js,
  eslint-config-next y las dependencias transitivas afectadas de producción.
- Git: revisión de los 143 archivos originalmente rastreados y los tres commits
  existentes (173 contenidos únicos), sin secretos privados detectados. También se
  revisaron las referencias de variables y asignaciones literales de credenciales.
- `.env*`, `node_modules`, `.next` y `dist` están ignorados. `.env.example` solo tiene
  asignaciones vacías. `build/` contiene código fuente del plugin Sites y se conserva.
- Sin referencias a service role ni claves privadas Supabase en `.next/static`.

La suite HTTP verificó páginas públicas, redirección administrativa, validación de
origen, disponibilidad de Auth, catálogos, consultas de resultados, lectura de las
imágenes existentes y denegación anónima de tablas sensibles. El preflight de la
Edge Function acepta el origen de producción. Una solicitud GET comprueba la
disponibilidad de la función sin incrementar contadores antifraude.

Se ajustó una expectativa de prueba obsoleta: la migración ya existente
`20260928000100_public_simulation_results.sql` permite consultar resultados
simulados públicamente. Se conserva ese comportamiento y su configuración.

No se modificaron componentes, diseño, candidatos, resultados, reglas de negocio,
esquema, políticas, datos, objetos de Storage ni secretos locales. No se ejecutaron
migraciones, seeds, pruebas SQL ni POST de participación. Las pruebas HTTP anteriores
enviaban un DNI inválido a la Edge Function, lo cual sí incrementaba contadores;
ahora realizan comprobaciones sin escritura.

## Configuración externa y alcance pendiente

1. Cargar las variables en Vercel según la tabla y desplegar.
2. En Supabase Authentication → URL Configuration, verificar Site URL
   `https://encuesta-rural-quichuas.vercel.app` y permitir
   `https://encuesta-rural-quichuas.vercel.app/admin` en Redirect URLs. Conservar
   los dominios de desarrollo/Preview que realmente se usen. Esta configuración
   del panel de Supabase no se pudo comprobar con la clave pública del proyecto.
3. Después del despliegue, verificar el login con una cuenta administrativa real.
   Las altas, ediciones, subidas autenticadas y registro de participaciones no se
   ejecutaron contra los datos existentes. Sus rutas, roles, validaciones, SQL y
   límites se revisaron en el código.

No hay middleware ni Server Actions propios. Las APIs son Route Handlers; las
cookies administrativas son HttpOnly, SameSite=Lax y Secure en producción.
Las URLs internas son relativas. Los usos de localhost restantes son de desarrollo,
pruebas o del plugin Sites. Las imágenes usan `img` con URLs HTTPS; no requieren
`remotePatterns`. El límite de subida de 3 MiB queda por debajo de los 4.5 MB de
Vercel Functions.

Referencias: [compilación en Vercel](https://vercel.com/docs/builds/configure-a-build),
[límites de Functions](https://vercel.com/docs/functions/limitations),
[claves Supabase](https://supabase.com/docs/guides/getting-started/api-keys),
[aviso de seguridad de Next.js](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36).
