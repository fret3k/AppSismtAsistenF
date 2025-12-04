# Configuración de Face-API.js Models

## Descargar Modelos

Los modelos de face-api.js deben estar en la carpeta `public/models/` para que funcione el reconocimiento facial.

### Opción 1: Descargar desde GitHub (Recomendado)

1. Ve a: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

2. Descarga los siguientes archivos y colócalos en `public/models/`:
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`
   - `face_recognition_model-shard2`

### Opción 2: Usar npm para copiar los modelos

```bash
# Instalar face-api.js si no está instalado
npm install face-api.js

# Crear carpeta models en public
mkdir public\models

# Copiar modelos desde node_modules (Windows PowerShell)
Copy-Item -Path "node_modules\face-api.js\weights\*" -Destination "public\models\" -Recurse
```

### Opción 3: Descargar directamente

Puedes descargar todos los modelos de aquí:
https://github.com/justadudewhohacks/face-api.js-models/tree/master/weights

## Estructura de Carpetas

Después de descargar, tu estructura debe verse así:

```
public/
└── models/
    ├── tiny_face_detector_model-weights_manifest.json
    ├── tiny_face_detector_model-shard1
    ├── face_landmark_68_model-weights_manifest.json
    ├── face_landmark_68_model-shard1
    ├── face_recognition_model-weights_manifest.json
    ├── face_recognition_model-shard1
    └── face_recognition_model-shard2
```

## Verificación

Para verificar que los modelos están correctamente instalados:

1. Ejecuta `npm run dev`
2. Abre la consola del navegador (F12)
3. Ve a la pestaña Network
4. Intenta capturar un rostro
5. Deberías ver las peticiones a `/models/...` con status 200

## Notas

- Los modelos pesan aproximadamente 5-10 MB en total
- Se cargan una sola vez al abrir el componente FaceCapture
- El modelo `tiny_face_detector` es más rápido pero menos preciso
- El modelo `face_recognition` genera un vector de 128 dimensiones

## Solución de Problemas

### Error: "Failed to load models"
- Verifica que los archivos estén en `public/models/`
- Verifica que los nombres de archivo sean exactos
- Revisa la consola del navegador para ver qué archivo falta

### Error: "404 Not Found" para modelos
- Asegúrate de que la carpeta sea `public/models/` no `src/models/`
- Reinicia el servidor de desarrollo después de copiar los archivos

### El reconocimiento facial no funciona
- Verifica que tengas buena iluminación
- Asegúrate de que el rostro esté centrado
- Prueba con diferentes ángulos
