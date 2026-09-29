# Encuesta Rural

Sistema de Participación Ciudadana. Sondeo de opinión independiente, conectado a Supabase PostgreSQL, Auth, Storage y Edge Functions. No es una plataforma oficial del JNE, ONPE o RENIEC.

## Arquitectura

- React 19 + TypeScript, App Router de Next.js.
- Next.js para desarrollo, compilación y ejecución de producción en Vercel.
- Vinext/Vite se conserva mediante comandos `*:sites` para Sites (Cloudflare Workers).
- Supabase es la única base de datos. No se utiliza SQLite, D1 ni una base paralela.
- API propia para administración y sesiones con cookies HttpOnly/SameSite.
- Edge Function `participar` para validación, HMAC, límites de solicitudes y llamada a la transacción SQL.
- RLS, grants y funciones con `search_path` vacío protegen la base de datos incluso si alguien evita la interfaz.

## Desarrollo

Requiere Node.js >=22.13 y npm.

```sh
npm ci
cp .env.example .env.local
# Configurar SUPABASE_URL, SUPABASE_ANON_KEY y APP_ORIGIN
npm run dev
```

En PowerShell usa `Copy-Item .env.example .env.local`. El servidor se sirve en `http://localhost:5173`.

```sh
npm run lint
npm run typecheck
npm test
npm run test:http  # comprobaciones sin escritura, con el servidor local iniciado
npm run check:secrets
npm run build     # Next.js / Vercel (build:vercel se conserva como alias)
npm start         # servidor de producción en el puerto 5173
```

Si el shim npm de Windows falla, usar su entrada JS: `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run dev`.

## Conexión con Supabase

El proyecto conectado durante la implementación es `BASE DE ENCUESTAS MDA` (`quauwjrtkwolyssavncz`). Las migraciones y la función ya fueron aplicadas allí. No vuelvas a ejecutar las migraciones iniciales en esa base.

Para una **base limpia de Supabase**, aplica en orden los archivos de `supabase/migrations/`. Los archivos bajo `supabase/tests/` son pruebas, no migraciones de producción. Mediante CLI:

```sh
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase db push
supabase functions deploy participar
```

Las migraciones remotas se aplicaron mediante el conector, que asigna sus propios timestamps al historial. Antes de usar `db push` sobre la base ya configurada, alinea el historial con `supabase migration list` / `migration repair`; no intentes volver a crear las tablas. Conserva los archivos locales como fuente versionada.

`SUPABASE_ANON_KEY` es pública y se usa como JWT para invocar la Edge Function con `verify_jwt=true`. Una clave nueva `sb_publishable_...` no sustituye directamente ese JWT sin adaptar el gateway. La service role solo existe en el entorno de Supabase Edge; no se necesita en la aplicación web ni en Vercel.

## Primer SUPER_ADMIN

El correo indicado durante la sesión quedó reservado mediante un hash en `private.admin_enrollment`. El correo y la contraseña no están en el código fuente.

1. En Supabase Auth, configura **Site URL** y **Redirect URLs** con el dominio final y `/admin`. Para desarrollo agrega `http://localhost:5173/admin`.
2. Abre `/admin` → **Primer acceso: crear mi cuenta**.
3. Introduce el correo autorizado y elige una contraseña de al menos 12 caracteres.
4. Confirma el correo enviado por Supabase Auth. Si la confirmación redirige a una URL antigua, vuelve manualmente a `/admin` después de confirmar.
5. Inicia sesión. `claim_admin_enrollment()` verifica el correo confirmado y concede el rol una sola vez.

Para otra instalación, ejecuta primero `supabase/bootstrap-admin.sql` con el correo autorizado. Crear una cuenta con otro correo no concede acceso administrativo. Una vez dentro, SUPER_ADMIN administra roles en **Configuración → Roles**. Para nuevas cuentas, se puede usar Primer acceso o crearlas desde Supabase Auth; luego se asigna su ID en Roles.

Configura SMTP propio si el envío de confirmaciones del proyecto no permite destinatarios externos o tiene límites insuficientes. No se generó, eligió ni almacenó una contraseña para el usuario.

## Configurar el primer sondeo

1. Ajusta identidad, ubicación, privacidad, responsable, método y financiación.
2. Crea una encuesta con ámbito, fechas en hora de Perú y estado BORRADOR.
3. Carga los Centros Poblados/comunidades de ese ámbito.
4. Carga candidatos reales con cargo, organización, fotos, símbolos y orden visual.
5. Cambia la encuesta a ACTIVA dentro del periodo establecido.
6. Habilita la publicación de resultados globalmente y en la encuesta cuando corresponda.

No se cargaron candidatos, partidos ni respuestas ficticias en producción. El seed `seed.development.sql` es manual, requiere `SET app.allow_demo_seed = 'true'` y solo debe usarse en un proyecto Supabase de desarrollo.

## Reglas de datos

- DNI de 8 dígitos, preservando ceros iniciales; `UNIQUE(dni)` global.
- La regla solicitada rechaza un DNI ya registrado incluso si se intenta usar otra encuesta. Cambiar a una participación por campaña requeriría un flujo seguro para reutilizar la identidad; no se agregó ese comportamiento implícitamente.
- Nombre normalizado con espacios, mayúsculas y tildes. Homónimos permitidos con señal de revisión.
- Una respuesta por encuesta/participante y candidato perteneciente a la misma encuesta, impuestos con constraints.
- Registro atómico. Un candidato/centro inválido no deja participantes huérfanos.
- Las señales de riesgo no son pruebas de fraude. El puntaje no verifica la identidad.
- Las respuestas de riesgo >=50 entran EN_REVISION; puntajes menores pueden ser VALIDA con bandera de revisión.
- Los resultados se calculan únicamente con `estado='VALIDA'`. La simulación nunca modifica esa tabla.
- Desactivar una comunidad o candidato conserva la historia. Los candidatos desactivados siguen apareciendo en resultados si recibieron respuestas; la papeleta solo ofrece activos.
- La invalidación/revalidación exige motivo y queda auditada. Inactivar al participante no invalida automáticamente su respuesta.
- Fechas guardadas como `timestamptz`; presentación `America/Lima`.

## Antifraude

La Edge Function obtiene el último elemento de `X-Forwarded-For` agregado por el gateway administrado de Supabase. No usa la IP aportada en el cuerpo ni páginas externas. Al migrar a infraestructura propia, verifica explícitamente la cadena de proxies confiables antes de utilizar esta señal.

Se calcula HMAC-SHA256 con separación de dominios para IP y dispositivo. `IP_HASH_SECRET` puede configurarse en Supabase Edge con al menos 32 bytes aleatorios. Si falta, usa exclusivamente dentro de Edge la service role inyectada como clave HMAC con separación de dominios. Rotar esa clave cambia la correlación histórica; nunca se guarda la IP cruda.

Los límites se almacenan en PostgreSQL: 120 intentos/IP/minuto y 12/dispositivo/minuto. Las ventanas expiran y se limpian tras dos días. Compartir IP no equivale a compartir identidad. Las cookies/IDs aleatorios son señales débiles, se pueden borrar y no sustituyen un proveedor de identidad. La interfaz `lib/identity.ts` deja el contrato para integrar un proveedor futuro; hoy devuelve `NOT_VERIFIED`.

## Storage

Buckets `candidatos-fotos`, `candidatos-simbolos`, `branding`: lectura pública de imágenes, escritura según rol. Máximo 3 MiB; JPEG/PNG/WEBP. La API verifica tamaño, MIME y firma del archivo; Storage también impone tamaño/MIME. Los reemplazos crean nombres UUID y conservan objetos anteriores para no romper referencias.

## Pruebas de base de datos

`supabase/tests/integration.sql` prueba las funciones reales desplegadas dentro de una transacción con `ROLLBACK`. No conserva fixtures. Aborta si falla una aserción.

La concurrencia se probó en el mismo Supabase mediante un esquema QA no expuesto. `concurrency-setup.sql` copia las tablas y el código desplegado de la RPC cambiando solo el esquema; se ejecutan dos `concurrency-request.sql` al mismo tiempo en conexiones diferentes, se verifica un único registro y se elimina el esquema con `concurrency-cleanup.sql`. El esquema QA no es una base paralela ni una fuente de la aplicación. Los archivos de limpieza afectan exclusivamente a ese esquema de pruebas.

## Desplegar en Vercel

1. Importa `https://github.com/AldairSY/encuesta-rural-quichuas` en Vercel con nombre **encuesta-rural-quichuas**, Framework **Next.js** y Root Directory **./**.
2. Deja desactivados los overrides de Build Command, Output Directory e Install Command. `vercel.json` solo declara el framework; Vercel detecta la instalación, `npm run build` y la salida de Next.js.
3. En **Settings → Environment Variables**, configura las variables de esta tabla sin prefijos `NEXT_PUBLIC_`. Copia los dos valores de Supabase desde tu `.env.local`; no subas ese archivo.

| Variable | Tipo y uso | Production | Preview |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Pública; URL del proyecto Supabase | Obligatoria | Obligatoria |
| `SUPABASE_ANON_KEY` | Pública; JWT legacy con rol `anon`, también usado por el navegador para participar | Obligatoria | Obligatoria |
| `APP_ORIGIN` | Configuración del servidor, no es un secreto; valida el origen de las operaciones POST | `https://encuesta-rural-quichuas.vercel.app` | Omitir para usar el origen de cada despliegue, o fijar su dominio exacto |

No copies `APP_ORIGIN` de desarrollo a Production y no asignes el dominio de Production a Preview: bloquearía el login y las escrituras con HTTP 403. Usa el origen sin barra final ni `/admin`. Si agregas un dominio propio, actualiza esta variable al dominio canónico utilizado por el administrador.

4. En Supabase **Authentication → URL Configuration**, configura **Site URL** como `https://encuesta-rural-quichuas.vercel.app` y permite `https://encuesta-rural-quichuas.vercel.app/admin` en **Redirect URLs**. Conserva el origen local si lo necesitas; para probar confirmaciones en Preview, permite únicamente los dominios Preview que uses. El login existente usa correo/contraseña, no un callback OAuth.
5. Despliega y comprueba `/`, `/participar`, `/resultados`, `/informacion` y `/admin`. Tras cambiar variables de Vercel, genera un nuevo despliegue. No vuelvas a ejecutar migraciones o seeds sobre la base existente como parte de este despliegue.

No agregues `SUPABASE_SERVICE_ROLE_KEY` al frontend ni al proyecto Vercel. La Edge Function ya recibe esa clave dentro de Supabase. `.env.local`, artefactos y credenciales están excluidos de Git.

`IP_HASH_SECRET` es opcional y pertenece exclusivamente a Supabase Edge. `NODE_ENV` lo administra Next.js/Vercel. `TEST_ORIGIN` solo sirve para pruebas; las variables de Wrangler, Miniflare, Sites y el instalador no son necesarias en Vercel. No hay variables `DATABASE_*` ni `NEXT_PUBLIC_*` requeridas por la aplicación.

La participación se envía directamente a la Edge Function de Supabase, que permite CORS para POST/OPTIONS; no requiere añadir una URL de Vercel al código. Las imágenes usan URLs HTTPS de Storage y etiquetas `img`. Las subidas pasan por una API autenticada y conservan el límite de 3 MiB, dentro del límite de cuerpo de Vercel Functions.

La suite `test:http` consulta catálogos, resultados y permisos sin registrar participaciones ni subir archivos. No sustituye una prueba autenticada de alta/edición con una cuenta administrativa. Los scripts SQL de integración/concurrencia no se ejecutan al instalar ni al compilar.

Referencias: [detección de compilación en Vercel](https://vercel.com/docs/builds/configure-a-build), [claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

## Publicación en Sites

`.openai/hosting.json` identifica el sitio ya creado. Debe reutilizarse, sin crear otro ni cambiar su ID. `npm run dev:sites`, `npm run build:sites` y `npm run start:sites` conservan el flujo original; la compilación genera un Worker ESM en `dist/server/index.js`. El empaquetado y publicación usan la habilidad Sites. El sitio se creó privado y no se ha autorizado ampliar su audiencia. La disponibilidad pública para ciudadanos requiere publicar en Vercel o cambiar explícitamente el acceso del sitio.

Consulta `docs/INFORME_ENTREGA.md` para el inventario, evidencias y limitaciones de la entrega.
