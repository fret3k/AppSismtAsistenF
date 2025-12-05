import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { getSettings } from '../pages/ConfiguracionPage';
import './FaceAttendance.css';

// Tipos para el flujo de validación
type ValidationStep = 'loading' | 'waiting' | 'detecting' | 'challenge' | 'validating' | 'success' | 'error' | 'no_match';

interface AsistenciaResponse {
    score?: number;
    matched_personal_id?: string;
    mensaje?: string;
    usuario?: string;
    tipo?: string;
    estado?: string;
    fecha?: string;
}

interface ErrorResponse {
    detail?: string;
}

const FaceAttendance: React.FC = () => {
    // Referencias DOM
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectionIntervalRef = useRef<number | null>(null);

    // Estados
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [validationStep, setValidationStep] = useState<ValidationStep>('loading');
    const [statusMessage, setStatusMessage] = useState("Cargando modelos...");
    const [happyScore, setHappyScore] = useState(0);
    const [detectedPerson, setDetectedPerson] = useState<AsistenciaResponse | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Configuración
    const [requireSmile, setRequireSmile] = useState(true);
    const [smileThreshold, setSmileThreshold] = useState(0.7);

    const API_BASE_URL = 'http://localhost:8000';

    // Cargar configuración
    const loadSettings = useCallback(() => {
        const settings = getSettings();
        setRequireSmile(settings.requireSmile);
        setSmileThreshold(settings.smileThreshold);
    }, []);

    // Escuchar cambios en configuración
    useEffect(() => {
        loadSettings();

        const handleSettingsChange = () => loadSettings();
        window.addEventListener('settingsChanged', handleSettingsChange);

        return () => {
            window.removeEventListener('settingsChanged', handleSettingsChange);
        };
    }, [loadSettings]);

    // Cargar modelos de face-api.js
    const loadModels = useCallback(async () => {
        const MODEL_URL = '/models';
        try {
            setStatusMessage("Inicializando...");
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
            setValidationStep('waiting');
            setStatusMessage("Listo");
        } catch (error) {
            console.error("Error al cargar modelos:", error);
            setValidationStep('error');
            setStatusMessage("Error al cargar modelos");
        }
    }, []);

    // Iniciar video
    const startVideo = useCallback(async () => {
        try {
            setStatusMessage("Accediendo a cámara...");
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setIsCameraActive(true);
                setValidationStep('detecting');
                setStatusMessage("Buscando rostro...");
            }
        } catch (err) {
            console.error("Error al acceder a la cámara:", err);
            setValidationStep('error');
            setStatusMessage("Sin acceso a cámara");
            setIsCameraActive(false);
        }
    }, []);

    // Detener video
    const stopVideo = useCallback(() => {
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            streamRef.current = null;
            setIsCameraActive(false);
            setValidationStep('waiting');
            setStatusMessage("Cámara apagada");
            setHappyScore(0);
        }
    }, []);

    // Toggle cámara
    const toggleCamera = useCallback(() => {
        if (isCameraActive) {
            stopVideo();
        } else {
            startVideo();
        }
    }, [isCameraActive, startVideo, stopVideo]);

    // Capturar imagen del video como base64
    const captureImageBase64 = useCallback((): string => {
        if (!videoRef.current) return '';

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            return dataUrl.split(',')[1];
        }
        return '';
    }, []);

    // Detectar rostro y expresiones
    const detectFace = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !modelsLoaded) {
            return { faceDetected: false, happyScore: 0, descriptor: null };
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const displaySize = { width: video.videoWidth, height: video.videoHeight };

        faceapi.matchDimensions(canvas, displaySize);

        const detections = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions()
            .withFaceDescriptor();

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (detections) {
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            faceapi.draw.drawDetections(canvas, resizedDetections);

            const happy = detections.expressions.happy || 0;

            return {
                faceDetected: true,
                happyScore: happy,
                descriptor: detections.descriptor
            };
        }

        return { faceDetected: false, happyScore: 0, descriptor: null };
    }, [modelsLoaded]);

    // Enviar asistencia en tiempo real
    const sendRealtimeAttendance = useCallback(async (embedding: Float32Array, tipoRegistro: string = 'ENTRADA_M') => {
        const imagenBase64 = captureImageBase64();
        const embeddingArray = Array.from(embedding);

        const response = await fetch(`${API_BASE_URL}/asistencia/realtime`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embedding: embeddingArray,
                marca_tiempo: new Date().toISOString(),
                tipo_registro: tipoRegistro,
                imagen_base64: imagenBase64
            }),
        });

        if (response.ok) {
            const data: AsistenciaResponse = await response.json();
            return { success: true, data };
        } else {
            const errorData: ErrorResponse = await response.json();
            return { success: false, error: errorData.detail || 'Error desconocido' };
        }
    }, [captureImageBase64]);

    // Proceso de asistencia
    const processAttendance = useCallback(async (descriptor: Float32Array) => {
        try {
            setValidationStep('validating');
            setStatusMessage("Verificando...");

            const result = await sendRealtimeAttendance(descriptor, 'ENTRADA_M');

            if (result.success && result.data) {
                setDetectedPerson(result.data);
                setValidationStep('success');
                setStatusMessage("¡Registrado!");

                setTimeout(() => {
                    setValidationStep('detecting');
                    setStatusMessage("Buscando rostro...");
                    setHappyScore(0);
                    setDetectedPerson(null);
                }, 3000);
            } else {
                setErrorMessage(result.error || 'No se encontró coincidencia');
                setValidationStep('no_match');
                setStatusMessage("Sin coincidencia");

                setTimeout(() => {
                    setValidationStep('detecting');
                    setStatusMessage("Buscando rostro...");
                    setErrorMessage('');
                }, 2000);
            }
        } catch (error) {
            console.error('Error:', error);
            setErrorMessage('Error de conexión');
            setValidationStep('error');
            setStatusMessage("Error");

            setTimeout(() => {
                setValidationStep('detecting');
                setStatusMessage("Buscando rostro...");
                setErrorMessage('');
            }, 2000);
        }
    }, [sendRealtimeAttendance]);

    // Función de detección continua
    const runDetection = useCallback(async () => {
        const result = await detectFace();

        if (result.faceDetected && result.descriptor) {
            setHappyScore(result.happyScore);

            // Si NO se requiere sonrisa, procesar directamente
            if (!requireSmile) {
                if (validationStep === 'detecting') {
                    if (detectionIntervalRef.current) {
                        clearInterval(detectionIntervalRef.current);
                        detectionIntervalRef.current = null;
                    }
                    await processAttendance(result.descriptor);
                }
            } else {
                // Si se requiere sonrisa, seguir el flujo normal
                if (validationStep === 'detecting') {
                    setValidationStep('challenge');
                    setStatusMessage("Sonría");
                } else if (validationStep === 'challenge') {
                    if (result.happyScore >= smileThreshold) {
                        if (detectionIntervalRef.current) {
                            clearInterval(detectionIntervalRef.current);
                            detectionIntervalRef.current = null;
                        }
                        await processAttendance(result.descriptor);
                    }
                }
            }
        } else {
            if (validationStep !== 'success' && validationStep !== 'validating' &&
                validationStep !== 'error' && validationStep !== 'no_match') {
                setValidationStep('detecting');
                setStatusMessage("Buscando rostro...");
                setHappyScore(0);
            }
        }
    }, [detectFace, validationStep, processAttendance, requireSmile, smileThreshold]);

    // Loop de detección
    useEffect(() => {
        if (!isCameraActive || !modelsLoaded) return;
        if (validationStep === 'validating' || validationStep === 'success' ||
            validationStep === 'error' || validationStep === 'no_match') return;

        detectionIntervalRef.current = window.setInterval(runDetection, 200);

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, [isCameraActive, modelsLoaded, validationStep, runDetection]);

    // Cargar modelos al montar
    useEffect(() => {
        loadModels();
        return () => stopVideo();
    }, [loadModels, stopVideo]);

    // Clase CSS según estado
    const getStepClass = (): string => {
        switch (validationStep) {
            case 'success': return 'success';
            case 'error': case 'no_match': return 'error';
            case 'challenge': return 'challenge';
            case 'validating': return 'validating';
            default: return isCameraActive ? 'active' : '';
        }
    };

    return (
        <div className="face-attendance-container">
            <div className="camera-card">
                {/* Video con canvas overlay */}
                <div className="video-container">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        onLoadedMetadata={() => {
                            if (canvasRef.current && videoRef.current) {
                                canvasRef.current.width = videoRef.current.videoWidth;
                                canvasRef.current.height = videoRef.current.videoHeight;
                            }
                        }}
                    />
                    <canvas ref={canvasRef} className="detection-canvas" />

                    {/* Badge de estado */}
                    <div className={`status-badge ${getStepClass()}`}>
                        {validationStep === 'validating' && <span className="mini-spinner"></span>}
                        {statusMessage}
                        {!requireSmile && validationStep === 'detecting' && (
                            <span className="mode-badge">Auto</span>
                        )}
                    </div>

                    {/* Indicador de sonrisa (solo si está activo) */}
                    {requireSmile && validationStep === 'challenge' && (
                        <div className="smile-indicator">
                            <div className="smile-bar">
                                <div
                                    className={`smile-fill ${happyScore >= smileThreshold ? 'valid' : ''}`}
                                    style={{ width: `${happyScore * 100}%` }}
                                />
                            </div>
                            <span className="smile-emoji">😊</span>
                        </div>
                    )}

                    {/* Toast de éxito */}
                    {validationStep === 'success' && detectedPerson && (
                        <div className="success-toast">
                            <div className="toast-icon">✓</div>
                            <div className="toast-content">
                                <span className="toast-name">{detectedPerson.usuario || 'Usuario'}</span>
                                <span className="toast-info">
                                    {detectedPerson.tipo} • {detectedPerson.estado}
                                </span>
                                {detectedPerson.score && (
                                    <span className="toast-score">
                                        Coincidencia: {Math.round(detectedPerson.score * 100)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Toast de error */}
                    {validationStep === 'no_match' && (
                        <div className="error-toast">
                            <div className="toast-icon">✗</div>
                            <div className="toast-content">
                                <span className="toast-name">{errorMessage}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Controles */}
                <div className="controls">
                    <button
                        className={isCameraActive ? "btn-secondary" : "btn-primary"}
                        onClick={toggleCamera}
                        disabled={!modelsLoaded}
                    >
                        {isCameraActive ? '⏹ Detener' : '▶ Iniciar'}
                    </button>
                </div>

                {/* Indicador de configuración */}
                {!requireSmile && (
                    <div className="config-indicator">
                        ⚡ Modo rápido (sin sonrisa)
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaceAttendance;
