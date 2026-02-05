import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import Navbar from '../components/Navbar';
import Icon from '../components/Icon';
import './MarcarPermisoPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface Permiso {
    id: string;
    numero_boleta: string;
    fecha_inicio: string;
    fecha_fin: string;
    razon: string;
    estado_solicitud: string;
}

interface RegistroTiempo {
    tipo: string;
    hora: string;
    fecha: string;
}

const MarcarPermisoPage: React.FC = () => {
    // Esta página usa reconocimiento facial 1:N para identificación, no requiere usuario logueado
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectionIntervalRef = useRef<number | null>(null);

    // Estados de cámara y reconocimiento
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Cargando modelos...");

    // Estados de datos
    const [permisosAprobados, setPermisosAprobados] = useState<Permiso[]>([]);
    const [registrosHoy, setRegistrosHoy] = useState<RegistroTiempo[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Usuario detectado (datos simulados o reales desde backend si hubiera reconocimiento 1:N real aquí)
    // En este caso, asumimos que si está logueado usa sus datos. 
    // Si la idea es que CUALQUIERA pueda marcar, necesitaríamos reconocimiento 1:N contra la base de datos de encodings.
    // Como el usuario pidió "cualquier usuario tendrá acceso", asumiremos que el reconocimiento DEBE identificar a la persona.
    // Por simplicidad y robustez, usaremos la lógica de FaceAttendance: detectar cara, si hay match (simulado validación), mostrar datos.
    // PERO: Si el usuario ya está logueado en el navegador, es más seguro usar su sesión.
    // Si es un kiosco compartido, el usuario no estaría logueado. 
    // El requerimiento dice: "esta pagina cualquier usuario tendrá acceso, se detecta la cara y ... aparece los datos".
    // Esto implica Reconocimiento Facial 1:N (Identificación).
    const [detectedUser, setDetectedUser] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successData, setSuccessData] = useState<{ tipo: string; hora: string; usuario: string } | null>(null);

    // Cargar modelos de face-api (TinyFace para rapidez)
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                setStatusMessage("Modelos listos. Iniciando cámara...");
                // Auto iniciar cámara tras cargar modelos
                setTimeout(startCamera, 500);
            } catch (error) {
                console.error('Error loading models:', error);
                setStatusMessage("Error al cargar modelos.");
            }
        };
        loadModels();
    }, []);

    // Actualizar reloj
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Funciones de carga de datos (Permisos y Registros)
    // Se llaman cuando se identifica un usuario
    const loadUserData = async (userId: string) => {
        try {
            const d = new Date();
            const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            // 1. Cargar Permisos Aprobados de HOY
            const responsePermisos = await fetch(`${API_BASE_URL}/solicitudes-ausencias/personal/${userId}`);
            if (responsePermisos.ok) {
                const data = await responsePermisos.json();
                const validos = data.filter((p: any) =>
                    p.estado_solicitud === 'APROBADA' &&
                    p.fecha_inicio === today
                );
                setPermisosAprobados(validos);
            }

            // 2. Cargar Registros de HOY
            const responseReg = await fetch(`${API_BASE_URL}/control-tiempo/personal/${userId}?fecha=${today}`);
            if (responseReg.ok) {
                const data = await responseReg.json();
                setRegistrosHoy(data.registros || []);
            }
        } catch (error) {
            console.error("Error cargando datos del usuario", error);
        }
    };

    // Control de cámara
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setIsCameraActive(true);
                setStatusMessage("Buscando rostro...");
                // NO llamar startDetection() aquí - el useEffect se encargará
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            setStatusMessage("Sin acceso a cámara.");
        }
    };

    const stopCamera = () => {
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
        setDetectedUser(null);
        setPermisosAprobados([]);
        setRegistrosHoy([]);
        setStatusMessage("Cámara apagada.");

        // Limpiar canvas
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    // Capturar imagen para enviar al backend (1:N matching)
    const captureImage = useCallback((): string | null => {
        if (!videoRef.current) return null;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        }
        return null;
    }, []);

    // Identificar usuario contra el backend (usando useCallback para evitar recreación)
    const identifyUser = useCallback(async (descriptor: Float32Array, currentDetectedUser: any) => {
        try {
            const imageBase64 = captureImage();
            if (!imageBase64) return;

            const descriptorArray = Array.from(descriptor);

            const response = await fetch(`${API_BASE_URL}/asistencia/realtime`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embedding: descriptorArray,
                    imagen_base64: imageBase64,
                    solo_validar: true,
                    threshold: 0.5
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.reconocido && data.personal_id) {
                    // EVITAR RE-SETS SI ES EL MISMO
                    if (currentDetectedUser?.id !== data.personal_id) {
                        setDetectedUser({
                            id: data.personal_id,
                            nombre: data.usuario || 'Usuario Identificado',
                            dni: '---'
                        });
                        setStatusMessage(`Hola, ${data.usuario}`);
                        loadUserData(data.personal_id);
                    }
                }
            }
        } catch (err) {
            console.error("Error identificando", err);
        }
    }, [captureImage, loadUserData]);

    // Detección facial continua - función principal
    const runDetection = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !modelsLoaded || isProcessing) return;

        const video = videoRef.current;
        if (video.readyState !== 4) return;

        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        const canvas = canvasRef.current;

        if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
            faceapi.matchDimensions(canvas, displaySize);
        }

        try {
            const detection = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (detection) {
                    const resizedDetections = faceapi.resizeResults(detection, displaySize);

                    // Dibujar recuadro con efecto espejo corregido
                    ctx.save();
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);

                    const box = resizedDetections.detection.box;
                    ctx.strokeStyle = '#10b981';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);

                    // Brillo en las esquinas
                    ctx.fillStyle = '#10b981';
                    ctx.fillRect(box.x - 2, box.y - 2, 15, 4);
                    ctx.fillRect(box.x - 2, box.y - 2, 4, 15);
                    ctx.fillRect(box.x + box.width - 13, box.y - 2, 15, 4);
                    ctx.fillRect(box.x + box.width + 2 - 4, box.y - 2, 4, 15);
                    ctx.fillRect(box.x - 2, box.y + box.height - 2, 15, 4);
                    ctx.fillRect(box.x - 2, box.y + box.height - 13, 4, 15);
                    ctx.fillRect(box.x + box.width - 13, box.y + box.height - 2, 15, 4);
                    ctx.fillRect(box.x + box.width + 2 - 4, box.y + box.height - 13, 4, 15);

                    ctx.restore();

                    // Intentar identificar si aún no hay usuario detectado
                    if (!detectedUser) {
                        await identifyUser(detection.descriptor, detectedUser);
                    }
                }
            }
        } catch (err) {
            console.error("Error en detección:", err);
        }
    }, [modelsLoaded, detectedUser, isProcessing, identifyUser]);

    // useEffect para el loop de detección - se activa cuando la cámara está activa
    useEffect(() => {
        if (!isCameraActive || !modelsLoaded) {
            // Limpiar intervalo si la cámara se apaga o modelos no están listos
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
                detectionIntervalRef.current = null;
            }
            return;
        }

        // Iniciar nuevo intervalo de detección
        detectionIntervalRef.current = window.setInterval(runDetection, 300);

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
                detectionIntervalRef.current = null;
            }
        };
    }, [isCameraActive, modelsLoaded, runDetection]);

    // Registrar acción con verificación facial
    const handleRegister = async (tipo: 'SALIDA' | 'ENTRADA') => {
        if (!detectedUser?.id || isProcessing) return;

        // Verificar permisos
        if (permisosAprobados.length === 0) {
            alert('No se encontraron permisos aprobados vigentes para hoy.');
            return;
        }

        setIsProcessing(true);
        const actionLabel = tipo === 'SALIDA' ? 'Salida' : 'Retorno';
        setStatusMessage(`Verificando rostro para ${actionLabel}...`);

        try {
            // PASO 1: Verificar identidad con reconocimiento facial
            if (!videoRef.current || !modelsLoaded) {
                alert('La cámara no está lista. Por favor, espere.');
                setIsProcessing(false);
                return;
            }

            // Detectar rostro actual
            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.4 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                setStatusMessage('No se detectó rostro. Mire a la cámara.');
                setTimeout(() => setStatusMessage(`Hola, ${detectedUser.nombre}`), 2000);
                setIsProcessing(false);
                return;
            }

            // Capturar imagen y verificar identidad
            const imageBase64 = captureImage();
            if (!imageBase64) {
                setStatusMessage('Error capturando imagen.');
                setIsProcessing(false);
                return;
            }

            const descriptorArray = Array.from(detection.descriptor);

            setStatusMessage(`Confirmando identidad...`);

            // Verificar que el rostro actual corresponde al usuario detectado
            const verifyResponse = await fetch(`${API_BASE_URL}/asistencia/realtime`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embedding: descriptorArray,
                    imagen_base64: imageBase64,
                    solo_validar: true,
                    threshold: 0.5
                })
            });

            if (!verifyResponse.ok) {
                setStatusMessage('Error al verificar identidad.');
                setTimeout(() => setStatusMessage(`Hola, ${detectedUser.nombre}`), 2000);
                setIsProcessing(false);
                return;
            }

            const verifyData = await verifyResponse.json();

            if (!verifyData.reconocido) {
                setStatusMessage('Rostro no reconocido. Intente de nuevo.');
                setTimeout(() => setStatusMessage(`Hola, ${detectedUser.nombre}`), 2000);
                setIsProcessing(false);
                return;
            }

            // Verificar que es el mismo usuario
            if (verifyData.personal_id !== detectedUser.id) {
                setStatusMessage('El rostro no coincide con el usuario identificado.');
                setTimeout(() => setStatusMessage(`Hola, ${detectedUser.nombre}`), 3000);
                setIsProcessing(false);
                return;
            }

            // PASO 2: Registrar la acción
            setStatusMessage(`Registrando ${actionLabel}...`);

            const solicitudId = permisosAprobados[0].id;

            const response = await fetch(`${API_BASE_URL}/control-tiempo/registrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    personal_id: detectedUser.id,
                    tipo_registro: tipo,
                    categoria: 'permiso',
                    solicitud_id: solicitudId
                })
            });

            if (response.ok) {
                const data = await response.json();
                setSuccessData({
                    tipo: tipo === 'SALIDA' ? 'Salida Registrada' : 'Retorno Registrado',
                    hora: data.hora,
                    usuario: detectedUser.nombre
                });
                setShowSuccessModal(true);

                // Recargar registros
                await loadUserData(detectedUser.id);

                setTimeout(() => {
                    setShowSuccessModal(false);
                    // Resetear para el siguiente usuario
                    setDetectedUser(null);
                    setPermisosAprobados([]);
                    setRegistrosHoy([]);
                    setStatusMessage("Buscando rostro...");
                }, 4000);
            } else {
                const err = await response.json();
                alert(err.detail || "Error al registrar");
                setStatusMessage(`Hola, ${detectedUser.nombre}`);
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión");
            setStatusMessage(`Hola, ${detectedUser.nombre}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Helpers de formato
    const formatTime = (date: Date) => date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatDate = (date: Date) => date.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="marcar-permiso-layout">
            <Navbar />
            <div className="marcar-permiso-page">
                <div className="page-header center-header">
                    <h1>CONTROL DE PERMISOS</h1>
                    <p>Acércate a la cámara para identificarte</p>
                </div>

                <div className="layout-grid">
                    {/* Columna Izquierda: Cámara */}
                    <div className="camera-section">
                        <div className="camera-card-full">
                            <div className="camera-header-mini">
                                <div className={`status-pill ${isCameraActive ? 'active' : 'inactive'}`}>
                                    <span className="status-dot"></span>
                                    {isCameraActive ? 'CÁMARA ACTIVA' : 'CÁMARA INACTIVA'}
                                </div>
                                <div className="camera-id">
                                    <Icon name="camera" size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
                                    CAM-01
                                </div>
                            </div>

                            <div className="video-container-full">
                                <div className="video-wrapper-full">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className={isCameraActive ? 'active mirror' : 'inactive'}
                                    />
                                    <canvas ref={canvasRef} className="overlay-canvas mirror" />

                                    {isCameraActive && <div className="scan-overlay"></div>}

                                    {!isCameraActive && (
                                        <div className="camera-offline">
                                            <Icon name="camera-off" size={64} />
                                            <p>Cámara Apagada</p>
                                        </div>
                                    )}

                                    {/* Toast de Feedback unificado */}
                                    {isCameraActive && (
                                        <div className="status-toast">
                                            <span className={detectedUser ? 'dot identified' : 'dot searching'}></span>
                                            {statusMessage}
                                        </div>
                                    )}

                                    {/* Guías visuales de esquina */}
                                    <div className="corner-guide top-left"></div>
                                    <div className="corner-guide top-right"></div>
                                    <div className="corner-guide bottom-left"></div>
                                    <div className="corner-guide bottom-right"></div>
                                </div>
                            </div>

                            <div className="camera-actions-mini">
                                {!isCameraActive ? (
                                    <button onClick={startCamera} className="btn-cam-action start" disabled={!modelsLoaded}>
                                        <Icon name="play-circle" size={18} /> INICIAR ESCANEO
                                    </button>
                                ) : (
                                    <button onClick={stopCamera} className="btn-cam-action stop">
                                        <Icon name="square" size={18} /> DETENER
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Panel de Usuario */}
                    <div className="user-panel">
                        <div className="clock-card-mini">
                            <div className="clock-info">
                                <span className="clock-label">HORA DEL SISTEMA</span>
                                <div className="time-mini">{formatTime(currentTime)}</div>
                                <div className="date-mini">{formatDate(currentTime)}</div>
                            </div>
                            <div className="clock-icon-mini">
                                <Icon name="clock" size={24} />
                            </div>
                        </div>

                        <div className={`user-card ${detectedUser ? 'active' : ''}`}>
                            {detectedUser ? (
                                <>
                                    <div className="user-avatar-placeholder">
                                        {detectedUser.nombre.charAt(0)}
                                    </div>
                                    <h2>{detectedUser.nombre}</h2>
                                    <span className="user-label">Identificado</span>
                                </>
                            ) : (
                                <div className="waiting-state">
                                    <Icon name="user" size={48} />
                                    <h3>Esperando Usuario...</h3>
                                </div>
                            )}
                        </div>

                        {/* Acciones de Permiso */}
                        <div className="permissions-control">
                            {detectedUser ? (
                                <>
                                    {permisosAprobados.length > 0 ? (
                                        <>
                                            <div className="permiso-info-card">
                                                <div className="permiso-header">
                                                    <Icon name="file-text" size={18} />
                                                    <span>Permiso Vigente</span>
                                                </div>
                                                <div className="permiso-details">
                                                    <div className="permiso-row">
                                                        <span className="permiso-label">Boleta:</span>
                                                        <span className="permiso-value">{(() => {
                                                            try {
                                                                const parsed = JSON.parse(permisosAprobados[0].razon || '{}');
                                                                return parsed.numero_boleta || permisosAprobados[0].numero_boleta || 'S/N';
                                                            } catch {
                                                                return permisosAprobados[0].numero_boleta || 'S/N';
                                                            }
                                                        })()}</span>
                                                    </div>
                                                    <div className="permiso-row">
                                                        <span className="permiso-label">Motivo:</span>
                                                        <span className="permiso-value motivo">{(() => {
                                                            try {
                                                                const parsed = JSON.parse(permisosAprobados[0].razon || '{}');
                                                                return parsed.motivo || 'Permiso personal';
                                                            } catch {
                                                                return permisosAprobados[0].razon || 'Permiso personal';
                                                            }
                                                        })()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="buttons-row">
                                                <button
                                                    className="btn-permiso salida"
                                                    onClick={() => handleRegister('SALIDA')}
                                                    disabled={isProcessing}
                                                >
                                                    <Icon name="log-out" size={20} />
                                                    SALIDA
                                                </button>
                                                <button
                                                    className="btn-permiso entrada"
                                                    onClick={() => handleRegister('ENTRADA')}
                                                    disabled={isProcessing}
                                                >
                                                    <Icon name="log-in" size={20} />
                                                    RETORNO
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="alert-box warning">
                                            <Icon name="alert-triangle" size={24} />
                                            <p>No tienes permisos aprobados para hoy.</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="instruction-text">
                                    <p>Por favor mira a la cámara para cargar tus permisos.</p>
                                </div>
                            )}
                        </div>

                        {/* Historial rápido */}
                        {registrosHoy.length > 0 && (
                            <div className="mini-history">
                                <h4>Registros de Hoy</h4>
                                <ul>
                                    {registrosHoy.map((r, i) => (
                                        <li key={i} className={r.tipo.toLowerCase()}>
                                            <span>{r.tipo}</span>
                                            <strong>{r.hora}</strong>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Éxito */}
                {showSuccessModal && successData && (
                    <div className="success-modal-overlay">
                        <div className="success-card-modal">
                            <div className="icon-pulse">
                                <Icon name="check" size={40} />
                            </div>
                            <h2>{successData.tipo}</h2>
                            <div className="big-time">{successData.hora}</div>
                            <p>{successData.usuario}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarcarPermisoPage;
