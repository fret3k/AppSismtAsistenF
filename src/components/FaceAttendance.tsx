import React, { useEffect, useRef, useState } from 'react';
import './FaceAttendance.css';
// import * as faceapi from 'face-api.js'; // Uncomment when models are ready

const FaceAttendance: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Sistema listo. Active la cámara para comenzar.");

    useEffect(() => {
        startVideo();
        // loadModels(); // Uncomment when models are ready

        return () => {
            stopVideo();
        };
    }, []);

    const startVideo = () => {
        setStatusMessage("Accediendo a la cámara...");
        navigator.mediaDevices
            .getUserMedia({ video: {} })
            .then((stream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    streamRef.current = stream;
                    setIsCameraActive(true);
                    setStatusMessage("Cámara activa. Detectando rostro...");
                }
            })
            .catch((err) => {
                console.error("Error al acceder a la cámara:", err);
                setStatusMessage("Error: No se pudo acceder a la cámara.");
                setIsCameraActive(false);
            });
    };

    const stopVideo = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            streamRef.current = null;
            setIsCameraActive(false);
            setStatusMessage("Cámara desactivada.");
        }
    };

    const toggleCamera = () => {
        if (isCameraActive) {
            stopVideo();
        } else {
            startVideo();
        }
    };

    /* 
    // Placeholder for face-api.js model loading
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
    };
    */

    return (
        <div className="face-attendance-container">
            <div className="camera-card">
                <div className="video-container">
                    <video ref={videoRef} autoPlay muted />
                </div>

                <div className={`status-indicator ${isCameraActive ? 'active' : ''}`}>
                    {statusMessage}
                </div>

                <div className="controls">
                    <button
                        className={isCameraActive ? "btn-secondary" : "btn-primary"}
                        onClick={toggleCamera}
                    >
                        {isCameraActive ? '📷 Desactivar Cámara' : '📷 Activar Cámara'}
                    </button>
                    <button className="btn-primary" onClick={() => window.location.reload()}>
                        🔄 Recargar Sistema
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FaceAttendance;
