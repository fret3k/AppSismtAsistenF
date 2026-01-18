import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import './RecentAttendances.css';

interface Asistencia {
    id: string;
    usuario: string;
    turno: string;
    estado: string;
    hora: string;
    fecha: string;
}

interface Estadisticas {
    presentes: number;
    tardanzas: number;
    faltas: number;
    total: number;
}

interface RecentAttendancesProps {
    updateTrigger?: number;
}

const RecentAttendances: React.FC<RecentAttendancesProps> = ({ updateTrigger = 0 }) => {
    const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
    const [stats, setStats] = useState<Estadisticas>({ presentes: 0, tardanzas: 0, faltas: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRecentAttendances = async () => {
        try {
            setLoading(true);
            setError(null);

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${API_URL}/asistencia/recientes?limite=5`);

            if (!response.ok) {
                throw new Error('Error al cargar asistencias recientes');
            }

            const data = await response.json();

            // Handle both old list format and new object format
            if (Array.isArray(data)) {
                setAsistencias(data);
                // Si es array antiguo, intentamos obtener stats por separado o usamos defaults
                // Para mantener compatibilidad si el backend falla al actualizar
            } else {
                setAsistencias(data.asistencias || []);
                if (data.estadisticas) {
                    setStats(data.estadisticas);
                }
            }

        } catch (err) {
            console.error('Error fetching recent attendances:', err);
            setError('No se pudieron cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecentAttendances();
    }, [updateTrigger]); // Solo actualizar al montar o cuando cambie updateTrigger

    // Helpers de UI
    const getTurnoShort = (turno: string) => {
        if (turno.toLowerCase().includes('mañana')) return 'Turno Mañana';
        return 'Turno Tarde';
    };

    const getInitials = (name: string) => {
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Generar color de avatar basado en el nombre
    const getAvatarColor = (name: string) => {
        const colors = ['#FFD166', '#06D6A0', '#118AB2', '#EF476F', '#8338EC'];
        let sum = 0;
        for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
        return colors[sum % colors.length];
    };


    return (
        <div className="recent-attendances-container">
            <div className="section-header">
                <div className="header-title">
                    <Icon name="clock" size={20} className="header-icon" />
                    <h3>Asistencias Recientes</h3>
                </div>
                <button className="refresh-btn" onClick={fetchRecentAttendances} disabled={loading} title="Actualizar">
                    <Icon name="refresh-cw" size={16} />
                </button>
            </div>

            {/* Panel de Estadísticas */}
            <div className="stats-summary">
                <div className="stat-item">
                    <span className="stat-label">PRESENTES</span>
                    <span className="stat-value text-blue">{stats.presentes}</span>
                </div>
                <div className="stat-separator"></div>
                <div className="stat-item">
                    <span className="stat-label">TARDANZAS</span>
                    <span className="stat-value text-orange">{stats.tardanzas}</span>
                </div>
                <div className="stat-separator"></div>
                <div className="stat-item">
                    <span className="stat-label">FALTAS</span>
                    <span className="stat-value text-red">{stats.faltas}</span>
                </div>
            </div>

            {/* Lista de Asistencias */}
            <div className="attendances-list">
                {error ? (
                    <div className="empty-state" style={{ color: '#dc3545' }}>
                        <Icon name="alert-circle" size={24} />
                        <p>{error}</p>
                    </div>
                ) : loading && asistencias.length === 0 ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Cargando...</p>
                    </div>
                ) : asistencias.length === 0 ? (
                    <div className="empty-state">
                        <p>No hay registros hoy</p>
                    </div>
                ) : (
                    asistencias.map((item) => (
                        <div key={item.id} className="attendance-card">
                            <div className="avatar-circle" style={{ backgroundColor: getAvatarColor(item.usuario) + '20', color: getAvatarColor(item.usuario) }}>
                                {getInitials(item.usuario)}
                            </div>
                            <div className="attendance-info">
                                <h4 className="user-name">{item.usuario}</h4>
                                <div className="attendance-meta">
                                    <Icon name="briefcase" size={12} className="meta-icon" />
                                    <span>{getTurnoShort(item.turno)}</span>
                                </div>
                            </div>
                            <div className="attendance-status">
                                <span className="recent-time-display">{item.hora}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="view-more-link">
                <a href="/dashboard/asistencias">Ver reporte completo del día →</a>
            </div>
        </div>
    );
};

export default RecentAttendances;
