import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { permisosService } from '../services/permisosService';
import type { SolicitudAusencia } from '../types/permisos';
import Icon from '../components/Icon';
import './HistorialPermisosPage.css';

const HistorialPermisosPage: React.FC = () => {
    const { user } = useAuth();
    const [solicitudes, setSolicitudes] = useState<SolicitudAusencia[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterMonth, setFilterMonth] = useState<string>('');

    const CODE_OPTIONS = [
        { code: 'CS', label: 'Comisión de Servicio' },
        { code: 'CGDM', label: 'Descanso Médico' },
        { code: 'CGCM', label: 'Cita Médica' },
        { code: 'SGPP', label: 'Permiso personal' },
        { code: 'CGCO', label: 'Capacitación oficializada' },
        { code: 'CGCNO', label: 'Capacitación No Oficializada' },
        { code: 'CGF', label: 'Fallecimiento Familiar' },
        { code: 'ACV', label: 'Vacaciones' },
        { code: 'S', label: 'Suspensión' },
        { code: 'L', label: 'Licencia' },
        { code: 'O', label: 'Otros' }
    ];

    const findCodeLabel = (code: string) => CODE_OPTIONS.find(o => o.code === code)?.label || code;

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            // Solo cargar los permisos del usuario actual
            const data = await permisosService.getByPersonal(user.id);
            // Ordenar por fecha más reciente
            data.sort((a, b) => new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime());
            setSolicitudes(data);
        } catch (err) {
            console.error("Error loading permisos", err);
            setError("Error al cargar el historial.");
        } finally {
            setLoading(false);
        }
    };

    const getSolicitudMeta = (s: SolicitudAusencia) => {
        try {
            const parsed = JSON.parse(s.razon || '{}');
            if (typeof parsed !== 'object' || parsed === null) throw new Error();
            return {
                numero_boleta: (s.numero_boleta || parsed.numero_boleta || '').toString(),
                codigos: (s.codigos || parsed.codigos || []) as string[],
                motivo: (parsed.motivo || s.razon || '') as string
            };
        } catch {
            return {
                numero_boleta: s.numero_boleta || '',
                codigos: s.codigos || [],
                motivo: s.razon || ''
            };
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'APROBADA': return 'approved';
            case 'DENEGADA': return 'denied';
            case 'PENDIENTE': return 'pending';
            default: return 'pending';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Filtrar solicitudes
    const filteredSolicitudes = solicitudes.filter(s => {
        if (filterStatus !== 'all' && s.estado_solicitud !== filterStatus) return false;
        if (filterMonth) {
            const solicitudMonth = new Date(s.fecha_solicitud).toISOString().slice(0, 7);
            if (solicitudMonth !== filterMonth) return false;
        }
        return true;
    });

    // Stats
    const stats = {
        total: solicitudes.length,
        aprobadas: solicitudes.filter(s => s.estado_solicitud === 'APROBADA').length,
        denegadas: solicitudes.filter(s => s.estado_solicitud === 'DENEGADA').length,
        pendientes: solicitudes.filter(s => s.estado_solicitud === 'PENDIENTE').length,
    };

    if (loading) {
        return (
            <div className="historial-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Cargando historial...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="historial-page">
            {error && (
                <div className="alert alert-error">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* Stats resumidas */}
            <div className="stats-row">
                <div className="stat-item total">
                    <Icon name="file-text" size={18} />
                    <span>{stats.total} Total</span>
                </div>
                <div className="stat-item approved">
                    <Icon name="check-circle" size={18} />
                    <span>{stats.aprobadas} Aprobadas</span>
                </div>
                <div className="stat-item denied">
                    <Icon name="x-circle" size={18} />
                    <span>{stats.denegadas} Denegadas</span>
                </div>
                <div className="stat-item pending">
                    <Icon name="clock" size={18} />
                    <span>{stats.pendientes} Pendientes</span>
                </div>
            </div>

            {/* Filtros */}
            <div className="filters-row">
                <div className="filter-group">
                    <label>Estado:</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">Todos</option>
                        <option value="PENDIENTE">Pendientes</option>
                        <option value="APROBADA">Aprobadas</option>
                        <option value="DENEGADA">Denegadas</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Mes:</label>
                    <input
                        type="month"
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                    />
                </div>

                {(filterStatus !== 'all' || filterMonth) && (
                    <button className="clear-filters" onClick={() => {
                        setFilterStatus('all');
                        setFilterMonth('');
                    }}>
                        <Icon name="x" size={14} />
                        Limpiar
                    </button>
                )}

                <span className="results-count">
                    {filteredSolicitudes.length} de {solicitudes.length}
                </span>
            </div>

            {/* Tabla de permisos */}
            <div className="table-container">
                {filteredSolicitudes.length === 0 ? (
                    <div className="empty-state">
                        <Icon name="inbox" size={40} />
                        <h3>Sin solicitudes</h3>
                        <p>No tienes solicitudes de permisos registradas.</p>
                    </div>
                ) : (
                    <table className="permisos-table">
                        <thead>
                            <tr>
                                <th>N° Boleta</th>
                                <th>Fecha Solicitud</th>
                                <th>Fecha Inicio</th>
                                <th>Fecha Fin</th>
                                <th>Código</th>
                                <th>Motivo</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSolicitudes.map(solicitud => {
                                const meta = getSolicitudMeta(solicitud);
                                return (
                                    <tr key={solicitud.id}>
                                        <td className="boleta-cell">
                                            {meta.numero_boleta || '-'}
                                        </td>
                                        <td>{formatDate(solicitud.fecha_solicitud)}</td>
                                        <td>{formatDate(solicitud.fecha_inicio)}</td>
                                        <td>{formatDate(solicitud.fecha_fin)}</td>
                                        <td className="codes-cell">
                                            {meta.codigos.length > 0 ? (
                                                meta.codigos.map(code => (
                                                    <span key={code} className="code-tag" title={findCodeLabel(code)}>
                                                        {code}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="no-code">-</span>
                                            )}
                                        </td>
                                        <td className="motivo-cell" title={meta.motivo}>
                                            {meta.motivo.length > 50 ? meta.motivo.substring(0, 50) + '...' : meta.motivo || '-'}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${getStatusBadgeClass(solicitud.estado_solicitud)}`}>
                                                {solicitud.estado_solicitud}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default HistorialPermisosPage;
