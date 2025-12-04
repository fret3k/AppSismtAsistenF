# Integración con API - Sistema de Asistencia

## Resumen de Cambios

Se ha integrado completamente la aplicación frontend con la API FastAPI local (`http://127.0.0.1:8000`). Los cambios incluyen:

### 1. **Actualización de Tipos (types/index.ts)**

Se actualizaron todos los tipos TypeScript para coincidir exactamente con los DTOs de la API:

- **PersonalResponseDTO**: Representa los datos de personal devueltos por la API
  - `id`: UUID (string)
  - `dni`, `nombre`, `apellido_paterno`, `apellido_materno`, `email`
  - `es_administrador`: boolean

- **PersonalCreateDTO**: Para crear nuevo personal
  - Incluye todos los campos de PersonalResponseDTO más `password`

- **TokenResponseDTO**: Respuesta de autenticación
  - `access_token`: string
  - `token_type`: string

- **EncodingFaceResponseDTO/CreateDTO**: Para gestión de encodings faciales
  - `personal_id`: UUID
  - `vector`: array de números (encoding facial)
  - `embedding_model`, `version`

- **RegistrarAsistenciaDTO**: Para registrar asistencias
  - `personal_id`: UUID
  - `reconocimiento_valido`: boolean
  - `motivo`: string opcional

### 2. **Servicios Actualizados**

#### **personalService.ts**
- `getAll()`: GET /personal/ - Obtiene todos los usuarios
- `getById(id)`: GET /personal/{personal_id} - Obtiene un usuario por UUID
- `create(data)`: POST /personal/ - Crea nuevo personal
- `delete(id)`: DELETE /personal/{personal_id} - Elimina personal

#### **authService.ts** (sin cambios)
- `login()`: POST /personal/login - Autenticación
- Almacena el token JWT en localStorage

#### **asistenciaService.ts**
- `registrar(data)`: POST /asistencia/registrar - Registra asistencia
- Métodos adicionales preparados para futuros endpoints

#### **encodingFaceService.ts** (NUEVO)
- `getAll()`: GET /encoding-face/ - Obtiene todos los encodings
- `getById(id)`: GET /encoding-face/{id} - Obtiene encoding por ID
- `getByPersonalId(personalId)`: GET /encoding-face/personal/{personal_id}
- `create(data)`: POST /encoding-face/ - Crea nuevo encoding
- `delete(id)`: DELETE /encoding-face/{id} - Elimina encoding

### 3. **AuthContext Actualizado**

El contexto de autenticación ahora:

1. **Login Real**: Llama a `/personal/login` para obtener el token JWT
2. **Obtiene Datos del Usuario**: Después del login, obtiene todos los usuarios y filtra por email
3. **Convierte a User**: Transforma PersonalResponseDTO a User con el rol correcto
4. **Almacena en localStorage**: Guarda el usuario completo con todos sus datos

```typescript
const userData: User = {
    id: personalData.id,
    email: personalData.email,
    nombre: personalData.nombre,
    apellido_paterno: personalData.apellido_paterno,
    apellido_materno: personalData.apellido_materno,
    rol: personalData.es_administrador ? 'admin' : 'user',
    es_administrador: personalData.es_administrador,
};
```

### 4. **Sidebar Mejorado**

#### **Modo Administrador** (es_administrador = true)
Muestra TODAS las opciones:

**Principal:**
- 📊 Dashboard
- 👥 Gestión Personal
- 👤 Mi Perfil

**Asistencias:**
- 📅 Registro Asistencias
- 📊 Reporte General
- 📝 Gestión Permisos

**Reconocimiento Facial:**
- 🔐 Gestión Encodings
- 📸 Registrar Rostro

**Reportes:**
- 📈 Reportes Generales
- 📉 Estadísticas
- 💾 Exportar Datos

**Sistema:**
- ⚙️ Configuración
- 👨‍💼 Gestión Usuarios
- ❓ Ayuda
- ℹ️ Versión

#### **Modo Usuario** (es_administrador = false)
Muestra SOLO información del usuario:

**Principal:**
- 📊 Dashboard
- 👤 Mi Perfil

**Asistencias:**
- 📅 Registro Asistencias
- 📋 Mis Asistencias
- 📄 Mis Permisos

**Reconocimiento Facial:**
- 📸 Registrar Rostro

**Sistema:**
- ❓ Ayuda
- ℹ️ Versión

### 5. **Configuración de API**

Se creó el archivo `.env` para configurar la URL base de la API:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## Endpoints Disponibles en la API

### Personal
- `GET /personal/` - Listar todo el personal
- `POST /personal/` - Crear personal
- `GET /personal/{personal_id}` - Obtener por ID
- `DELETE /personal/{personal_id}` - Eliminar personal
- `POST /personal/login` - Login
- `POST /personal/forgot-password` - Recuperar contraseña
- `POST /personal/reset/{token}` - Resetear contraseña

### Encoding Face
- `GET /encoding-face/` - Listar encodings
- `POST /encoding-face/` - Crear encoding
- `GET /encoding-face/{id}` - Obtener por ID
- `DELETE /encoding-face/{id}` - Eliminar encoding
- `GET /encoding-face/personal/{personal_id}` - Obtener por personal

### Asistencia
- `POST /asistencia/registrar` - Registrar asistencia

## Flujo de Autenticación

1. **Usuario ingresa credenciales** en `/login`
2. **Frontend llama** a `POST /personal/login` con email y password
3. **API devuelve** `{ access_token, token_type }`
4. **Frontend almacena** el token en localStorage
5. **Frontend obtiene** todos los usuarios con `GET /personal/`
6. **Frontend filtra** por email para encontrar el usuario actual
7. **Frontend determina** el rol basado en `es_administrador`
8. **Frontend muestra** las opciones del sidebar según el rol

## Próximos Pasos

Para completar la integración, necesitarás crear las páginas correspondientes:

### Páginas Requeridas (Admin)
- `/dashboard/personal` - Gestión de personal (CRUD)
- `/dashboard/encoding-faces` - Gestión de encodings faciales
- `/dashboard/reporte-asistencias` - Reportes de asistencias
- `/dashboard/permisos` - Gestión de permisos
- `/dashboard/reportes` - Reportes generales
- `/dashboard/estadisticas` - Estadísticas
- `/dashboard/exportar` - Exportar datos
- `/dashboard/configuracion` - Configuración del sistema
- `/dashboard/usuarios` - Gestión de usuarios

### Páginas Requeridas (Usuario)
- `/dashboard/mi-perfil` - Perfil del usuario
- `/dashboard/mis-asistencias` - Asistencias del usuario
- `/dashboard/mis-permisos` - Permisos del usuario
- `/dashboard/registrar-rostro` - Registrar rostro para reconocimiento

### Páginas Comunes
- `/dashboard/asistencias` - Registro de asistencias (facial)
- `/dashboard/ayuda` - Ayuda
- `/dashboard/version` - Información de versión

## Notas Importantes

1. **UUIDs**: La API usa UUIDs (strings) en lugar de números para los IDs
2. **Autenticación**: Todos los endpoints (excepto login) requieren el token JWT
3. **CORS**: Asegúrate de que la API tenga CORS habilitado para `http://localhost:5173`
4. **Validación**: La API valida todos los datos con Pydantic
5. **Passwords**: Los passwords se envían en texto plano y se hashean en el backend

## Pruebas

Para probar la integración:

1. Asegúrate de que la API esté corriendo en `http://127.0.0.1:8000`
2. Verifica que haya al menos un usuario en la base de datos
3. Intenta hacer login con las credenciales
4. Verifica que el sidebar muestre las opciones correctas según el rol
5. Prueba las llamadas a la API desde el navegador (Network tab)

## Estructura de Archivos Modificados

```
src/
├── types/
│   └── index.ts ✅ Actualizado con DTOs de la API
├── services/
│   ├── api.ts ✅ Sin cambios (ya configurado)
│   ├── authService.ts ✅ Sin cambios (ya funcional)
│   ├── personalService.ts ✅ Actualizado con endpoints correctos
│   ├── asistenciaService.ts ✅ Actualizado con /asistencia/registrar
│   └── encodingFaceService.ts ✅ NUEVO servicio
├── context/
│   └── AuthContext.tsx ✅ Actualizado para obtener datos reales
└── components/
    └── Sidebar.tsx ✅ Actualizado con menú completo admin/user
```

## Comandos Útiles

```bash
# Ver la documentación de la API
http://127.0.0.1:8000/docs

# Ver el esquema OpenAPI
http://127.0.0.1:8000/openapi.json

# Ejecutar el frontend
npm run dev
```
