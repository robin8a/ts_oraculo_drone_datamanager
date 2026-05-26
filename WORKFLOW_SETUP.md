# Configuración del flujo con roles (staging / approved)

## Rol del usuario (`custom:role`) — fuente principal

La app lee **`custom:role`** en cada sesión (atributos del usuario y, si está configurado, el ID token).  
Valores válidos: **`ADMIN`**, **`SUPERVISOR`**, **`ANALYST`** (también acepta `ANALISTA` → se normaliza a `ANALYST`).

En el **App client** de Cognito, incluye `custom:role` en **atributos de lectura** para que llegue al token.

| custom:role | Permisos en la app |
|-------------|-------------------|
| `ADMIN` | **Acceso total en la app**: todas las rutas, staging, revisión, archivos avalados (editar), administración y ajustes |
| `SUPERVISOR` | Bandeja, aprobar/rechazar, ver/descargar `approved/` (sin editar) |
| `ANALYST` | Solo subir en `staging/` y enviar a revisión |

Los **grupos** Cognito (`ADMIN`, etc.) solo se usan si **no** existe `custom:role`.

## Atributos custom en Cognito (User Pool)

| Atributo | Tipo | Uso |
|----------|------|-----|
| `custom:role` | String | **Obligatorio** — `ADMIN`, `SUPERVISOR`, `ANALYST` |
| `custom:supervisor_id` | String | Username del supervisor (solo analistas) |
| `custom:project_ids` | String | JSON: `["proyecto-1","proyecto-2"]` |

Tras `amplify push`, añade tu usuario al grupo **ADMIN**.

## Prefijos S3 (bajo `public/` por defecto)

Amplify IAM suele permitir solo `public/*`. La app guarda todo ahí:

| Ruta en el bucket | Contenido |
|-------------------|-----------|
| `public/staging/{proyecto}/{analista}/{submissionId}/` | Subidas temporales |
| `public/approved/{proyecto}/...` | Documentación avalada |
| `public/_workflow/submissions/` | Metadatos JSON de envíos |
| `public/_workflow/notifications/{supervisor}/` | Notificaciones |

Si cambias el prefijo raíz: `VITE_S3_ROOT_PREFIX` en `.env` (debe coincidir con la política IAM).

## Permisos S3 en AWS (IAM) — importante

La app usa el rol IAM del Identity Pool (`amplify-...-authRole`).  
**`custom:role = ADMIN` en la app no cambia solo el IAM**: hay que mapear un rol con permisos amplios o ampliar la política del rol autenticado.

### Opción 1 — Administrador con acceso total al bucket (recomendado)

1. Crea un rol IAM, por ejemplo `OraculoAdminAuthRole`.
2. Adjunta la política de `infra/iam/admin-s3-full-access-policy.json` (ajusta el nombre del bucket si difiere).
3. En **Cognito → Identity pool → User access to identity providers → Role assignment**:
   - Modo: **Choose role from token**
   - Regla: claim `custom:role` **Equals** `ADMIN` → rol `OraculoAdminAuthRole`
   - Rol por defecto (autenticado): `amplify-...-authRole` con prefijos limitados

### Opción 2 — Mismo rol para todos (más simple)

Adjunta `infra/iam/auth-s3-workflow-prefixes-policy.json` al rol  
`amplify-tsoraculodronedatama-dev-1d195-authRole`  
(incluye `public/`, `staging/`, `approved/`, `_workflow/`).

Sin esto verás: `is not authorized to perform: s3:ListBucket`.

## API de administración (Lambda en AWS + API Gateway HTTP)

La función vive en la **consola AWS** (Lambda `datadroneuser` + API HTTP), no en este repositorio.

1. **Lambda** (`infra/lambda/datadroneuser/index.js` → subir a la función en consola):
   - `USER_POOL_ID` — ID del User Pool (`us-east-1_hZhDznUsp`)
   - `COGNITO_REGION` — `us-east-1`
   - `SES_FROM_EMAIL` — remitente **verificado** en Amazon SES
   - `SES_REGION` — `us-east-1` (opcional)
   - `APP_LOGIN_URL` — URL del login (ej. `http://localhost:5173`)
   - `APP_NAME` — `Terrasacha` (opcional)
   - Código: `npm install` en esa carpeta, zip con `index.js` + `node_modules`, subir a Lambda. Handler: `index.handler`.
   - IAM: política en `infra/iam/lambda-ses-cognito-policy.json` (`ses:SendEmail` + Cognito Admin*).
   - **SES**: verificar remitente; en sandbox, verificar también los correos de destino de prueba.
2. **API Gateway HTTP** — ruta: `POST /users` (solo creación).
3. **CORS** (Develop → CORS):
   - Origen: `http://localhost:5173`
   - Headers: `authorization`, `content-type`
   - Métodos: `POST`, `OPTIONS` (o `*` si la consola no deja elegir solo POST)
   - Credenciales: **No**
   - Pulsa **Guardar** al final de la pantalla (sin esto la API en vivo no envía cabeceras CORS).
   - Si tras guardar sigue fallando: **Implementación** → etapa `$default`, o confirma auto-deploy en Etapas.
   - Elimina rutas manuales `OPTIONS /users` si las creaste; el CORS integrado ya responde el preflight.
4. **Comprobar CORS** (debe aparecer `access-control-allow-origin`):
   ```bash
   curl.exe -i -X OPTIONS "https://TU-API.execute-api.us-east-1.amazonaws.com/users" -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: authorization,content-type"
   ```
   Si solo ves `HTTP/1.1 204` **sin** esa cabecera, CORS no está activo en la etapa desplegada.
5. **Desarrollo local sin CORS** (opcional): en `.env` usa proxy de Vite:
   ```
   VITE_WORKFLOW_API_URL=/workflow-api
   VITE_WORKFLOW_API_PROXY_TARGET=https://TU-API.execute-api.us-east-1.amazonaws.com
   ```
   Reinicia `npm run dev`. El navegador llama a `localhost:5173` y Vite reenvía a API Gateway.
6. En `.env` del frontend (producción o si CORS ya funciona):
   ```
   VITE_WORKFLOW_API_URL=https://xxxx.execute-api.us-east-1.amazonaws.com
   ```
   Reinicia `npm run dev` tras cambiar el `.env`.

La Lambda necesita permisos IAM: Cognito `AdminCreateUser`, `AdminUpdateUserAttributes`, `AdminAddUserToGroup`, `AdminGetUser` y SES `SendEmail` sobre la identidad del remitente.

## Flujo operativo

1. **Admin** crea analista con supervisor y proyectos (`/admin/users`).
2. **Analista** crea envío, sube archivos, pulsa **Enviar a revisión** (`/analyst`).
3. **Supervisor** recibe notificación en `_workflow/notifications/`, aprueba o rechaza (`/supervisor`).
4. Al **aprobar**, los archivos se copian a `approved/{proyecto}/` y se borra el staging del lote.

## Sin rol

Si `custom:role` está vacío o es inválido, el usuario solo ve **Inicio** con un aviso; no puede entrar a las demás secciones.
