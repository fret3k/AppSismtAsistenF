import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import Icon from './Icon';
import { getSettings } from '../pages/ConfiguracionPage';
import RecentAttendances from './RecentAttendances';
import './FaceAttendance.css';

// Tipos para el flujo de validación
type ValidationStep = 'loading' | 'waiting' | 'detecting' | 'challenge' | 'validating' | 'success' | 'error' | 'no_match';

interface AsistenciaResponse {
    reconocido?: boolean;
    mensaje?: string;
    detalle?: string;
    usuario?: string;
    turno?: string;
    estado?: string;
    hora?: string;
    ya_registrado?: boolean;
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
    const [updateTrigger, setUpdateTrigger] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Configuración
    const [requireSmile, setRequireSmile] = useState(true);
    const [smileThreshold, setSmileThreshold] = useState(0.7);
    const [showRecentAttendances, setShowRecentAttendances] = useState(true);

    const API_BASE_URL = 'http://localhost:8000';

    // Cargar configuración
    const loadSettings = useCallback(() => {
        const settings = getSettings();
        setRequireSmile(settings.requireSmile);
        setSmileThreshold(settings.smileThreshold);
        setShowRecentAttendances(settings.showRecentAttendances);
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
    const sendRealtimeAttendance = useCallback(async (embedding: Float32Array) => {
        const imagenBase64 = captureImageBase64();
        const embeddingArray = Array.from(embedding);

        const response = await fetch(`${API_BASE_URL}/asistencia/realtime`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embedding: embeddingArray,
                marca_tiempo: new Date().toISOString(),
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

            const result = await sendRealtimeAttendance(descriptor);

            if (result.success && result.data) {
                setDetectedPerson(result.data);
                setValidationStep('success');
                setStatusMessage("¡Registrado!");
                setUpdateTrigger(prev => prev + 1); // Actualizar historial

                setTimeout(() => {
                    setValidationStep('detecting');
                    setStatusMessage("Buscando rostro...");
                    setHappyScore(0);
                    setDetectedPerson(null);
                }, 12000); // Aumentado a 12s
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

    // Actualizar reloj cada segundo
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

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

    // Formatear fecha y hora
    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    const formatDate = (date: Date): string => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        const dayName = days[date.getDay()];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        return `${dayName}, ${day} de ${month} de ${year}`;
    };

    return (
        <div className="face-attendance-container">
            {/* Columna Izquierda: Cámara Maximizada */}
            <div className="main-column">
                <div className="camera-card">
                    {/* Header de la tarjeta */}
                    <div className="camera-header">
                        <div className={`status-pill ${isCameraActive ? 'active' : 'inactive'}`}>
                            <span className="status-dot"></span>
                            {isCameraActive ? 'CÁMARA ACTIVA' : 'CÁMARA INACTIVA'}
                        </div>
                        <div className="camera-id">
                            <Icon name="camera" size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
                            CAM-01
                        </div>
                    </div>

                    {/* Video con canvas overlay */}
                    <div className="video-container">
                        <div className="video-wrapper">
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

                            {/* Overlay de escaneo */}
                            {isCameraActive && <div className="scan-overlay"></div>}

                            {/* Estado: Validando / Mensajes */}
                            <div className={`status-overlay ${getStepClass()}`}>
                                {validationStep === 'validating' && <span className="mini-spinner"></span>}
                                <span className="status-text">{statusMessage}</span>
                            </div>

                            {/* Indicador de sonrisa */}
                            {requireSmile && validationStep === 'challenge' && (
                                <div className="smile-indicator">
                                    <div className="smile-bar">
                                        <div
                                            className={`smile-fill ${happyScore >= smileThreshold ? 'valid' : ''}`}
                                            style={{ width: `${happyScore * 100}%` }}
                                        />
                                    </div>
                                    <Icon name="smile" size={24} className="smile-emoji" color="white" />
                                </div>
                            )}

                            {/* Toast de éxito / error */}
                            {validationStep === 'success' && detectedPerson && (
                                <div className={`result-toast success ${detectedPerson.ya_registrado ? 'warning' : ''}`}>
                                    <div className="toast-icon">
                                        <Icon name={detectedPerson.ya_registrado ? "alert-triangle" : "check"} size={20} />
                                    </div>
                                    <div className="toast-content">
                                        <span className="toast-title">{detectedPerson.mensaje}</span>
                                        <span className="toast-name">{detectedPerson.usuario}</span>
                                    </div>
                                </div>
                            )}

                            {(validationStep === 'no_match' || validationStep === 'error') && (
                                <div className="result-toast error">
                                    <div className="toast-icon">
                                        <Icon name={validationStep === 'no_match' ? "user-x" : "alert-circle"} size={20} />
                                    </div>
                                    <div className="toast-content">
                                        <span className="toast-title">{validationStep === 'no_match' ? 'No reconocido' : 'Error'}</span>
                                        <span className="toast-name">{errorMessage || 'Intente nuevamente'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Guías visuales de esquina */}
                            <div className="corner-guide top-left"></div>
                            <div className="corner-guide top-right"></div>
                            <div className="corner-guide bottom-left"></div>
                            <div className="corner-guide bottom-right"></div>
                        </div>
                    </div>

                    {/* Footer de controles */}
                    <div className="camera-controls">
                        <div className="control-group">
                            <label className="switch-label">
                                <Icon name={requireSmile ? "smile" : "zap"} size={16} />
                                <span className="label-text">{requireSmile ? "Sonrisa requerida" : "Modo Rápido"}</span>
                            </label>
                        </div>
                        <button
                            className={`action-button ${isCameraActive ? 'stop' : 'start'}`}
                            onClick={toggleCamera}
                            disabled={!modelsLoaded}
                        >
                            <Icon name={isCameraActive ? "square" : "play-circle"} size={18} />
                            {isCameraActive ? 'Detener' : 'Iniciar Escaneo'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Columna Derecha: Reloj y Historial */}
            <div className="side-column">
                <div className="clock-card">
                    <div className="clock-header">HORA DEL SISTEMA</div>
                    <div className="time-display">{formatTime(currentTime)}</div>
                    <div className="date-display">{formatDate(currentTime)}</div>
                    <div className="clock-icon-wrapper">
                        <Icon name="clock" size={32} />
                    </div>
                </div>

                {showRecentAttendances && (
                    <RecentAttendances updateTrigger={updateTrigger} />
                )}
            </div>
        </div>
    );
};

export default FaceAttendance;
