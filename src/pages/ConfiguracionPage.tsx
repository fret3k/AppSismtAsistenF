import React, { useState, useEffect } from 'react';
import './ConfiguracionPage.css';

// Interfaz para las configuraciones
interface AppSettings {
    requireSmile: boolean;
    smileThreshold: number;
    autoRegister: boolean;
}

// Valores por defecto
const defaultSettings: AppSettings = {
    requireSmile: true,
    smileThreshold: 0.7,
    autoRegister: true
};

// Funciones para guardar/leer configuración
export const getSettings = (): AppSettings => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
    }
    return defaultSettings;
};

export const saveSettings = (settings: AppSettings): void => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    // Disparar evento para que otros componentes se enteren
    window.dispatchEvent(new Event('settingsChanged'));
};

const ConfiguracionPage: React.FC = () => {
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const [saved, setSaved] = useState(false);

    // Cargar configuración al montar
    useEffect(() => {
        setSettings(getSettings());
    }, []);

    // Manejar cambios
    const handleToggle = (key: keyof AppSettings) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        saveSettings(newSettings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleSlider = (key: keyof AppSettings, value: number) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    return (
        <div className="config-container">
            {/* Sección de Reconocimiento Facial */}
            <div className="config-section">
                <h3 className="section-title">
                    <span className="section-icon">📷</span>
                    Reconocimiento Facial
                </h3>

                <div className="config-item">
                    <div className="config-info">
                        <label>Requerir Sonrisa (Prueba de vida)</label>
                        <p className="config-description">
                            Solicitar al usuario que sonría antes de registrar la asistencia para evitar suplantación con fotos.
                        </p>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={settings.requireSmile}
                            onChange={() => handleToggle('requireSmile')}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                {settings.requireSmile && (
                    <div className="config-item sub-item">
                        <div className="config-info">
                            <label>Umbral de Sonrisa: {Math.round(settings.smileThreshold * 100)}%</label>
                            <p className="config-description">
                                Nivel mínimo de sonrisa requerido para validar la prueba de vida.
                            </p>
                        </div>
                        <input
                            type="range"
                            min="0.3"
                            max="0.9"
                            step="0.05"
                            value={settings.smileThreshold}
                            onChange={(e) => handleSlider('smileThreshold', parseFloat(e.target.value))}
                            className="config-slider"
                        />
                    </div>
                )}

                <div className="config-item">
                    <div className="config-info">
                        <label>Registro Automático</label>
                        <p className="config-description">
                            Registrar automáticamente la asistencia cuando se detecte un rostro válido.
                        </p>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={settings.autoRegister}
                            onChange={() => handleToggle('autoRegister')}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            {/* Toast de guardado */}
            {saved && (
                <div className="save-toast">
                    ✓ Configuración guardada
                </div>
            )}
        </div>
    );
};

export default ConfiguracionPage;
