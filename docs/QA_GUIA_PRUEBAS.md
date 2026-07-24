# Guía de pruebas — Terrasacha

Esta guía es para **probar la aplicación como la usaría un usuario real**: qué hace cada tipo de cuenta y qué conviene revisar. No hace falta conocer AWS, APIs ni configuración técnica.

---

## ¿De qué va la aplicación?

Terrasacha sirve para **guardar y avalar documentación de proyectos** (por ejemplo material de drones o mapas).

El recorrido normal es este:

1. **El analista** sube archivos en un espacio de trabajo temporal (borrador).
2. Cuando está listo, **envía el paquete a revisión**.
3. **El supervisor** lo revisa y puede **aprobar** o **rechazar**.
4. Si se aprueba, los archivos pasan a la **zona definitiva** (documentación ya avalada), donde el supervisor (y el administrador) pueden consultarlos.

Piensa en tres “cajones”:

| Momento | Quién actúa | En la app se llama… |
|---------|-------------|---------------------|
| Subir y preparar | Analista | **Subir archivos** (borrador) |
| Revisar y decidir | Supervisor | **Revisión (supervisor)** |
| Documentación oficial | Todos (según permiso) | **Archivos avalados** |

---

## Los tres tipos de usuario

| Rol en la app | En una frase |
|---------------|--------------|
| **Analista** | Sube documentos y los manda a que los revisen. |
| **Supervisor** | Recibe esos envíos, los aprueba o los rechaza. |
| **Administrador** | Puede hacer casi todo: además **crea usuarios** y asigna quién es analista o supervisor. |

Cada persona entra con **usuario y contraseña**. La primera vez puede pedir **cambiar la contraseña**; es normal.

**Importante:** si alguien entra y en Inicio aparece que **no tiene rol asignado**, solo debe ver la pantalla de inicio con un aviso. No debería poder usar el resto de la app.

---

## Cuentas que necesitas para probar

Pide al equipo **tres usuarios de prueba** (o créalos con un administrador):

| Quién | Para probar qué |
|-------|------------------|
| Un **administrador** | Crear usuarios y recorrer toda la app. |
| Un **supervisor** | La bandeja de revisión y los archivos ya avalados. |
| Un **analista** | Subir archivos y enviar a revisión. |

El analista debe tener **asignado un supervisor** (el equipo lo configura al crear la cuenta). Sin supervisor, al subir archivos puede aparecer un mensaje de que falta ese dato.

---

## Qué debe probar cada rol

### Analista

**Qué ve en el menú:** Inicio · Mis proyectos · Subir archivos  
**No debe ver:** Revisión (supervisor) · Administración  

#### Su trabajo día a día

1. Entrar a **Mis proyectos** y elegir un proyecto.
2. Ir a **Subir archivos** y trabajar en el **borrador**:
   - Crear carpetas si hace falta.
   - Subir archivos (botón o arrastrando al cuadro de subida).
   - Ver imágenes en vista previa (incluidos archivos TIFF grandes, con el visor de la app).
   - Renombrar o borrar mientras el borrador sigue editable.
3. Cuando el paquete esté completo, pulsar **Enviar a revisión**.
4. Revisar la pestaña **En revisión**: ahí ve lo que ya mandó; **no** debe poder seguir editando ese envío.
5. Puede **seguir subiendo en un borrador nuevo** del mismo proyecto aunque otro envío siga en revisión.
6. Cuando el supervisor aprueba, en la pestaña **Aprobados** debe poder **ver y descargar** esa documentación (sin editarla).

#### Qué comprobar que NO puede hacer

- No tiene menú de **Revisión (supervisor)** ni de **Administración**.
- Si intenta entrar por error a esas pantallas, la app lo devuelve al inicio con un mensaje de que no tiene permiso.
- No debe poder editar archivos que ya están **aprobados** (solo mirarlos o bajarlos).

---

### Supervisor

**Qué ve en el menú:** Inicio · Revisión (supervisor) · Proyectos · Archivos avalados  
**No debe ver:** Administración · No tiene “Subir archivos” como analista  

#### Su trabajo día a día

1. Entrar a **Revisión (supervisor)**:
   - Ver si llegaron **notificaciones** (marcarlas leídas, borrar las que ya no sirvan).
   - Ver la lista de **envíos pendientes** de sus analistas.
   - Abrir un envío, ver los archivos y decidir:
     - Aprobar o rechazar **un archivo** concreto, o
     - **Aprobar todo el envío** (pasa a documentación avalada), o
     - **Rechazar el envío** (debe escribir un motivo).
2. Revisar el **historial** de envíos ya tratados (aprobados o rechazados).
3. En **Archivos avalados**, elegir proyecto y **consultar o descargar** la documentación ya aprobada.

#### Qué comprobar que NO puede hacer

- No sube archivos al borrador del analista.
- No crea usuarios (no tiene Administración).
- Solo debería ver envíos de **sus** analistas, no los de otro supervisor.

---

### Administrador

**Qué ve en el menú:** Todo — Inicio, Revisión, Proyectos, Archivos y **Administración**.

#### Su trabajo día a día

1. **Administración → Usuarios y roles**
   - Ver la lista de usuarios.
   - Crear un **supervisor** nuevo.
   - Crear un **analista** y elegirle **qué supervisor** lo revisa.
   - Crear otro **administrador** si hace falta.
   - Comprobar que el formulario pide datos obligatorios (usuario, correo, contraseña temporal, etc.).
2. Puede hacer lo mismo que un **supervisor** en la bandeja de revisión (y suele ver **más envíos**, no solo los de un supervisor concreto).
3. Puede hacer lo mismo que un **analista** en subida de archivos.
4. En **archivos ya avalados**, además de ver y descargar, puede **organizar la carpeta** (subir, borrar, renombrar, etc.) según lo que muestre la pantalla.

#### Si Administración falla

Si al abrir usuarios la pantalla queda en error o vacía sin explicación, **avísalo al equipo de desarrollo** con captura de pantalla. Esa parte depende de que el entorno de pruebas esté bien configurado.

---

## Prueba completa recomendada (historia de punta a punta)

Haz este recorrido **en orden**, como si fuera un día de trabajo real:

| Paso | Entra como… | Haz esto | Deberías ver… |
|------|-------------|----------|----------------|
| 1 | Administrador | Crea un usuario **supervisor** | Mensaje de éxito; aparece en la lista |
| 2 | Administrador | Crea un usuario **analista** y asígnale ese supervisor | Analista creado con supervisor en la tabla |
| 3 | Analista | Elige un proyecto y sube 2 archivos al borrador | Archivos visibles |
| 4 | Analista | Pulsa **Enviar a revisión** | Confirmación; pestaña “En revisión” |
| 5 | Supervisor | Abre **Revisión (supervisor)** | Notificación y envío pendiente |
| 6 | Supervisor | Aprueba un archivo y luego **aprueba el envío completo** | Mensajes de éxito |
| 7 | Analista | En **Subir archivos**, pestaña **Aprobados** | Los mismos archivos, solo lectura |
| 8 | Supervisor | **Archivos avalados**, mismo proyecto | Puede ver y descargar |
| 9 | Administrador | **Archivos avalados** | Puede gestionar la carpeta (más permisos que el analista) |

**Prueba extra — rechazo:**

| Paso | Entra como… | Haz esto | Deberías ver… |
|------|-------------|----------|----------------|
| A | Analista | Nuevo borrador, sube algo y envía otra vez | Otro envío en revisión |
| B | Supervisor | **Rechaza** el envío con un motivo escrito | Queda rechazado en historial |
| C | Analista | Corrige en un **nuevo borrador** y vuelve a enviar | El ciclo empieza de nuevo |

---

## Pruebas rápidas para todos

Vale la pena repetir esto con **cada** tipo de usuario:

- [ ] Iniciar sesión con usuario y contraseña correctos.
- [ ] Intentar entrar con contraseña incorrecta (debe avisar y no dejar pasar).
- [ ] Si es la primera vez, cambiar la contraseña cuando lo pida la app.
- [ ] Cerrar sesión y comprobar que pide login otra vez.
- [ ] Recargar la página estando dentro: no debería sacarte sin motivo.

---

## Cómo reportar un problema

Cuando algo no cuadre, anota:

1. **Con qué usuario** entraste (analista, supervisor o administrador).
2. **Qué hiciste**, paso a paso.
3. **Qué esperabas** y **qué pasó en realidad**.
4. Una **captura de pantalla** si se puede.

Con eso el equipo puede reproducirlo sin detalles técnicos.

---

## Cosas que esta versión aún no hace

- No hay pantalla de **Ajustes** en el menú.
- En administración **no se editan ni borran** usuarios ya creados; solo **crear** y **ver la lista**.

---

## Checklist mínimo antes de dar el OK

- [ ] Los tres roles entran bien.
- [ ] Analista: sube archivos y envía a revisión.
- [ ] Supervisor: recibe el envío y lo aprueba.
- [ ] Analista ve sus archivos aprobados.
- [ ] Administrador crea usuarios y lista la tabla.
- [ ] Analista **no** entra a administración ni a la bandeja de supervisor.

---

*App: Terrasacha · Guía para equipo de QA*
