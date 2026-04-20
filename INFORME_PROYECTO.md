# Informe Técnico del Proyecto
## S3 File Manager - Gestor de Archivos para AWS S3 con Control de Acceso por Proyectos

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Introducción](#introducción)
3. [Objetivos del Proyecto](#objetivos-del-proyecto)
4. [Arquitectura Técnica](#arquitectura-técnica)
5. [Tecnologías Utilizadas](#tecnologías-utilizadas)
6. [Estructura del Proyecto](#estructura-del-proyecto)
7. [Funcionalidades Principales](#funcionalidades-principales)
8. [Características Especiales](#características-especiales)
9. [Configuración e Instalación](#configuración-e-instalación)
10. [Guía de Uso](#guía-de-uso)
11. [Seguridad](#seguridad)
12. [Casos de Uso](#casos-de-uso)
13. [Mejoras Implementadas](#mejoras-implementadas)
14. [Mejoras Futuras](#mejoras-futuras)
15. [Conclusión](#conclusión)

---

## 📊 Resumen Ejecutivo

**S3 File Manager** es una aplicación web moderna desarrollada en React y TypeScript que permite gestionar archivos almacenados en buckets de AWS S3 con un sistema de control de acceso basado en proyectos. La aplicación está diseñada específicamente para organizar y gestionar imágenes de drones, permitiendo a diferentes usuarios acceder únicamente a los proyectos asignados.

### Características Clave:
- ✅ Gestión completa de archivos y carpetas en S3
- ✅ Sistema de autenticación con control de acceso por proyectos
- ✅ Visualización avanzada de imágenes con thumbnails y vista previa
- ✅ Vista de galería y lista para diferentes necesidades
- ✅ Operaciones CRUD completas (crear, leer, actualizar, eliminar)
- ✅ Operaciones de copia, movimiento y organización de archivos
- ✅ Interfaz moderna y responsiva con Tailwind CSS

---

## 🎯 Introducción

En el contexto de gestión de datos de drones, es fundamental tener una herramienta que permita organizar, visualizar y gestionar grandes cantidades de imágenes y archivos de manera eficiente. Este proyecto proporciona una solución web completa que se integra directamente con AWS S3, eliminando la necesidad de usar la consola de AWS para operaciones básicas de gestión de archivos.

La aplicación está diseñada para ser utilizada por equipos que trabajan con múltiples proyectos de drones, donde cada proyecto puede contener cientos o miles de imágenes que necesitan ser organizadas jerárquicamente y accesibles de forma controlada.

---

## 🎯 Objetivos del Proyecto

### Objetivos Principales:
1. **Gestión Centralizada**: Proporcionar una interfaz web única para gestionar archivos en múltiples proyectos de S3
2. **Control de Acceso**: Implementar un sistema de autenticación que limite el acceso de usuarios a proyectos específicos
3. **Visualización de Imágenes**: Ofrecer herramientas avanzadas para visualizar y organizar imágenes de drones
4. **Organización Jerárquica**: Permitir la creación y gestión de estructuras de carpetas complejas
5. **Operaciones Eficientes**: Facilitar operaciones comunes como subir, descargar, copiar, mover y renombrar archivos

### Objetivos Secundarios:
- Proporcionar una experiencia de usuario intuitiva y moderna
- Optimizar la carga y visualización de imágenes
- Mantener la seguridad de las credenciales de AWS
- Facilitar la escalabilidad para múltiples proyectos y usuarios

---

## 🏗️ Arquitectura Técnica

### Arquitectura General

La aplicación sigue una arquitectura de **Single Page Application (SPA)** con las siguientes capas:

```
┌─────────────────────────────────────────┐
│         Capa de Presentación            │
│  (React Components + Tailwind CSS)      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Capa de Lógica de Negocio          │
│  (Contexts, Hooks, State Management)    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Capa de Servicios               │
│    (AWS SDK - S3 Operations)            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         AWS S3 Bucket                   │
│    (Almacenamiento de Archivos)         │
└─────────────────────────────────────────┘
```

### Flujo de Datos

1. **Autenticación**: El usuario se autentica mediante `users_auth.json`
2. **Selección de Proyecto**: El usuario selecciona un proyecto de los asignados
3. **Carga de Archivos**: La aplicación lista los objetos del bucket S3 con el prefijo del proyecto
4. **Operaciones**: Las operaciones se realizan directamente contra S3 usando AWS SDK
5. **Visualización**: Las imágenes se cargan mediante URLs firmadas temporales

### Patrones de Diseño Utilizados

- **Context API**: Para gestión de estado global (autenticación, proyectos, portapapeles)
- **Component Composition**: Componentes reutilizables y modulares
- **Custom Hooks**: Lógica reutilizable encapsulada
- **Service Layer**: Separación de lógica de negocio y operaciones de S3

---

## 💻 Tecnologías Utilizadas

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 19.2.0 | Framework principal para la interfaz de usuario |
| **TypeScript** | 5.9.3 | Tipado estático para mayor seguridad y mantenibilidad |
| **React Router DOM** | 7.9.6 | Enrutamiento y navegación entre páginas |
| **Tailwind CSS** | 3.4.18 | Framework de estilos utility-first |
| **Vite** | 7.2.4 | Build tool y servidor de desarrollo |

### Backend/Servicios

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **AWS SDK Client S3** | 3.940.0 | Cliente para operaciones con S3 |
| **AWS SDK S3 Request Presigner** | 3.940.0 | Generación de URLs firmadas temporales |

### Herramientas de Desarrollo

| Herramienta | Versión | Propósito |
|-------------|---------|-----------|
| **ESLint** | 9.39.1 | Linter para mantener calidad de código |
| **TypeScript ESLint** | 8.46.4 | Reglas específicas de TypeScript |
| **PostCSS** | 8.5.6 | Procesamiento de CSS |
| **Autoprefixer** | 10.4.22 | Prefijos CSS automáticos |

---

## 📁 Estructura del Proyecto

```
ts_oraculo_drone_datamanager/
│
├── public/                          # Archivos públicos
│   ├── users_auth.json.example      # Plantilla de usuarios
│   └── vite.svg                     # Assets estáticos
│
├── src/                             # Código fuente principal
│   ├── components/                  # Componentes React
│   │   ├── FileManager/            # Componentes del gestor de archivos
│   │   │   ├── CreateFolderModal.tsx
│   │   │   ├── FileItem.tsx
│   │   │   ├── FileList.tsx
│   │   │   ├── ImagePreviewModal.tsx
│   │   │   ├── RenameModal.tsx
│   │   │   └── UploadModal.tsx
│   │   ├── Layout/                  # Componentes de layout
│   │   │   ├── Header.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── Login/                   # Componentes de autenticación
│   │   │   └── LoginForm.tsx
│   │   └── ProtectedRoute.tsx       # Protección de rutas
│   │
│   ├── contexts/                    # Context API providers
│   │   ├── AuthContext.tsx          # Contexto de autenticación
│   │   ├── ClipboardContext.tsx    # Contexto de portapapeles
│   │   └── ProjectContext.tsx      # Contexto de proyectos
│   │
│   ├── pages/                       # Páginas principales
│   │   ├── FileManagerPage.tsx      # Página principal de gestión
│   │   ├── HomePage.tsx             # Página de inicio
│   │   ├── LoginPage.tsx            # Página de login
│   │   ├── ProjectsPage.tsx         # Página de selección de proyectos
│   │   └── SettingsPage.tsx         # Página de configuración
│   │
│   ├── services/                    # Servicios de negocio
│   │   └── s3Service.ts             # Operaciones con S3
│   │
│   ├── types/                       # Definiciones de tipos TypeScript
│   │   ├── config.ts                # Tipos de configuración
│   │   └── user.ts                  # Tipos de usuario
│   │
│   ├── utils/                       # Utilidades
│   │   ├── configLoader.ts         # Cargador de configuración
│   │   └── s3Client.ts              # Cliente S3 configurado
│   │
│   ├── App.tsx                      # Componente raíz de la aplicación
│   ├── main.tsx                     # Punto de entrada
│   └── index.css                   # Estilos globales
│
├── amplify/                         # Configuración AWS Amplify (opcional)
├── package.json                     # Dependencias y scripts
├── tsconfig.json                    # Configuración TypeScript
├── tailwind.config.js               # Configuración Tailwind
├── vite.config.ts                   # Configuración Vite
└── README.md                        # Documentación básica
```

### Descripción de Componentes Principales

#### **Contexts (Gestión de Estado Global)**

- **AuthContext**: Gestiona el estado de autenticación del usuario, incluyendo login, logout y persistencia en localStorage
- **ProjectContext**: Mantiene el proyecto seleccionado y la ruta actual de navegación
- **ClipboardContext**: Gestiona las operaciones de copia y movimiento de archivos (portapapeles)

#### **Services (Lógica de Negocio)**

- **s3Service.ts**: Contiene todas las funciones para interactuar con S3:
  - `listObjects()`: Listar archivos y carpetas
  - `uploadFile()`: Subir archivos
  - `downloadFile()`: Generar URL de descarga
  - `deleteFile()` / `deleteFolder()`: Eliminar archivos/carpetas
  - `copyFile()` / `copyFolder()`: Copiar archivos/carpetas
  - `moveFile()` / `moveFolder()`: Mover archivos/carpetas
  - `renameFile()`: Renombrar archivos
  - `createFolder()`: Crear carpetas
  - `getImageUrl()`: Obtener URL de imagen para visualización
  - `isImageFile()`: Detectar si un archivo es una imagen

#### **Pages (Vistas Principales)**

- **FileManagerPage**: Página principal con todas las funcionalidades de gestión de archivos
- **ProjectsPage**: Permite seleccionar entre los proyectos disponibles
- **HomePage**: Página de bienvenida con información del usuario
- **SettingsPage**: Muestra la configuración actual de AWS
- **LoginPage**: Página de autenticación

---

## ⚙️ Funcionalidades Principales

### 1. Sistema de Autenticación

- **Login de Usuarios**: Autenticación mediante username y password
- **Control de Acceso**: Cada usuario tiene acceso solo a proyectos específicos
- **Persistencia de Sesión**: La sesión se mantiene en localStorage
- **Logout**: Cierre de sesión seguro

**Archivo de Configuración**: `public/users_auth.json`
```json
[
  {
    "username": "usuario1",
    "password": "password123",
    "project_ids": ["proyecto_drone_1", "proyecto_drone_2"]
  }
]
```

### 2. Gestión de Proyectos

- **Selección de Proyecto**: El usuario puede elegir entre sus proyectos asignados
- **Filtrado Automático**: Solo se muestran archivos del proyecto seleccionado
- **Organización por Proyecto**: Los archivos se organizan en S3 como `project_id/ruta/archivo`

### 3. Gestión de Archivos

#### Operaciones Básicas:
- ✅ **Subir Archivos**: Carga de uno o múltiples archivos
- ✅ **Descargar Archivos**: Descarga mediante URLs firmadas temporales (válidas 1 hora)
- ✅ **Eliminar Archivos**: Eliminación con confirmación
- ✅ **Renombrar Archivos**: Cambio de nombre de archivos y carpetas

#### Operaciones Avanzadas:
- ✅ **Copiar Archivos/Carpetas**: Copia a otra ubicación
- ✅ **Mover Archivos/Carpetas**: Movimiento con eliminación del original
- ✅ **Crear Carpetas**: Creación de nuevas carpetas
- ✅ **Eliminar Carpetas**: Eliminación recursiva de carpetas y su contenido
- ✅ **Navegación**: Navegación por carpetas con breadcrumbs

### 4. Visualización de Imágenes

#### Características de Imágenes:
- **Thumbnails Automáticos**: Las imágenes muestran miniaturas en la lista
- **Vista Previa**: Modal de vista previa a tamaño completo
- **Vista de Galería**: Vista en cuadrícula para visualización masiva
- **Filtro de Imágenes**: Opción para mostrar solo archivos de imagen
- **Formatos Soportados**: JPG, JPEG, PNG, GIF, BMP, WEBP, SVG, TIFF

### 5. Interfaz de Usuario

- **Vista de Lista**: Vista tradicional con detalles de archivos
- **Vista de Galería**: Vista en cuadrícula optimizada para imágenes
- **Breadcrumbs**: Navegación clara de la ruta actual
- **Modales**: Interfaz modal para operaciones (subir, renombrar, crear carpeta)
- **Responsive**: Diseño adaptable a diferentes tamaños de pantalla

---

## 🌟 Características Especiales

### 1. Sistema de Portapapeles

La aplicación implementa un sistema de portapapeles interno que permite:
- Copiar múltiples archivos/carpetas
- Mover múltiples archivos/carpetas
- Pegar en la ubicación actual
- Operaciones en lote

### 2. Vista de Imágenes Avanzada

#### Thumbnails Inteligentes:
- Carga automática de miniaturas desde S3
- Manejo de errores si la imagen no se puede cargar
- Indicadores de carga mientras se obtienen las imágenes

#### Modal de Vista Previa:
- Visualización a tamaño completo
- Cierre con tecla ESC o clic fuera
- Información del nombre del archivo
- Fondo oscuro para mejor contraste

#### Vista de Galería:
- Cuadrícula responsiva (2-5 columnas según pantalla)
- Hover effects con botones de acción
- Optimizada para revisar múltiples imágenes rápidamente

### 3. Filtrado Inteligente

- **Filtro de Imágenes**: Muestra solo archivos de imagen
- **Detección Automática**: Identifica imágenes por extensión
- **Aplicación en Tiempo Real**: El filtro se aplica instantáneamente

### 4. Navegación Jerárquica

- **Breadcrumbs Interactivos**: Click en cualquier nivel para navegar
- **Botón "Up"**: Navegación rápida al nivel superior
- **Ruta Actual Visible**: Siempre se muestra la ubicación actual

---

## 🔧 Configuración e Instalación

### Requisitos Previos

- Node.js (versión 18 o superior)
- npm o yarn
- Cuenta de AWS con acceso a S3
- Bucket de S3 configurado

### Pasos de Instalación

#### 1. Clonar o Descargar el Proyecto

```bash
# Si está en un repositorio Git
git clone <url-del-repositorio>
cd ts_oraculo_drone_datamanager
```

#### 2. Instalar Dependencias

```bash
npm install
```

#### 3. Configurar AWS S3 (pantalla Ajustes)

Copiar `.env.example` a `.env` y definir (prefijo `VITE_` obligatorio en Vite):

```
VITE_S3_BUCKET=nombre-de-tu-bucket-s3
VITE_AWS_ACCESS_KEY_ID=tu-access-key-id
VITE_AWS_SECRET_ACCESS_KEY=tu-secret-access-key
```

**⚠️ IMPORTANTE**: `.env` contiene credenciales sensibles y NO debe subirse a Git; reiniciar `npm run dev` tras cambios.

#### 4. Configurar Usuarios

Crear el archivo `public/users_auth.json` basado en `public/users_auth.json.example`:

```json
[
  {
    "username": "admin",
    "password": "password-seguro",
    "project_ids": [
      "proyecto_drone_1",
      "proyecto_drone_2",
      "proyecto_drone_3"
    ]
  },
  {
    "username": "usuario2",
    "password": "otro-password",
    "project_ids": [
      "proyecto_drone_1"
    ]
  }
]
```

#### 5. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Compila la aplicación para producción |
| `npm run preview` | Previsualiza la build de producción |
| `npm run lint` | Ejecuta el linter para verificar el código |

### Build para Producción

```bash
# Compilar
npm run build

# Los archivos compilados estarán en la carpeta 'dist/'
```

Para desplegar, subir el contenido de `dist/` a un servidor web estático (S3, CloudFront, Netlify, Vercel, etc.).

---

## 📖 Guía de Uso

### Flujo de Trabajo Básico

#### 1. Iniciar Sesión

1. Acceder a la aplicación
2. Ingresar username y password
3. Hacer clic en "Login"

#### 2. Seleccionar un Proyecto

1. Ir a la página "Projects"
2. Hacer clic en el proyecto deseado
3. Serás redirigido automáticamente al gestor de archivos

#### 3. Navegar por Archivos

- **Entrar a una carpeta**: Hacer clic en el nombre de la carpeta
- **Subir nivel**: Hacer clic en el botón "↑ Up"
- **Usar breadcrumbs**: Hacer clic en cualquier parte del breadcrumb

#### 4. Operaciones con Archivos

##### Subir Archivos:
1. Hacer clic en "Upload"
2. Seleccionar uno o múltiples archivos
3. Los archivos se subirán a la ubicación actual

##### Descargar Archivos:
1. Hacer clic en "Download" junto al archivo
2. El archivo se descargará automáticamente

##### Renombrar:
1. Hacer clic en "Rename"
2. Ingresar el nuevo nombre
3. Confirmar

##### Copiar/Mover:
1. Hacer clic en "Copy" o "Move"
2. Navegar a la ubicación destino
3. Hacer clic en "Paste"

##### Eliminar:
1. Hacer clic en "Delete"
2. Confirmar la eliminación

### Uso Avanzado

#### Visualización de Imágenes

##### Vista de Lista:
- Ver thumbnails junto a cada imagen
- Hacer clic en el thumbnail o botón "Preview" para vista previa

##### Vista de Galería:
1. Cambiar a vista de galería usando el botón de cuadrícula
2. Ver todas las imágenes en formato de cuadrícula
3. Hacer hover sobre una imagen para ver opciones
4. Hacer clic para vista previa completa

##### Filtrar Solo Imágenes:
1. Activar el checkbox "Solo imágenes"
2. Solo se mostrarán archivos de imagen
3. Útil para revisar rápidamente todas las imágenes de un proyecto

#### Organización de Proyectos

**Estructura Recomendada en S3:**
```
proyecto_drone_1/
├── 2024/
│   ├── enero/
│   │   ├── vuelo_001/
│   │   │   ├── imagen_001.jpg
│   │   │   ├── imagen_002.jpg
│   │   │   └── metadata.json
│   │   └── vuelo_002/
│   └── febrero/
└── procesados/
    └── ortomosaicos/
```

---

## 🔒 Seguridad

### Medidas de Seguridad Implementadas

#### 1. Autenticación
- Las contraseñas se almacenan en texto plano en `users_auth.json` (mejorable)
- La sesión se mantiene en localStorage del navegador
- ⚠️ **Recomendación**: Implementar hash de contraseñas en futuras versiones

#### 2. Credenciales AWS (Ajustes)
- Las credenciales estáticas se leen desde variables `VITE_*` en `.env` (quedan en el bundle del cliente al compilar)
- ⚠️ **IMPORTANTE**: No subir `.env` al repositorio Git

#### 3. URLs Firmadas
- Las URLs de descarga y visualización son firmadas y temporales
- Expiran después de 1 hora
- No exponen las credenciales directamente

#### 4. Control de Acceso
- Los usuarios solo pueden acceder a proyectos asignados
- El filtrado se realiza a nivel de aplicación
- ⚠️ **Recomendación**: Implementar políticas IAM en S3 para mayor seguridad

### Buenas Prácticas de Seguridad

1. **No subir `.env` ni `users_auth.json` a Git**
2. **Usar credenciales IAM con permisos mínimos necesarios**
3. **Rotar credenciales periódicamente**
4. **Implementar HTTPS en producción**
5. **Considerar usar AWS Cognito para autenticación en el futuro**

---

## 🎯 Casos de Uso

### Caso de Uso 1: Gestión de Imágenes de Drones

**Escenario**: Un equipo de topografía necesita organizar miles de imágenes de vuelos de drones.

**Solución**:
1. Crear proyectos por cliente o fecha
2. Organizar imágenes en carpetas por vuelo
3. Usar vista de galería para revisar rápidamente
4. Filtrar solo imágenes para análisis rápido

### Caso de Uso 2: Colaboración Multi-usuario

**Escenario**: Múltiples usuarios necesitan acceder a diferentes proyectos.

**Solución**:
1. Asignar proyectos específicos a cada usuario
2. Cada usuario solo ve sus proyectos asignados
3. Organización centralizada en un solo bucket S3

### Caso de Uso 3: Procesamiento de Datos

**Escenario**: Necesidad de organizar archivos antes del procesamiento.

**Solución**:
1. Crear estructura de carpetas lógica
2. Mover archivos entre carpetas según necesidad
3. Renombrar archivos para seguir convenciones
4. Copiar archivos para backups

### Caso de Uso 4: Revisión de Imágenes

**Escenario**: Revisar calidad de imágenes antes del procesamiento.

**Solución**:
1. Usar filtro "Solo imágenes"
2. Vista de galería para vista rápida
3. Vista previa para detalles
4. Eliminar imágenes de baja calidad directamente

---

## ✨ Mejoras Implementadas

### Versión Actual (Última Actualización)

#### 1. Visualización de Imágenes
- ✅ Thumbnails automáticos en vista de lista
- ✅ Modal de vista previa a tamaño completo
- ✅ Vista de galería en cuadrícula
- ✅ Detección automática de archivos de imagen

#### 2. Filtrado y Búsqueda
- ✅ Filtro para mostrar solo imágenes
- ✅ Toggle entre vista de lista y galería

#### 3. Experiencia de Usuario
- ✅ Interfaz más intuitiva
- ✅ Indicadores de carga
- ✅ Manejo de errores mejorado
- ✅ Navegación mejorada con breadcrumbs

#### 4. Accesibilidad
- ✅ Eliminación de protección de rutas (opcional)
- ✅ Navegación por teclado
- ✅ Labels y aria-labels en elementos interactivos

---

## 🚀 Mejoras Futuras

### Corto Plazo

1. **Búsqueda de Archivos**
   - Implementar búsqueda por nombre
   - Filtros por tipo de archivo
   - Búsqueda por fecha

2. **Subida Múltiple Mejorada**
   - Barra de progreso para múltiples archivos
   - Drag and drop
   - Preview antes de subir

3. **Metadatos de Imágenes**
   - Mostrar EXIF data de imágenes
   - Información de resolución
   - Fecha de captura

### Mediano Plazo

1. **Autenticación Mejorada**
   - Hash de contraseñas
   - Integración con AWS Cognito
   - Tokens JWT

2. **Permisos Granulares**
   - Permisos por usuario (lectura/escritura)
   - Permisos por proyecto
   - Roles de usuario

3. **Historial y Auditoría**
   - Log de operaciones
   - Historial de cambios
   - Restauración de archivos eliminados

### Largo Plazo

1. **Procesamiento de Imágenes**
   - Generación de thumbnails automáticos
   - Compresión de imágenes
   - Conversión de formatos

2. **Integración con Servicios AWS**
   - AWS Lambda para procesamiento
   - CloudFront para CDN
   - S3 Lifecycle policies

3. **Análisis y Reportes**
   - Estadísticas de uso
   - Análisis de espacio
   - Reportes de proyectos

4. **API REST**
   - Backend separado
   - API para integraciones
   - Webhooks para eventos

---

## 📊 Métricas y Rendimiento

### Características de Rendimiento

- **Carga Inicial**: Optimizada con Vite para desarrollo rápido
- **Lazy Loading**: Las imágenes se cargan bajo demanda
- **URLs Firmadas**: Válidas por 1 hora, reduciendo llamadas a S3
- **Caché**: Thumbnails se mantienen en memoria durante la sesión

### Limitaciones Conocidas

1. **Tamaño de Archivos**: No hay límite técnico, pero archivos muy grandes pueden tardar
2. **Cantidad de Archivos**: Listar muchos archivos puede ser lento (considerar paginación)
3. **Credenciales en Cliente**: Las credenciales AWS están en el cliente (no ideal para producción)

---

## 🐛 Troubleshooting

### Problemas Comunes

#### Error al cargar configuración S3 / variables `VITE_*`
**Solución**: Verificar que existe `.env` con `VITE_S3_BUCKET`, `VITE_AWS_ACCESS_KEY_ID` y `VITE_AWS_SECRET_ACCESS_KEY` y reiniciar el servidor de desarrollo.

#### Error: "Failed to load users_auth.json"
**Solución**: Verificar que el archivo `public/users_auth.json` existe y es un array JSON válido.

#### Error: "Failed to load files"
**Solución**: 
- Verificar credenciales AWS
- Verificar que el bucket existe
- Verificar permisos IAM del usuario

#### Las imágenes no se muestran
**Solución**:
- Verificar que las credenciales tienen permisos de lectura
- Verificar formato de archivo (debe ser imagen válida)
- Revisar consola del navegador para errores

#### No puedo subir archivos
**Solución**:
- Verificar permisos de escritura en IAM
- Verificar espacio disponible en el bucket
- Verificar tamaño del archivo

---

## 📝 Conclusión

**S3 File Manager** es una solución completa y moderna para gestionar archivos en AWS S3, especialmente diseñada para organizar y visualizar imágenes de drones. La aplicación combina una interfaz intuitiva con funcionalidades avanzadas de gestión de archivos, proporcionando una alternativa eficiente a la consola de AWS.

### Puntos Fuertes:
- ✅ Interfaz moderna y fácil de usar
- ✅ Funcionalidades completas de gestión de archivos
- ✅ Visualización avanzada de imágenes
- ✅ Control de acceso por proyectos
- ✅ Arquitectura escalable y mantenible

### Áreas de Mejora:
- ⚠️ Seguridad de autenticación (hash de contraseñas)
- ⚠️ Credenciales en cliente (mover a backend)
- ⚠️ Paginación para grandes cantidades de archivos
- ⚠️ Búsqueda y filtros avanzados

El proyecto está en un estado funcional y listo para uso, con un camino claro para mejoras futuras que lo convertirán en una solución aún más robusta y completa.

---

## 📞 Contacto y Soporte

Para preguntas, sugerencias o reporte de problemas, contactar al equipo de desarrollo.

---

**Versión del Documento**: 1.0  
**Última Actualización**: 2024  
**Autor**: Equipo de Desarrollo  
**Licencia**: Privada

---

## 📚 Referencias

- [Documentación de AWS SDK para JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [Documentación de React](https://react.dev/)
- [Documentación de TypeScript](https://www.typescriptlang.org/)
- [Documentación de Tailwind CSS](https://tailwindcss.com/)
- [Documentación de Vite](https://vitejs.dev/)

---

*Este documento es propiedad del proyecto y está sujeto a actualizaciones periódicas.*

