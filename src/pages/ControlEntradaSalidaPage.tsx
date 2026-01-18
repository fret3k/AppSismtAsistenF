import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as faceapi from 'face-api.js';
import Icon from '../components/Icon';
import './ControlEntradaSalidaPage.css';

interface RegistroTiempo {
    tipo: 'ENTRADA' | 'SALIDA';
    hora: string;
    fecha: string;
    estado: 'success' | 'error';
    mensaje?: string;
}

interface ResumenJornada {
    horaEntrada: string | null;
    horaSalida: string | null;
    horasTrabajadas: string;
    minutosTrabajados: number;
}

interface ControlEntradaSalidaPageProps {
    mode?: 'asistencia' | 'permiso';
}

const ControlEntradaSalidaPage: React.FC<ControlEntradaSalidaPageProps> = ({ mode = 'permiso' }) => {
    const { user } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectionIntervalRef = useRef<number | null>(null);

    // Estados de cámara
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Estados de UI
    const [statusMessage, setStatusMessage] = useState("Cargando modelos...");
    const [resumenHoy, setResumenHoy] = useState<ResumenJornada>({
        horaEntrada: null,
        horaSalida: null,
        horasTrabajadas: '0h 0m',
        minutosTrabajados: 0
    });
    const [historialHoy, setHistorialHoy] = useState<RegistroTiempo[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successData, setSuccessData] = useState<{ tipo: string; hora: string; usuario: string } | null>(null);

    // Configuración
    const [faceDetectionThreshold] = useState(0.75);
    const [faceDetectionMargin] = useState(0.06);

    const API_BASE_URL = 'http://localhost:8000';

    // Textos dinámicos según modo
    const isPermiso = mode === 'permiso';
    const title = isPermiso ? "Control de Permisos" : "Control de Asistencia";
    const btnEntradaText = isPermiso ? "Retorno de Permiso" : "Marcar Entrada";
    const btnSalidaText = isPermiso ? "Salida por Permiso" : "Marcar Salida";

    // Cargar historial del día
    const loadTodayHistory = useCallback(async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`${API_BASE_URL}/control-tiempo/personal/${user?.id}?fecha=${today}`);
            if (response.ok) {
                const data = await response.json();
                if (data.registros) {
                    setHistorialHoy(data.registros);
                    if (data.resumen) {
                        setResumenHoy({
                            horaEntrada: data.resumen.hora_entrada,
                            horaSalida: data.resumen.hora_salida,
                            horasTrabajadas: data.resumen.horas_trabajadas || '0h 0m',
                            minutosTrabajados: data.resumen.minutos_trabajados || 0
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error loading today history:', error);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user?.id) {
            loadTodayHistory();
        }
    }, [user, loadTodayHistory]);

    // Actualizar reloj
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Cargar modelos
    const loadModels = useCallback(async () => {
        const MODEL_URL = '/models';
        try {
            setStatusMessage("Inicializando reconocimiento facial...");
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
            setStatusMessage("Listo para registrar");
        } catch (error) {
            console.error("Error al cargar modelos:", error);
            setStatusMessage("Error al cargar modelos de reconocimiento");
        }
    }, []);

    useEffect(() => {
        loadModels();
        // Limpieza al desmontar
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [loadModels]);

    // Control de video
    const startVideo = useCallback(async () => {
        try {
            setStatusMessage("Accediendo a cámara...");
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 480, height: 360, facingMode: 'user' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setIsCameraActive(true);
                setStatusMessage("Posicione su rostro frente a la cámara");
            }
        } catch (err) {
            console.error("Error al acceder a la cámara:", err);
            setStatusMessage("Sin acceso a cámara");
            setIsCameraActive(false);
        }
    }, []);

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
            setStatusMessage("Cámara apagada");
        }
    }, []);

    const toggleCamera = useCallback(() => {
        if (isCameraActive) {
            stopVideo();
        } else {
            startVideo();
        }
    }, [isCameraActive, startVideo, stopVideo]);

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

    // Detectar rostro
    const detectFace = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !modelsLoaded) {
            return { faceDetected: false, descriptor: null };
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);

        const detections = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (detections) {
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            const box = resizedDetections.detection.box;
            const flippedBox = new faceapi.Box(
                { x: displaySize.width - box.x - box.width, y: box.y, width: box.width, height: box.height }
            );
            const drawBox = new faceapi.draw.DrawBox(flippedBox, { label: ' ' });
            drawBox.draw(canvas);

            return { faceDetected: true, descriptor: detections.descriptor };
        }

        return { faceDetected: false, descriptor: null };
    }, [modelsLoaded]);

    const registrarTiempo = async (tipo: 'ENTRADA' | 'SALIDA') => {
        if (!isCameraActive || !modelsLoaded || isProcessing) return;

        setIsProcessing(true);
        const actionText = tipo === 'ENTRADA' ? btnEntradaText : btnSalidaText;
        setStatusMessage(`Verificando identidad para ${actionText.toLowerCase()}...`);

        try {
            const result = await detectFace();

            if (!result.faceDetected || !result.descriptor) {
                setStatusMessage("No se detectó un rostro. Intente de nuevo.");
                setIsProcessing(false);
                return;
            }

            const imagenBase64 = captureImageBase64();
            const embeddingArray = Array.from(result.descriptor);

            // Verificar identidad
            const verifyResponse = await fetch(`${API_BASE_URL}/asistencia/realtime`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embedding: embeddingArray,
                    imagen_base64: imagenBase64,
                    solo_validar: true,
                    threshold: faceDetectionThreshold,
                    min_margin: faceDetectionMargin
                }),
            });

            if (!verifyResponse.ok) {
                const errorData = await verifyResponse.json();
                setStatusMessage(errorData.detail || "No se pudo verificar la identidad");
                setIsProcessing(false);
                return;
            }

            const verifyData = await verifyResponse.json();

            if (!verifyData.reconocido) {
                setStatusMessage("Rostro no reconocido. Asegúrese de estar registrado.");
                setIsProcessing(false);
                return;
            }

            // Registrar el tiempo
            const registroResponse = await fetch(`${API_BASE_URL}/control-tiempo/registrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    personal_id: verifyData.personal_id || user?.id,
                    tipo_registro: tipo,
                    categoria: mode
                }),
            });

            if (registroResponse.ok) {
                const registroData = await registroResponse.json();

                const nuevoRegistro: RegistroTiempo = {
                    tipo: tipo,
                    hora: registroData.hora || new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
                    fecha: new Date().toLocaleDateString('es-PE'),
                    estado: 'success'
                };

                setHistorialHoy(prev => [nuevoRegistro, ...prev]);

                // Actualizar resumen localmente
                if (tipo === 'ENTRADA') {
                    setResumenHoy(prev => ({ ...prev, horaEntrada: nuevoRegistro.hora }));
                } else {
                    setResumenHoy(prev => ({ ...prev, horaSalida: nuevoRegistro.hora }));
                }

                // Mostrar modal de éxito
                setSuccessData({
                    tipo: actionText,
                    hora: nuevoRegistro.hora,
                    usuario: verifyData.usuario || `${user?.nombre} ${user?.apellido_paterno}`
                });
                setShowSuccessModal(true);
                setStatusMessage(`¡${actionText} completado correctamente!`);

                setTimeout(() => {
                    loadTodayHistory();
                }, 1000);

            } else {
                const errorData = await registroResponse.json();
                setStatusMessage(errorData.detail || `Error al registrar ${actionText}`);
            }
        } catch (error) {
            console.error('Error:', error);
            setStatusMessage("Error de conexión");
        } finally {
            setIsProcessing(false);
        }
    };

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
        return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
    };

    // función captureImageBase64 eliminada por duplicidad

    return (
        <div className="control-entrada-salida-page">
            <div className="time-header">
                <div className="current-time">
                    <Icon name="clock" size={20} />
                    <span className="time-value">{formatTime(currentTime)}</span>
                </div>
                <div className="current-date">{formatDate(currentTime)}</div>
            </div>

            <div className="main-content">
                {/* Panel de Cámara */}
                <div className="camera-panel">
                    <div className="camera-card">
                        <div className="camera-header">
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1f2937' }}>{title}</h2>
                            <div className={`status-indicator ${isCameraActive ? 'active' : ''}`}>
                                <span className="status-dot"></span>
                                {isCameraActive ? 'Cámara Activa' : 'Cámara Inactiva'}
                            </div>
                            <button
                                className={`camera-toggle-btn ${isCameraActive ? 'active' : ''}`}
                                onClick={toggleCamera}
                                disabled={!modelsLoaded}
                            >
                                <Icon name={isCameraActive ? "camera-off" : "camera"} size={18} />
                                {isCameraActive ? 'Apagar' : 'Encender'}
                            </button>
                        </div>

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

                                {!isCameraActive && (
                                    <div className="camera-placeholder">
                                        <Icon name={isPermiso ? "file-text" : "clock"} size={48} />
                                        <p>Encienda la cámara para {isPermiso ? 'registrar permiso' : 'marcar asistencia'}</p>
                                    </div>
                                )}

                                <div className="corner-guide top-left"></div>
                                <div className="corner-guide top-right"></div>
                                <div className="corner-guide bottom-left"></div>
                                <div className="corner-guide bottom-right"></div>
                            </div>
                        </div>

                        <div className="status-message">
                            {isProcessing ? (
                                <div className="processing">
                                    <span className="spinner"></span>
                                    <span>{statusMessage}</span>
                                </div>
                            ) : (
                                <span>{statusMessage}</span>
                            )}
                        </div>

                        <div className="action-buttons">
                            {isPermiso ? (
                                <>
                                    <button
                                        className="btn-salida"
                                        onClick={() => registrarTiempo('SALIDA')}
                                        disabled={!isCameraActive || isProcessing}
                                    >
                                        <Icon name="log-out" size={24} />
                                        <span>{btnSalidaText}</span>
                                    </button>
                                    <button
                                        className="btn-entrada"
                                        onClick={() => registrarTiempo('ENTRADA')}
                                        disabled={!isCameraActive || isProcessing}
                                    >
                                        <Icon name="log-in" size={24} />
                                        <span>{btnEntradaText}</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        className="btn-entrada"
                                        onClick={() => registrarTiempo('ENTRADA')}
                                        disabled={!isCameraActive || isProcessing}
                                    >
                                        <Icon name="log-in" size={24} />
                                        <span>{btnEntradaText}</span>
                                    </button>
                                    <button
                                        className="btn-salida"
                                        onClick={() => registrarTiempo('SALIDA')}
                                        disabled={!isCameraActive || isProcessing}
                                    >
                                        <Icon name="log-out" size={24} />
                                        <span>{btnSalidaText}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel de Resumen */}
                <div className="summary-panel">
                    <div className="summary-card">
                        <h3>Resumen del Día</h3>
                        <div className="summary-stats">
                            <div className="stat-box">
                                <span className="label">Entrada</span>
                                <span className="value">{resumenHoy.horaEntrada || '--:--'}</span>
                            </div>
                            <div className="stat-box">
                                <span className="label">Salida</span>
                                <span className="value">{resumenHoy.horaSalida || '--:--'}</span>
                            </div>
                            <div className="stat-box highlight">
                                <span className="label">Horas Trab.</span>
                                <span className="value">{resumenHoy.horasTrabajadas}</span>
                            </div>
                        </div>
                    </div>

                    <div className="history-card">
                        <h3>Registros de Hoy</h3>
                        <div className="history-list">
                            {historialHoy.length === 0 ? (
                                <p className="no-records">Sin registros hoy</p>
                            ) : (
                                historialHoy.map((reg, idx) => (
                                    <div key={idx} className="history-item">
                                        <div className="history-icon">
                                            <Icon name={reg.tipo === 'ENTRADA' ? 'log-in' : 'log-out'} size={16} />
                                        </div>
                                        <div className="history-details">
                                            <span className="history-type">{reg.tipo}</span>
                                            <span className="history-time">{reg.hora}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Éxito */}
            {showSuccessModal && successData && (
                <div className="modal-overlay">
                    <div className="success-modal">
                        <div className="success-icon">
                            <Icon name="check-circle" size={64} color="#10b981" />
                        </div>
                        <h2>{successData.tipo} Exitosa</h2>
                        <div className="success-details">
                            <p className="user-name">{successData.usuario}</p>
                            <p className="success-time">{successData.hora}</p>
                            <p className="success-date">{formatDate(new Date())}</p>
                        </div>
                        <button className="btn-close-modal" onClick={() => setShowSuccessModal(false)}>
                            Aceptar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ControlEntradaSalidaPage;
