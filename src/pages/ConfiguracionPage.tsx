import React, { useState, useEffect } from 'react';
import { horariosService, type Horarios } from '../services/horariosService';
import Icon from '../components/Icon';
import './ConfiguracionPage.css';

// Interfaz para las configuraciones locales
interface AppSettings {
    requireSmile: boolean;
    smileThreshold: number;
    autoRegister: boolean;
    showRecentAttendances: boolean;
    faceDetectionThreshold: number;  // Precisión del detector facial (0.5 - 0.95)
    faceDetectionMargin: number;     // Margen mínimo entre matches (0.01 - 0.15)
}

// Valores por defecto
const defaultSettings: AppSettings = {
    requireSmile: true,
    smileThreshold: 0.7,
    autoRegister: true,
    showRecentAttendances: true,
    faceDetectionThreshold: 0.75,  // Valor por defecto (75%)
    faceDetectionMargin: 0.06      // Margen por defecto (6%)
};

// Valores por defecto para horarios
const defaultHorarios: Horarios = {
    ENTRADA_M: { entrada: '08:00', a_tiempo: '08:15', tarde: '08:30' },
    SALIDA_M: { limite_temprano: '13:30' },
    ENTRADA_T: { entrada: '14:30', a_tiempo: '14:45', tarde: '15:00' },
    SALIDA_T: { limite_temprano: '17:00' },
};

// Funciones para guardar/leer configuración local
export const getSettings = (): AppSettings => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
    }
    return defaultSettings;
};

export const saveSettings = (settings: AppSettings): void => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    window.dispatchEvent(new Event('settingsChanged'));
};

// Helper para formatear tiempo para input (HH:MM)
const formatTimeForInput = (time: string | undefined): string => {
    if (!time) return '';
    // Si ya tiene formato HH:MM, devolverlo tal cual
    if (time.match(/^\d{2}:\d{2}$/)) return time;
    // Si tiene formato HH:MM:SS, extraer HH:MM
    const parts = time.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
};

const ConfiguracionPage: React.FC = () => {
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const [saved, setSaved] = useState(false);
    const [horarios, setHorarios] = useState<Horarios>(defaultHorarios);
    const [horariosLoading, setHorariosLoading] = useState(true);
    const [horariosSaving, setHorariosSaving] = useState(false);
    const [horariosError, setHorariosError] = useState<string | null>(null);
    const [horariosSuccess, setHorariosSuccess] = useState(false);

    // Cargar configuración local al montar
    useEffect(() => {
        setSettings(getSettings());
    }, []);

    // Cargar horarios desde API al montar
    useEffect(() => {
        loadHorarios();
    }, []);

    const loadHorarios = async () => {
        try {
            setHorariosLoading(true);
            setHorariosError(null);
            const data = await horariosService.getAll();
            // Merge con defaults para asegurar que todos los campos existan
            setHorarios({
                ENTRADA_M: { ...defaultHorarios.ENTRADA_M, ...data.ENTRADA_M },
                SALIDA_M: { ...defaultHorarios.SALIDA_M, ...data.SALIDA_M },
                ENTRADA_T: { ...defaultHorarios.ENTRADA_T, ...data.ENTRADA_T },
                SALIDA_T: { ...defaultHorarios.SALIDA_T, ...data.SALIDA_T },
            });
        } catch (error) {
            console.error('Error loading horarios:', error);
            setHorariosError('Error al cargar los horarios');
        } finally {
            setHorariosLoading(false);
        }
    };

    // Manejar cambios en configuración local
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

    // Manejar cambios en horarios de entrada
    const handleEntradaChange = (
        turno: 'ENTRADA_M' | 'ENTRADA_T',
        campo: 'entrada' | 'a_tiempo' | 'tarde',
        value: string
    ) => {
        setHorarios(prev => ({
            ...prev,
            [turno]: {
                ...prev[turno],
                [campo]: value
            }
        }));
    };

    // Manejar cambios en horarios de salida
    const handleSalidaChange = (
        turno: 'SALIDA_M' | 'SALIDA_T',
        value: string
    ) => {
        setHorarios(prev => ({
            ...prev,
            [turno]: {
                limite_temprano: value
            }
        }));
    };

    // Guardar horarios
    const handleSaveHorarios = async () => {
        try {
            setHorariosSaving(true);
            setHorariosError(null);
            await horariosService.update(horarios);
            setHorariosSuccess(true);
            setTimeout(() => setHorariosSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving horarios:', error);
            setHorariosError(error instanceof Error ? error.message : 'Error al guardar los horarios');
        } finally {
            setHorariosSaving(false);
        }
    };

    return (
        <div className="config-container">
            {/* Sección de Reconocimiento Facial */}
            <div className="config-section">
                <h3 className="section-title">
                    <span className="section-icon">
                        <Icon name="camera" size={26} strokeWidth={2.5} />
                    </span>
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

                <div className="config-item">
                    <div className="config-info">
                        <label>Mostrar Historial de Asistencias</label>
                        <p className="config-description">
                            Mostrar las últimas 5 asistencias registradas en la pantalla de reconocimiento facial.
                        </p>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={settings.showRecentAttendances}
                            onChange={() => handleToggle('showRecentAttendances')}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="config-item">
                    <div className="config-info">
                        <label>Precisión del Detector Facial: {Math.round(settings.faceDetectionThreshold * 100)}%</label>
                        <p className="config-description">
                            Umbral mínimo de similitud para reconocer un rostro. Valores más altos = mayor seguridad pero puede rechazar usuarios legítimos. Valores más bajos = más permisivo pero menos seguro.
                        </p>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="0.95"
                        step="0.01"
                        value={settings.faceDetectionThreshold}
                        onChange={(e) => handleSlider('faceDetectionThreshold', parseFloat(e.target.value))}
                        className="config-slider"
                    />
                </div>

                <div className="config-item">
                    <div className="config-info">
                        <label>Margen de Diferenciación: {Math.round(settings.faceDetectionMargin * 100)}%</label>
                        <p className="config-description">
                            Diferencia mínima requerida entre el mejor match y el segundo mejor. Valores más bajos permiten reconocer usuarios con rostros similares, pero pueden causar confusiones.
                        </p>
                    </div>
                    <input
                        type="range"
                        min="0.01"
                        max="0.15"
                        step="0.01"
                        value={settings.faceDetectionMargin}
                        onChange={(e) => handleSlider('faceDetectionMargin', parseFloat(e.target.value))}
                        className="config-slider"
                    />
                </div>
            </div>

            {/* Sección de Horarios */}
            <div className="config-section">
                <h3 className="section-title">
                    <span className="section-icon">
                        <Icon name="clock" size={26} strokeWidth={2.5} />
                    </span>
                    Horarios de Trabajo
                </h3>

                {horariosLoading ? (
                    <div className="horarios-loading">
                        <div className="loading-spinner-small"></div>
                        <span>Cargando horarios...</span>
                    </div>
                ) : horariosError && !horarios ? (
                    <div className="horarios-error">
                        <Icon name="alert-circle" size={24} strokeWidth={2.5} />
                        <span>{horariosError}</span>
                        <button onClick={loadHorarios} className="btn-retry">
                            <Icon name="refresh-cw" size={18} strokeWidth={2.5} /> Reintentar
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="horarios-container">
                            {/* Turno Mañana */}
                            <div className="horario-group">
                                <h4 className="horario-group-title">
                                    <Icon name="sunrise" size={22} strokeWidth={2.5} /> Turno Mañana
                                </h4>
                                <div className="horario-grid">
                                    {/* Entrada Mañana */}
                                    <div className="horario-column">
                                        <div className="horario-column-title">
                                            <Icon name="log-in" size={20} color="#28a745" strokeWidth={2.5} /> Entrada
                                        </div>
                                        <div className="horario-field">
                                            <label>Hora de Entrada</label>
                                            <input
                                                type="time"
                                                value={formatTimeForInput(horarios.ENTRADA_M.entrada)}
                                                onChange={(e) => handleEntradaChange('ENTRADA_M', 'entrada', e.target.value)}
                                            />
                                        </div>
                                        <div className="horario-field">
                                            <label>A tiempo hasta</label>
                                            <input
                                                type="time"
                                                value={formatTimeForInput(horarios.ENTRADA_M.a_tiempo)}
                                                onChange={(e) => handleEntradaChange('ENTRADA_M', 'a_tiempo', e.target.value)}
                                            />
                                        </div>
                                        <div className="horario-field">
                                            <label>Tarde después de</label>
                                            <input
                                                type="time"
                                                value={formatTimeForInput(horarios.ENTRADA_M.tarde)}
                                                onChange={(e) => handleEntradaChange('ENTRADA_M', 'tarde', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {/* Salida Mañana */}
                                    <div className="horario-column">
                                        <div className="horario-column-title">
                                            <Icon name="log-out" size={20} color="#dc3545" strokeWidth={2.5} /> Salida
                                        </div>
                                        <div className="horario-field">
                                            <label>Límite temprano</label>
                                            <input
                                                type="time"
                                                value={formatTimeForInput(horarios.SALIDA_M.limite_temprano)}
                                                onChange={(e) => handleSalidaChange('SALIDA_M', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Turno Tarde */}
                            <div className="horario-group">
                                <h4 className="horario-group-title">
                                    <Icon name="sunset" size={22} strokeWidth={2.5} /> Turno Tarde
                                </h4>
                                <div className="horario-grid">
                                    {/* Entrada Tarde */}
                                    <div className="horario-column">
                                        <div className="horario-column-title">
                                            <Icon name="log-in" size={20} color="#28a745" strokeWidth={2.5} /> Entrada
                                        </div>
                                        <div className="horario-field">
                                            <label>Hora de Entrada</label>
                                            <input
                                                type="time"
                                                value={formatTimeForInput(horarios.ENTRADA_T.entrada)}
                                                onChange={(e) => handleEntradaChange('ENTRADA_T', 'entrada', e.target.value)}
                                            />
                                        </div>
                                        <div className="horario-field">
                                            <label>A tiempo hasta</label>
                                            <input
                                                type="time"
                                                value={formatTimeForInput(horarios.ENTRADA_T.a_tiempo)}
                                                onChange={(e) => handleEntradaChange('ENTRADA_T', 'a_tiempo', e.target.value)}
                                            />
                                        </div>
                                        <div className="horario-field">
                                            <label>Tarde después de</label>
                                            <input
                                                type="time"
                                                value={formatTimeForInput(horarios.ENTRADA_T.tarde)}
                                                onChange={(e) => handleEntradaChange('ENTRADA_T', 'tarde', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {/* Salida Tarde */}
                                    <div className="horario-column">
                                        <div className="horario-column-title">
                                            <Icon name="log-out" size={20} color="#dc3545" strokeWidth={2.5} /> Salida
                                        </div>
                                        <div className="horario-field">
                                            <label>Límite temprano</label>
                                            <input
                                                type="time"
                                                value={formatTimeForInput(horarios.SALIDA_T.limite_temprano)}
                                                onChange={(e) => handleSalidaChange('SALIDA_T', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="horarios-actions">
                            {horariosError && (
                                <span className="error-message">
                                    <Icon name="x-circle" size={20} strokeWidth={2.5} /> {horariosError}
                                </span>
                            )}
                            {horariosSuccess && (
                                <span className="success-message">
                                    <Icon name="check-circle" size={20} strokeWidth={2.5} /> Horarios guardados correctamente
                                </span>
                            )}
                            <button
                                className="btn-save-horarios"
                                onClick={handleSaveHorarios}
                                disabled={horariosSaving}
                            >
                                {horariosSaving ? (
                                    <>
                                        <span className="loading-spinner-small"></span>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Icon name="save" size={22} color="white" strokeWidth={2.5} /> Guardar Horarios
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Toast de guardado */}
            {saved && (
                <div className="save-toast">
                    <Icon name="check" size={20} color="white" strokeWidth={3} /> Configuración guardada
                </div>
            )}
        </div>
    );
};

export default ConfiguracionPage;
