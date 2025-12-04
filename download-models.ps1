# Script para descargar modelos de face-api.js desde GitHub

$modelsDir = "public\models"
$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

# Crear directorio si no existe
if (!(Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Force -Path $modelsDir
}

# Lista de archivos a descargar
$files = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
)

Write-Host "Descargando modelos de face-api.js..." -ForegroundColor Green

foreach ($file in $files) {
    $url = "$baseUrl/$file"
    $output = "$modelsDir\$file"
    
    Write-Host "Descargando $file..." -ForegroundColor Yellow
    
    try {
        Invoke-WebRequest -Uri $url -OutFile $output
        Write-Host "✓ $file descargado" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Error descargando $file : $_" -ForegroundColor Red
    }
}

Write-Host "`n¡Modelos descargados exitosamente!" -ForegroundColor Green
Write-Host "Los modelos están en: $modelsDir" -ForegroundColor Cyan
