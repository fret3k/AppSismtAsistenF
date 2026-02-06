import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import Icon from '../components/Icon';
import './ControlEntradaSalidaPage.css';

interface RegistroTiempo {
    tipo: 'ENTRADA' | 'SALIDA';
    hora: string;
    fecha: string;
    estado: 'success' | 'error';
    mensaje?: string;
    usuario?: string;
}

interface UsuarioIdentificado {
    personal_id: number;
    nombre: string;
    apellido_paterno: string;
    apellido_materno?: string;
    dni?: string;
    usuario?: string;
}

interface ControlEntradaSalidaPageProps {
    mode?: 'asistencia' | 'permiso';
}

const ControlEntradaSalidaPage: React.FC<ControlEntradaSalidaPageProps> = ({ mode = 'permiso' }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectionIntervalRef = useRef<number | null>(null);
    const autoDetectionRef = useRef<number | null>(null);

    // Estados de cámara
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isIdentifying, setIsIdentifying] = useState(false);

    // Estados de UI
    const [statusMessage, setStatusMessage] = useState("Cargando modelos...");
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successData, setSuccessData] = useState<{ tipo: string; hora: string; usuario: string } | null>(null);

    // Configuración
    const [faceDetectionThreshold] = useState(0.75);
    const [faceDetectionMargin] = useState(0.06);

    // Estado del usuario identificado (modo kiosco)
    const [identifiedUser, setIdentifiedUser] = useState<UsuarioIdentificado | null>(null);
    const [approvedPermissions, setApprovedPermissions] = useState<any[]>([]);
    const [selectedPermisoId, setSelectedPermisoId] = useState("");
    const [historialReciente, setHistorialReciente] = useState<RegistroTiempo[]>([]);

    const API_BASE_URL = 'http://localhost:8000';

    // Textos dinámicos según modo
    const isPermiso = mode === 'permiso';
    const title = isPermiso ? "Control de Permisos - Kiosco" : "Control de Asistencia";
    const btnEntradaText = isPermiso ? "Retorno de Permiso" : "Marcar Entrada";
    const btnSalidaText = isPermiso ? "Salida por Permiso" : "Marcar Salida";

    // Helper para parsear metadata de solicitud
    const getSolicitudMeta = (s: any) => {
        try {
            const parsed = JSON.parse(s.razon || '{}');
            if (typeof parsed !== 'object' || parsed === null) throw new Error();
            return {
                numero_boleta: (s.numero_boleta || parsed.numero_boleta || '').toString(),
                motivo: (parsed.motivo || s.razon || '') as string
            };
        } catch {
            return {
                numero_boleta: s.numero_boleta || '',
                motivo: s.razon || ''
            };
        }
    };

    // Cargar permisos aprobados para el usuario identificado
    const loadApprovedPermissionsForUser = useCallback(async (userId: number) => {
        if (!isPermiso) return;
        try {
            const response = await fetch(`${API_BASE_URL}/solicitudes-ausencias/personal/${userId}`);
            if (response.ok) {
                const data = await response.json();
                const d = new Date();
                const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                // Filtrar: APROBADA y fecha coincide con hoy
                const validos = data.filter((p: any) =>
                    p.estado_solicitud === 'APROBADA' &&
                    p.fecha_inicio === today
                );
                setApprovedPermissions(validos);

                // Auto-seleccionar si solo hay uno
                if (validos.length === 1) {
                    setSelectedPermisoId(validos[0].id.toString());
                }
            }
        } catch (error) {
            console.error("Error loading permissions for user", error);
        }
    }, [isPermiso]);

    // Resetear el estado para el siguiente usuario
    const resetForNextUser = useCallback(() => {
        setIdentifiedUser(null);
        setApprovedPermissions([]);
        setSelectedPermisoId("");
        setStatusMessage("Posicione su rostro frente a la cámara");
    }, []);

    // Cerrar modal y resetear para siguiente usuario
    const handleCloseSuccessModal = useCallback(() => {
        setShowSuccessModal(false);
        setSuccessData(null);
        // Resetear para el siguiente usuario después de un breve delay
        setTimeout(() => {
            resetForNextUser();
        }, 500);
    }, [resetForNextUser]);

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
            setStatusMessage("Encienda la cámara para comenzar");
        } catch (error) {
            console.error("Error al cargar modelos:", error);
            setStatusMessage("Error al cargar modelos de reconocimiento");
        }
    }, []);

    useEffect(() => {
        loadModels();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (autoDetectionRef.current) {
                clearInterval(autoDetectionRef.current);
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
        if (autoDetectionRef.current) {
            clearInterval(autoDetectionRef.current);
            autoDetectionRef.current = null;
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
        resetForNextUser();
    }, [resetForNextUser]);

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

    // Detectar rostro y dibujar caja
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

    // Identificar usuario por reconocimiento facial
    const identifyUser = useCallback(async () => {
        if (!isCameraActive || !modelsLoaded || isIdentifying || isProcessing || identifiedUser) return;

        setIsIdentifying(true);
        setStatusMessage("Buscando rostro...");

        try {
            const result = await detectFace();

            if (!result.faceDetected || !result.descriptor) {
                setStatusMessage("Posicione su rostro frente a la cámara");
                setIsIdentifying(false);
                return;
            }

            setStatusMessage("Identificando...");
            const imagenBase64 = captureImageBase64();
            const embeddingArray = Array.from(result.descriptor);

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
                setStatusMessage("No se pudo verificar. Intente de nuevo.");
                setIsIdentifying(false);
                return;
            }

            const verifyData = await verifyResponse.json();

            if (!verifyData.reconocido) {
                setStatusMessage("Rostro no reconocido. Asegúrese de estar registrado.");
                setIsIdentifying(false);
                return;
            }

            // Usuario identificado exitosamente
            const usuario: UsuarioIdentificado = {
                personal_id: verifyData.personal_id,
                nombre: verifyData.nombre || verifyData.usuario?.split(' ')[0] || 'Usuario',
                apellido_paterno: verifyData.apellido_paterno || verifyData.usuario?.split(' ')[1] || '',
                apellido_materno: verifyData.apellido_materno,
                dni: verifyData.dni,
                usuario: verifyData.usuario
            };

            setIdentifiedUser(usuario);
            setStatusMessage(`¡Bienvenido, ${usuario.nombre}!`);

            // Cargar permisos aprobados para este usuario
            await loadApprovedPermissionsForUser(usuario.personal_id);

        } catch (error) {
            console.error('Error identifying user:', error);
            setStatusMessage("Error de conexión. Intente de nuevo.");
        } finally {
            setIsIdentifying(false);
        }
    }, [isCameraActive, modelsLoaded, isIdentifying, isProcessing, identifiedUser, detectFace, captureImageBase64, faceDetectionThreshold, faceDetectionMargin, loadApprovedPermissionsForUser]);

    // Detección automática continua
    useEffect(() => {
        if (isCameraActive && modelsLoaded && !identifiedUser && !showSuccessModal) {
            // Iniciar detección automática cada 2 segundos
            autoDetectionRef.current = window.setInterval(() => {
                identifyUser();
            }, 2000);
        } else {
            if (autoDetectionRef.current) {
                clearInterval(autoDetectionRef.current);
                autoDetectionRef.current = null;
            }
        }

        return () => {
            if (autoDetectionRef.current) {
                clearInterval(autoDetectionRef.current);
            }
        };
    }, [isCameraActive, modelsLoaded, identifiedUser, showSuccessModal, identifyUser]);

    // Registrar tiempo (entrada/salida)
    const registrarTiempo = async (tipo: 'ENTRADA' | 'SALIDA') => {
        if (!isCameraActive || !modelsLoaded || isProcessing || !identifiedUser) return;

        setIsProcessing(true);
        const actionText = tipo === 'ENTRADA' ? btnEntradaText : btnSalidaText;
        setStatusMessage(`Registrando ${actionText.toLowerCase()}...`);

        try {
            // Registrar el tiempo
            const registroResponse = await fetch(`${API_BASE_URL}/control-tiempo/registrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    personal_id: identifiedUser.personal_id,
                    tipo_registro: tipo,
                    categoria: mode,
                    solicitud_id: isPermiso && tipo === 'SALIDA' ? selectedPermisoId : undefined
                }),
            });

            if (registroResponse.ok) {
                const registroData = await registroResponse.json();

                const nuevoRegistro: RegistroTiempo = {
                    tipo: tipo,
                    hora: registroData.hora || new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
                    fecha: new Date().toLocaleDateString('es-PE'),
                    estado: 'success',
                    usuario: identifiedUser.usuario || `${identifiedUser.nombre} ${identifiedUser.apellido_paterno}`
                };

                setHistorialReciente(prev => [nuevoRegistro, ...prev.slice(0, 4)]);

                // Mostrar modal de éxito
                setSuccessData({
                    tipo: actionText,
                    hora: nuevoRegistro.hora,
                    usuario: identifiedUser.usuario || `${identifiedUser.nombre} ${identifiedUser.apellido_paterno}`
                });
                setShowSuccessModal(true);
                setStatusMessage(`¡${actionText} completado!`);

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
                            {(isProcessing || isIdentifying) ? (
                                <div className="processing">
                                    <span className="spinner"></span>
                                    <span>{statusMessage}</span>
                                </div>
                            ) : (
                                <span>{statusMessage}</span>
                            )}
                        </div>

                        {/* Mostrar información del usuario identificado */}
                        {identifiedUser && (
                            <div className="identified-user-card" style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Icon name="user-check" size={32} color="white" />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                                            {identifiedUser.nombre} {identifiedUser.apellido_paterno}
                                        </div>
                                        {identifiedUser.dni && (
                                            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                                                DNI: {identifiedUser.dni}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={resetForNextUser}
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        border: 'none',
                                        color: 'white',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Cambiar Usuario
                                </button>
                            </div>
                        )}

                        <div className="action-buttons">
                            {isPermiso && identifiedUser ? (
                                <>
                                    <div className="permission-selector" style={{ marginBottom: '1rem', width: '100%' }}>
                                        <select
                                            value={selectedPermisoId}
                                            onChange={(e) => setSelectedPermisoId(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid #d1d5db',
                                                backgroundColor: selectedPermisoId ? 'white' : '#f9fafb'
                                            }}
                                            disabled={isProcessing}
                                        >
                                            <option value="">-- Seleccione Permiso Aprobado --</option>
                                            {approvedPermissions.length > 0 ? (
                                                approvedPermissions.map(p => {
                                                    let label = p.razon;
                                                    try {
                                                        const parsed = JSON.parse(p.razon);
                                                        label = parsed.motivo || label;
                                                    } catch { }
                                                    return (
                                                        <option key={p.id} value={p.id}>
                                                            {label} (Boleta: {getSolicitudMeta(p).numero_boleta || 'S/N'})
                                                        </option>
                                                    );
                                                })
                                            ) : (
                                                <option disabled>No tiene permisos aprobados para hoy</option>
                                            )}
                                        </select>
                                        {approvedPermissions.length === 0 && (
                                            <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '4px' }}>
                                                * Solicite un permiso a su administrador primero.
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="btn-salida"
                                        onClick={() => registrarTiempo('SALIDA')}
                                        disabled={isProcessing || !selectedPermisoId}
                                        style={{ opacity: !selectedPermisoId ? 0.6 : 1 }}
                                    >
                                        <Icon name="log-out" size={24} />
                                        <span>{btnSalidaText}</span>
                                    </button>
                                    <button
                                        className="btn-entrada"
                                        onClick={() => registrarTiempo('ENTRADA')}
                                        disabled={isProcessing}
                                    >
                                        <Icon name="log-in" size={24} />
                                        <span>{btnEntradaText}</span>
                                    </button>
                                </>
                            ) : isPermiso && !identifiedUser ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: '#6b7280',
                                    background: '#f9fafb',
                                    borderRadius: '0.75rem',
                                    width: '100%'
                                }}>
                                    <Icon name="user" size={48} color="#9ca3af" />
                                    <p style={{ marginTop: '1rem', fontSize: '1rem' }}>
                                        {isCameraActive ? 'Detectando rostro automáticamente...' : 'Encienda la cámara para comenzar'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <button
                                        className="btn-entrada"
                                        onClick={() => registrarTiempo('ENTRADA')}
                                        disabled={!isCameraActive || isProcessing || !identifiedUser}
                                    >
                                        <Icon name="log-in" size={24} />
                                        <span>{btnEntradaText}</span>
                                    </button>
                                    <button
                                        className="btn-salida"
                                        onClick={() => registrarTiempo('SALIDA')}
                                        disabled={!isCameraActive || isProcessing || !identifiedUser}
                                    >
                                        <Icon name="log-out" size={24} />
                                        <span>{btnSalidaText}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel de Historial Reciente */}
                <div className="summary-panel">
                    <div className="history-card">
                        <h3>Registros Recientes</h3>
                        <div className="history-list">
                            {historialReciente.length === 0 ? (
                                <p className="no-records">Sin registros recientes</p>
                            ) : (
                                historialReciente.map((reg, idx) => (
                                    <div key={idx} className="history-item" style={{
                                        background: idx === 0 ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : undefined,
                                        borderLeft: idx === 0 ? '3px solid #10b981' : undefined
                                    }}>
                                        <div className="history-icon">
                                            <Icon name={reg.tipo === 'ENTRADA' ? 'log-in' : 'log-out'} size={16} />
                                        </div>
                                        <div className="history-details" style={{ flex: 1 }}>
                                            <span className="history-type">{reg.tipo}</span>
                                            <span className="history-time">{reg.hora}</span>
                                        </div>
                                        {reg.usuario && (
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                {reg.usuario}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Instrucciones de uso */}
                    <div className="summary-card" style={{ marginTop: '1rem' }}>
                        <h3>Instrucciones</h3>
                        <div style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.6 }}>
                            <p><strong>1.</strong> Encienda la cámara</p>
                            <p><strong>2.</strong> Posicione su rostro frente a la cámara</p>
                            <p><strong>3.</strong> Espere a ser identificado</p>
                            <p><strong>4.</strong> Seleccione su permiso aprobado</p>
                            <p><strong>5.</strong> Presione el botón correspondiente</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Éxito con auto-cierre */}
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
                        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '1rem' }}>
                            El sistema se reiniciará para el siguiente usuario
                        </p>
                        <button className="btn-close-modal" onClick={handleCloseSuccessModal}>
                            Aceptar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ControlEntradaSalidaPage;
