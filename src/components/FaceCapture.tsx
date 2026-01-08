import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import './FaceCapture.css';

interface FaceCaptureProps {
    onFaceDetected: (faceDescriptor: Float32Array, imageDataUrl: string) => void;
    onCancel: () => void;
}

const FaceCapture: React.FC<FaceCaptureProps> = ({ onFaceDetected, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [captureMode, setCaptureMode] = useState<'camera' | 'upload'>('camera');

    // Load face-api.js models
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models'; // Models should be in public/models folder
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                setIsModelLoaded(true);
            } catch (err) {
                console.error('Error loading face-api models:', err);
                setError('Error al cargar los modelos de reconocimiento facial. Asegúrate de que los modelos estén en /public/models/');
            }
        };
        loadModels();
    }, []);

    // Start camera
    const startCamera = async () => {
        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setStream(mediaStream);
                setIsCameraActive(true);
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('No se pudo acceder a la cámara. Verifica los permisos.');
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsCameraActive(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stream]);

    // Capture photo from camera
    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setIsProcessing(true);
        setError(null);

        try {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No se pudo obtener el contexto del canvas');

            ctx.drawImage(video, 0, 0);

            // Detect face and get descriptor
            await detectAndProcessFace(canvas);
        } catch (err) {
            console.error('Error capturing photo:', err);
            setError('Error al capturar la foto');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        try {
            const img = await faceapi.bufferToImage(file);
            const canvas = canvasRef.current;
            if (!canvas) throw new Error('Canvas no disponible');

            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No se pudo obtener el contexto del canvas');

            ctx.drawImage(img, 0, 0);

            // Detect face and get descriptor
            await detectAndProcessFace(canvas);
        } catch (err) {
            console.error('Error processing uploaded image:', err);
            setError('Error al procesar la imagen');
        } finally {
            setIsProcessing(false);
        }
    };

    // Detect face and extract descriptor
    const detectAndProcessFace = async (canvas: HTMLCanvasElement) => {
        try {
            const detection = await faceapi
                .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                setError('No se detectó ningún rostro en la imagen. Intenta de nuevo.');
                return;
            }

            // Get the face descriptor (128-dimensional vector)
            const descriptor = detection.descriptor;

            // Convert canvas to data URL for preview
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

            // Draw detection box on canvas
            const displaySize = { width: canvas.width, height: canvas.height };
            faceapi.matchDimensions(canvas, displaySize);
            const resizedDetection = faceapi.resizeResults(detection, displaySize);
            faceapi.draw.drawDetections(canvas, resizedDetection);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetection);

            // Call parent callback with descriptor
            onFaceDetected(descriptor, imageDataUrl);

            // Stop camera after successful capture
            stopCamera();
        } catch (err) {
            console.error('Error detecting face:', err);
            setError('Error al detectar el rostro');
        }
    };

    return (
        <div className="face-capture-modal">
            <div className="face-capture-content">
                <div className="face-capture-header">
                    <h2>📸 Capturar Rostro</h2>
                    <button className="close-btn" onClick={onCancel}>✕</button>
                </div>

                {!isModelLoaded && (
                    <div className="loading-models">
                        <div className="spinner"></div>
                        <p>Cargando modelos de reconocimiento facial...</p>
                    </div>
                )}

                {isModelLoaded && (
                    <>
                        <div className="capture-mode-selector">
                            <button
                                className={`mode-btn ${captureMode === 'camera' ? 'active' : ''}`}
                                onClick={() => setCaptureMode('camera')}
                            >
                                📷 Cámara
                            </button>
                            <button
                                className={`mode-btn ${captureMode === 'upload' ? 'active' : ''}`}
                                onClick={() => setCaptureMode('upload')}
                            >
                                📁 Subir Imagen
                            </button>
                        </div>

                        {error && (
                            <div className="alert alert-error">
                                {error}
                            </div>
                        )}

                        <div className="capture-area">
                            {captureMode === 'camera' && (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className={`video-preview ${isCameraActive ? 'active' : ''}`}
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        className={`capture-canvas ${isProcessing ? 'active' : ''}`}
                                    />

                                    <div className="camera-controls">
                                        {!isCameraActive ? (
                                            <button
                                                className="btn-primary"
                                                onClick={startCamera}
                                                disabled={isProcessing}
                                            >
                                                🎥 Activar Cámara
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    className="btn-primary"
                                                    onClick={capturePhoto}
                                                    disabled={isProcessing}
                                                >
                                                    {isProcessing ? 'Procesando...' : '📸 Capturar Foto'}
                                                </button>
                                                <button
                                                    className="btn-secondary"
                                                    onClick={stopCamera}
                                                    disabled={isProcessing}
                                                >
                                                    ⏹️ Detener Cámara
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}

                            {captureMode === 'upload' && (
                                <>
                                    <canvas
                                        ref={canvasRef}
                                        className="capture-canvas active"
                                    />
                                    <div className="upload-area">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            style={{ display: 'none' }}
                                        />
                                        <button
                                            className="btn-primary upload-btn"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? 'Procesando...' : '📁 Seleccionar Imagen'}
                                        </button>
                                        <p className="upload-hint">
                                            Selecciona una imagen clara de tu rostro
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="capture-instructions">
                            <h4>📋 Instrucciones:</h4>
                            <ul>
                                <li>Asegúrate de tener buena iluminación</li>
                                <li>Mira directamente a la cámara</li>
                                <li>Mantén el rostro centrado</li>
                                <li>Evita usar accesorios que cubran tu rostro</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default FaceCapture;
