# SICAPE - Sistema Control de Asistencia y Permanencia

## 📋 Descripción

Sistema de control de asistencia y permanencia con reconocimiento facial utilizando face-api.js.

## 🏗️ Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── FaceAttendance.tsx    # Componente de cámara facial
│   ├── Navbar.tsx            # Barra de navegación
│   └── Sidebar.tsx           # Menú lateral del dashboard
├── pages/              # Páginas de la aplicación
│   ├── Login.tsx            # Página de inicio de sesión
│   └── Dashboard.tsx        # Panel principal
├── layouts/            # Layouts de la aplicación
│   └── DashboardLayout.tsx  # Layout del dashboard
├── services/           # Servicios API
│   ├── api.ts              # Configuración base de API
│   ├── authService.ts      # Servicio de autenticación
│   ├── personalService.ts  # Servicio de personal
│   ├── asistenciaService.ts # Servicio de asistencias
│   └── permisoService.ts   # Servicio de permisos
├── context/            # Contextos de React
│   └── AuthContext.tsx     # Contexto de autenticación
├── types/              # Definiciones de TypeScript
│   └── index.ts            # Tipos de datos
└── App.tsx             # Componente principal
```

## 🔐 Roles de Usuario

### Administrador
- Acceso completo al sistema
- Gestión de personal
- Aprobación de permisos
- Generación de reportes
- Visualización de todas las asistencias

### Usuario Normal
- Registro de asistencia
- Visualización de asistencias propias
- Solicitud de permisos
- Consulta de reportes personales

## 📡 Estructura de la API

### Autenticación

#### POST `/personal/login`
Login de usuario

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "stringst"
}
```

**Response (200):**
```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

### Personal (Requiere autenticación)

#### GET `/personal`
Obtener lista de personal

#### GET `/personal/{id}`
Obtener personal por ID

#### POST `/personal`
Crear nuevo personal

#### PUT `/personal/{id}`
Actualizar personal

#### DELETE `/personal/{id}`
Eliminar personal

### Asistencias (Requiere autenticación)

#### GET `/asistencias`
Obtener todas las asistencias

#### GET `/asistencias/personal/{personalId}`
Obtener asistencias por personal

#### GET `/asistencias?start_date={date}&end_date={date}`
Obtener asistencias por rango de fechas

#### POST `/asistencias/entrada`
Registrar entrada
```json
{
  "personal_id": 1
}
```

#### PUT `/asistencias/{id}/salida`
Registrar salida

### Permisos (Requiere autenticación)

#### GET `/permisos`
Obtener todos los permisos

#### GET `/permisos/personal/{personalId}`
Obtener permisos por personal

#### POST `/permisos`
Crear nuevo permiso

#### PUT `/permisos/{id}/aprobar`
Aprobar permiso (Solo admin)

#### PUT `/permisos/{id}/rechazar`
Rechazar permiso (Solo admin)

## 🚀 Instalación

1. Clonar el repositorio
```bash
git clone <repository-url>
cd AppSismtAsistenF
```

2. Instalar dependencias
```bash
npm install
```

3. Configurar variables de entorno
```bash
cp .env.example .env
```

Editar `.env` con la URL de tu API:
```
VITE_API_URL=http://localhost:8000
```

4. Ejecutar en desarrollo
```bash
npm run dev
```

## 🔑 Usuarios de Prueba

### Administrador
- Email: `admin@sicape.com`
- Password: `password`

### Usuario Normal
- Email: `user@sicape.com`
- Password: `password`

## 📦 Dependencias Principales

- **React 19** - Framework UI
- **TypeScript** - Tipado estático
- **React Router DOM** - Navegación
- **face-api.js** - Reconocimiento facial

## 🎨 Características

- ✅ Autenticación con JWT
- ✅ Dashboard con estadísticas
- ✅ Sidebar con navegación por roles
- ✅ Reconocimiento facial (face-api.js)
- ✅ Diseño responsive
- ✅ Animaciones suaves
- ✅ Tema personalizado (Rojo oscuro)

## 📝 Notas de Desarrollo

### Próximos Pasos

1. **Implementar face-api.js**
   - Descargar modelos de face-api.js
   - Colocar en carpeta `public/models`
   - Descomentar código de carga de modelos en `FaceAttendance.tsx`

2. **Conectar con API real**
   - Actualizar `VITE_API_URL` en `.env`
   - Implementar endpoint para obtener datos de usuario después del login
   - Ajustar tipos según respuestas reales de la API

3. **Páginas pendientes**
   - Personal (CRUD completo)
   - Asistencias (Tabla con filtros)
   - Permisos (Formulario y aprobación)
   - Reportes (Gráficos y exportación)
   - Ayuda (Documentación)
   - Versión (Información del sistema)

## 🛠️ Scripts Disponibles

```bash
npm run dev      # Ejecutar en desarrollo
npm run build    # Construir para producción
npm run preview  # Vista previa de producción
npm run lint     # Ejecutar linter
```

## 📄 Licencia

Este proyecto es privado y confidencial.

## 👥 Autor

Desarrollado para el sistema SICAPE
