import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { asistenciaService } from '../services/asistenciaService';
import Icon from '../components/Icon';
import './MisAsistenciasPage.css';

interface AsistenciaRecord {
    id?: string;
    fecha: string;
    marca_tiempo: string;
    tipo_registro: string;
    estado: string;
    is_falta?: boolean;
}

const MisAsistenciasPage: React.FC = () => {
    const { user } = useAuth();
    const [asistencias, setAsistencias] = useState<AsistenciaRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [anio, setAnio] = useState(new Date().getFullYear());

    const MESES = [
        { value: 1, label: 'Enero' },
        { value: 2, label: 'Febrero' },
        { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Mayo' },
        { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' },
        { value: 11, label: 'Noviembre' },
        { value: 12, label: 'Diciembre' },
    ];

    useEffect(() => {
        cargarAsistencias();
    }, []);

    const cargarAsistencias = async () => {
        if (!user?.id) return;

        setLoading(true);
        setError(null);
        try {
            // Calculate date range for the selected month
            const fechaInicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
            const lastDay = new Date(anio, mes, 0).getDate();
            const fechaFin = `${anio}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            const data = await asistenciaService.getHistorial(fechaInicio, fechaFin, user.id);

            // Generate list of all days in the month
            const completeList: AsistenciaRecord[] = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let d = 1; d <= lastDay; d++) {
                const dateStr = `${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const currDate = new Date(anio, mes - 1, d);

                // Skip future days
                if (currDate > today) continue;

                // Find records for this day
                const dayRecords = data.filter(r => r.fecha === dateStr);

                if (dayRecords.length > 0) {
                    dayRecords.forEach(r => completeList.push({
                        ...r,
                        is_falta: false
                    }));
                } else {
                    // It's a "Falta" (absence) if it's a weekday (optional, but requested to show absences)
                    // Common business rule: check if it's not Sunday (day 0)
                    const dayOfWeek = currDate.getDay();
                    if (dayOfWeek !== 0) { // Not Sunday
                        completeList.push({
                            fecha: dateStr,
                            marca_tiempo: `${dateStr}T00:00:00`,
                            tipo_registro: 'N/A',
                            estado: 'FALTA',
                            is_falta: true
                        });
                    }
                }
            }

            // Sort by date descending
            completeList.sort((a, b) =>
                new Date(b.marca_tiempo).getTime() - new Date(a.marca_tiempo).getTime()
            );

            setAsistencias(completeList);
            setLoaded(true);
        } catch (err) {
            console.error('Error loading asistencias:', err);
            setError('Error al cargar las asistencias');
        } finally {
            setLoading(false);
        }
    };

    const getEstadoClass = (estado: string) => {
        const e = estado?.toUpperCase() || '';
        if (e === 'A TIEMPO' || e === 'NORMAL') return 'estado-ok';
        if (e === 'TARDE') return 'estado-tarde';
        if (e === 'SALIDA_ANTICIPADA') return 'estado-anticipada';
        if (e === 'FALTA') return 'estado-error';
        return '';
    };

    const formatFecha = (fecha: string) => {
        return new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatHora = (record: AsistenciaRecord) => {
        if (record.is_falta) return '--:--';
        return new Date(record.marca_tiempo).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Stats
    const stats = {
        total: asistencias.filter(a => !a.is_falta).length,
        aTiempo: asistencias.filter(a => a.estado?.toUpperCase() === 'A TIEMPO' || a.estado?.toUpperCase() === 'NORMAL').length,
        tardes: asistencias.filter(a => a.estado?.toUpperCase() === 'TARDE').length,
        faltas: asistencias.filter(a => a.is_falta).length,
    };

    return (
        <div className="mis-asistencias-page">
            {/* Filters Card */}
            <div className="filters-card">
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>Seleccionar Mes</label>
                        <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                            {MESES.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Año</label>
                        <input
                            type="number"
                            value={anio}
                            onChange={(e) => setAnio(Number(e.target.value))}
                            min={2020}
                            max={2030}
                        />
                    </div>

                    <div className="filter-group filter-action">
                        <button className="btn-buscar" onClick={cargarAsistencias} disabled={loading}>
                            <Icon name={loading ? 'loader' : 'search'} size={18} className={loading ? 'spin' : ''} />
                            {loading ? 'Buscando...' : 'Filtrar Asistencias'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {loaded && (
                <div className="stats-grid">
                    <div className="mini-stat-card">
                        <div className="mini-stat-icon total">
                            <Icon name="calendar" size={24} color="#1d4ed8" />
                        </div>
                        <div className="mini-stat-content">
                            <span className="mini-stat-number">{stats.total}</span>
                            <span className="mini-stat-label">Días Asistidos</span>
                        </div>
                    </div>
                    <div className="mini-stat-card">
                        <div className="mini-stat-icon success">
                            <Icon name="check-circle" size={24} color="#16a34a" />
                        </div>
                        <div className="mini-stat-content">
                            <span className="mini-stat-number">{stats.aTiempo}</span>
                            <span className="mini-stat-label">A Tiempo</span>
                        </div>
                    </div>
                    <div className="mini-stat-card">
                        <div className="mini-stat-icon warning">
                            <Icon name="clock" size={24} color="#b45309" />
                        </div>
                        <div className="mini-stat-content">
                            <span className="mini-stat-number">{stats.tardes}</span>
                            <span className="mini-stat-label">Tardanzas</span>
                        </div>
                    </div>
                    <div className="mini-stat-card">
                        <div className="mini-stat-icon error">
                            <Icon name="x-circle" size={24} color="#dc2626" />
                        </div>
                        <div className="mini-stat-content">
                            <span className="mini-stat-number">{stats.faltas}</span>
                            <span className="mini-stat-label">Inasistencias</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="error-alert">
                    <Icon name="alert-circle" size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Table Card */}
            <div className="table-card">
                <div className="table-header">
                    <h3>
                        <Icon name="list" size={20} />
                        Historial Mensual de Asistencias
                    </h3>
                    <span className="month-label">
                        {MESES.find(m => m.value === mes)?.label} {anio}
                    </span>
                </div>

                {!loaded && !loading ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Icon name="search" size={48} color="#9ca3af" />
                        </div>
                        <p>Haz clic en "Filtrar Asistencias" para cargar tu historial</p>
                    </div>
                ) : loading ? (
                    <div className="loading-state-box">
                        <div className="spinner-large"></div>
                        <p>Cargando datos del mes...</p>
                    </div>
                ) : asistencias.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Icon name="inbox" size={48} color="#9ca3af" />
                        </div>
                        <p>No se encontraron registros para este período</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="asistencias-table">
                            <thead>
                                <tr>
                                    <th>Fecha y Día</th>
                                    <th>Hora de Marca</th>
                                    <th>Turno</th>
                                    <th>Estado / Condición</th>
                                </tr>
                            </thead>
                            <tbody>
                                {asistencias.map((asistencia, idx) => (
                                    <tr key={`${asistencia.fecha}-${idx}`} className={asistencia.is_falta ? 'row-falta' : ''}>
                                        <td>
                                            <div className="fecha-cell">
                                                <div className={`calendar-icon-mini ${asistencia.is_falta ? 'falta' : ''}`}>
                                                    <Icon name="calendar" size={14} />
                                                </div>
                                                <span className="fecha-text">{formatFecha(asistencia.fecha)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="hora-cell">
                                                {!asistencia.is_falta && <Icon name="clock" size={16} color="#6b7280" />}
                                                <span>{formatHora(asistencia)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`turno-badge ${asistencia.is_falta ? 'falta' : ''}`}>
                                                {asistencia.tipo_registro.includes('_M') ? 'Turno Mañana' : asistencia.tipo_registro.includes('_T') ? 'Turno Tarde' : asistencia.tipo_registro}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`estado-badge ${getEstadoClass(asistencia.estado)}`}>
                                                {asistencia.is_falta ? (
                                                    <><Icon name="x-circle" size={14} /> FALTA / INASISTENCIA</>
                                                ) : asistencia.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MisAsistenciasPage;
