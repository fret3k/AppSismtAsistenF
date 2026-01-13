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
    personal_id?: string;
    turno?: string;
    tipo_registro?: string;
    estado?: string;
    hora?: string;
    ya_registrado?: boolean;
    preview?: boolean;
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
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [previewData, setPreviewData] = useState<AsistenciaResponse | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

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

            // Invertir coordenadas X para corregir el efecto espejo (ya que quitamos el scaleX del canvas)
            const box = resizedDetections.detection.box;
            const flippedBox = new faceapi.Box(
                { x: displaySize.width - box.x - box.width, y: box.y, width: box.width, height: box.height }
            );

            // Dibujar solo el recuadro azul (sin texto/score para evitar números invertidos y mantener limpieza)
            const drawBox = new faceapi.draw.DrawBox(flippedBox, { label: ' ' });
            drawBox.draw(canvas);

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
                imagen_base64: imagenBase64,
                solo_validar: true // Siempre pedir validación primero para mostrar el modal
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
                if (result.data.preview) {
                    setPreviewData(result.data);
                    setShowConfirmModal(true);
                    setValidationStep('waiting');
                    setStatusMessage("Esperando confirmación");
                    return;
                }

                setDetectedPerson(result.data);
                setValidationStep('success');
                setStatusMessage("¡Registrado!");
                setUpdateTrigger(prev => prev + 1); // Actualizar historial

                setTimeout(() => {
                    setValidationStep('detecting');
                    setStatusMessage("Buscando rostro...");
                    setHappyScore(0);
                    setDetectedPerson(null);
                }, 8000);
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
                validationStep !== 'error' && validationStep !== 'no_match' && !showConfirmModal) {
                setValidationStep('detecting');
                setStatusMessage("Buscando rostro...");
                setHappyScore(0);
            }
        }
    }, [detectFace, validationStep, processAttendance, requireSmile, smileThreshold, showConfirmModal]);

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

                            {/* Status messages removed as requested */}

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

                            {/* Success toast removed as requested */}

                            {/* Error toast removed as requested */}

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

            {/* Modal de Confirmación Premium */}
            {showConfirmModal && previewData && (
                <div className="confirmation-modal-overlay">
                    <div className="confirmation-modal">
                        <div className="modal-header">
                            <div className="modal-icon">
                                <Icon name="user-check" size={32} />
                            </div>
                            <h3>Confirmar Asistencia</h3>
                            <button className="close-btn" onClick={() => {
                                setShowConfirmModal(false);
                                setValidationStep('detecting');
                            }}>
                                <Icon name="x" size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="user-info-large">
                                <span className="user-label">USUARIO IDENTIFICADO</span>
                                <h2 className="user-name-highlight">{previewData.usuario}</h2>
                            </div>

                            <div className="attendance-details-grid">
                                <div className="detail-item">
                                    <Icon name="clock" size={18} />
                                    <div className="detail-content">
                                        <span className="detail-label">Hora actual</span>
                                        <span className="detail-value">{previewData.hora}</span>
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <Icon name="briefcase" size={18} />
                                    <div className="detail-content">
                                        <span className="detail-label">Turno</span>
                                        <span className="detail-value">{previewData.turno}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="modal-btn cancel"
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setValidationStep('detecting');
                                }}
                                disabled={isProcessing}
                            >
                                <Icon name="user-x" size={18} />
                                Cancelar
                            </button>
                            <button
                                className="modal-btn confirm"
                                onClick={async () => {
                                    if (!previewData.personal_id) return;
                                    setIsProcessing(true);
                                    try {
                                        const response = await fetch(`${API_BASE_URL}/asistencia/registrar`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                personal_id: previewData.personal_id,
                                                reconocimiento_valido: true,
                                                tipo_registro: previewData.tipo_registro,
                                                marca_tiempo: new Date().toISOString()
                                            }),
                                        });

                                        const result = await response.json();
                                        if (response.ok) {
                                            setDetectedPerson(result);
                                            setValidationStep('success');
                                            setStatusMessage("¡Registrado!");
                                            setUpdateTrigger(prev => prev + 1);
                                            setShowConfirmModal(false);

                                            setTimeout(() => {
                                                setValidationStep('detecting');
                                                setStatusMessage("Buscando rostro...");
                                                setDetectedPerson(null);
                                            }, 8000);
                                        } else {
                                            setErrorMessage(result.detail || "Error al registrar");
                                            setValidationStep('error');
                                            setShowConfirmModal(false);
                                            setTimeout(() => setValidationStep('detecting'), 3000);
                                        }
                                    } catch (err) {
                                        setErrorMessage("Error de conexión");
                                        setValidationStep('error');
                                        setShowConfirmModal(false);
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <span className="mini-spinner"></span>
                                ) : (
                                    <>
                                        <Icon name="check" size={18} />
                                        Registrar Asistencia
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
