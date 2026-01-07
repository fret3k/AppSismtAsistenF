import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { permisosService } from '../services/permisosService';
import { personalService } from '../services/personalService';
import type { SolicitudAusencia, SolicitudAusenciaCreate } from '../types/permisos';
import type { PersonalResponseDTO } from '../types';
import Icon from '../components/Icon';
import './PermisosPage.css';

interface PermisosPageProps {
    mode: 'admin' | 'user';
}

type TabFilter = 'all' | 'PENDIENTE' | 'APROBADA' | 'DENEGADA';

const PermisosPage: React.FC<PermisosPageProps> = ({ mode }) => {
    const { user } = useAuth();
    const [solicitudes, setSolicitudes] = useState<SolicitudAusencia[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabFilter>('all');
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [listaPersonal, setListaPersonal] = useState<PersonalResponseDTO[]>([]);
    const [selectedPersonalId, setSelectedPersonalId] = useState<string>('');

    const [formData, setFormData] = useState<SolicitudAusenciaCreate>({
        personal_id: '',
        tipo_ausencia: 'PERSONAL',
        fecha_inicio: '',
        fecha_fin: '',
        razon: '',
        hora_inicio: '',
        hora_fin: ''
    });

    const [userNames, setUserNames] = useState<Record<string, string>>({});
    const [userDNIs, setUserDNIs] = useState<Record<string, string>>({});

    useEffect(() => {
        loadData();
    }, [mode, user]);

    const loadData = async () => {
        try {
            setLoading(true);
            let data: SolicitudAusencia[] = [];

            if (mode === 'admin') {
                data = await permisosService.getAll();
                const allPersonal = await personalService.getAll();
                setListaPersonal(allPersonal);
                const names: Record<string, string> = {};
                const dnis: Record<string, string> = {};
                allPersonal.forEach(p => {
                    names[p.id] = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno}`;
                    dnis[p.id] = p.dni;
                });
                setUserNames(names);
                setUserDNIs(dnis);
            } else {
                if (user?.id) {
                    data = await permisosService.getByPersonal(user.id);
                }
            }

            data.sort((a, b) => new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime());
            setSolicitudes(data);
        } catch (err) {
            console.error("Error loading permisos", err);
            setError("Error al cargar las solicitudes.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        const personalIdToUse = mode === 'admin' ? selectedPersonalId : user?.id;
        if (!personalIdToUse) {
            setError("Debe seleccionar un empleado");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            const payload = { ...formData, personal_id: personalIdToUse };
            if (!payload.hora_inicio) delete payload.hora_inicio;
            if (!payload.hora_fin) delete payload.hora_fin;

            await permisosService.create(payload);
            setSuccess("Solicitud creada correctamente");
            setShowForm(false);
            setFormData({
                personal_id: '',
                tipo_ausencia: 'PERSONAL',
                fecha_inicio: '',
                fecha_fin: '',
                razon: '',
                hora_inicio: '',
                hora_fin: ''
            });
            setSelectedPersonalId('');
            loadData();
        } catch (err) {
            console.error(err);
            setError("Error al crear la solicitud");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const action = newStatus === 'APROBADA' ? 'aprobar' : 'denegar';
        if (!window.confirm(`¿Estás seguro de ${action} esta solicitud?`)) return;
        try {
            await permisosService.updateStatus(id, newStatus);
            setSuccess(`Solicitud ${newStatus.toLowerCase()} correctamente`);
            loadData();
        } catch (err) {
            console.error(err);
            setError("Error al actualizar el estado");
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'APROBADA': return 'approved';
            case 'DENEGADA': return 'denied';
            case 'PENDIENTE': return 'pending';
            case 'ANULADA': return 'cancelled';
            default: return 'pending';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'VACACIONES': return 'sun';
            case 'ENFERMEDAD': return 'thermometer';
            case 'PERSONAL': return 'user';
            default: return 'file-text';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Filter by search term (for admin)
    const getFilteredBySearch = (items: SolicitudAusencia[]) => {
        if (!searchTerm.trim() || mode !== 'admin') return items;

        const term = searchTerm.toLowerCase();
        return items.filter(s => {
            const name = userNames[s.personal_id]?.toLowerCase() || '';
            const dni = userDNIs[s.personal_id]?.toLowerCase() || '';
            return name.includes(term) || dni.includes(term);
        });
    };

    // Stats
    const stats = {
        total: solicitudes.length,
        pending: solicitudes.filter(s => s.estado_solicitud === 'PENDIENTE').length,
        approved: solicitudes.filter(s => s.estado_solicitud === 'APROBADA').length,
        denied: solicitudes.filter(s => s.estado_solicitud === 'DENEGADA').length,
    };

    // Filter by tab and search
    const filteredByTab = activeTab === 'all'
        ? solicitudes
        : solicitudes.filter(s => s.estado_solicitud === activeTab);

    const filteredSolicitudes = getFilteredBySearch(filteredByTab);

    if (loading) {
        return (
            <div className="permisos-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Cargando solicitudes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="permisos-page">
            {/* Alerts */}
            {error && (
                <div className="alert alert-error">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}
            {success && (
                <div className="alert alert-success">
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)}>×</button>
                </div>
            )}

            {/* Stats Cards (Solo Admin) */}
            {mode === 'admin' && (
                <div className="permisos-stats">
                    <div className="stat-card">
                        <div className="stat-card-icon total">
                            <Icon name="file-text" size={24} color="#1d4ed8" />
                        </div>
                        <div className="stat-card-content">
                            <h3>Total</h3>
                            <span className="number">{stats.total}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon pending">
                            <Icon name="clock" size={24} color="#b45309" />
                        </div>
                        <div className="stat-card-content">
                            <h3>Pendientes</h3>
                            <span className="number">{stats.pending}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon approved">
                            <Icon name="check-circle" size={24} color="#16a34a" />
                        </div>
                        <div className="stat-card-content">
                            <h3>Aprobadas</h3>
                            <span className="number">{stats.approved}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon denied">
                            <Icon name="x-circle" size={24} color="#dc2626" />
                        </div>
                        <div className="stat-card-content">
                            <h3>Denegadas</h3>
                            <span className="number">{stats.denied}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Bar */}
            <div className="action-bar">
                {mode === 'admin' && (
                    <div className="search-box">
                        <Icon name="search" size={20} color="#9ca3af" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o DNI..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="clear-search" onClick={() => setSearchTerm('')}>
                                <Icon name="x" size={16} />
                            </button>
                        )}
                    </div>
                )}

                <button className="btn-create" onClick={() => setShowForm(!showForm)}>
                    <Icon name={showForm ? 'x' : 'plus'} size={20} />
                    {showForm ? 'Cancelar' : 'Nueva Solicitud'}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="form-card">
                    <h2>
                        <Icon name="plus-circle" size={24} />
                        Nueva Solicitud de Permiso
                    </h2>
                    <form onSubmit={handleCreate}>
                        <div className="form-grid">
                            {mode === 'admin' && (
                                <div className="form-group">
                                    <label>Empleado *</label>
                                    <select
                                        value={selectedPersonalId}
                                        onChange={e => setSelectedPersonalId(e.target.value)}
                                        required
                                    >
                                        <option value="">Seleccionar empleado...</option>
                                        {listaPersonal.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.dni} - {p.nombre} {p.apellido_paterno} {p.apellido_materno}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Tipo de Ausencia *</label>
                                <select
                                    value={formData.tipo_ausencia}
                                    onChange={e => setFormData({ ...formData, tipo_ausencia: e.target.value })}
                                    required
                                >
                                    <option value="PERSONAL">Motivos Personales</option>
                                    <option value="ENFERMEDAD">Enfermedad / Salud</option>
                                    <option value="VACACIONES">Vacaciones</option>
                                    <option value="OTRO">Otro</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Fecha Inicio *</label>
                                <input
                                    type="date"
                                    value={formData.fecha_inicio}
                                    onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Fecha Fin *</label>
                                <input
                                    type="date"
                                    value={formData.fecha_fin}
                                    onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Hora Inicio (Opcional)</label>
                                <input
                                    type="time"
                                    value={formData.hora_inicio}
                                    onChange={e => setFormData({ ...formData, hora_inicio: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Hora Fin (Opcional)</label>
                                <input
                                    type="time"
                                    value={formData.hora_fin}
                                    onChange={e => setFormData({ ...formData, hora_fin: e.target.value })}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Motivo / Detalle *</label>
                                <textarea
                                    rows={3}
                                    value={formData.razon}
                                    onChange={e => setFormData({ ...formData, razon: e.target.value })}
                                    placeholder="Describe el motivo de la solicitud..."
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn-submit" disabled={submitting}>
                                <Icon name={submitting ? 'loader' : 'send'} size={18} />
                                {submitting ? 'Enviando...' : 'Crear Solicitud'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tabs */}
            <div className="permisos-tabs">
                <button
                    className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    Todas {mode === 'admin' && <span className="count">{stats.total}</span>}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'PENDIENTE' ? 'active' : ''}`}
                    onClick={() => setActiveTab('PENDIENTE')}
                >
                    Pendientes {mode === 'admin' && <span className="count">{stats.pending}</span>}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'APROBADA' ? 'active' : ''}`}
                    onClick={() => setActiveTab('APROBADA')}
                >
                    Aprobadas {mode === 'admin' && <span className="count">{stats.approved}</span>}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'DENEGADA' ? 'active' : ''}`}
                    onClick={() => setActiveTab('DENEGADA')}
                >
                    Denegadas {mode === 'admin' && <span className="count">{stats.denied}</span>}
                </button>
            </div>

            {/* Search Results Info */}
            {searchTerm && mode === 'admin' && (
                <div className="search-results-info">
                    Mostrando {filteredSolicitudes.length} resultado(s) para "{searchTerm}"
                </div>
            )}

            {/* List */}
            <div className="permisos-list">
                {filteredSolicitudes.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Icon name="inbox" size={40} color="#9ca3af" />
                        </div>
                        <h3>No hay solicitudes</h3>
                        <p>
                            {searchTerm
                                ? `No se encontraron resultados para "${searchTerm}"`
                                : activeTab === 'all'
                                    ? 'No se encontraron solicitudes de permiso.'
                                    : `No hay solicitudes con estado "${activeTab}".`}
                        </p>
                    </div>
                ) : (
                    filteredSolicitudes.map(solicitud => (
                        <div key={solicitud.id} className={`permiso-card status-${solicitud.estado_solicitud.toLowerCase()}`}>
                            <div className="permiso-card-header">
                                <div className="permiso-card-info">
                                    <span className="permiso-type-badge">
                                        <Icon name={getTypeIcon(solicitud.tipo_ausencia) as any} size={14} />
                                        {solicitud.tipo_ausencia}
                                    </span>
                                    {mode === 'admin' && (
                                        <span className="permiso-user">
                                            <strong>{userNames[solicitud.personal_id] || 'Cargando...'}</strong>
                                            <span className="user-dni">DNI: {userDNIs[solicitud.personal_id]}</span>
                                        </span>
                                    )}
                                    <span className="permiso-request-date">
                                        Solicitud del {formatDate(solicitud.fecha_solicitud)}
                                    </span>
                                </div>
                                <span className={`status-badge ${getStatusBadgeClass(solicitud.estado_solicitud)}`}>
                                    {solicitud.estado_solicitud}
                                </span>
                            </div>

                            <div className="permiso-dates-row">
                                <div className="date-item">
                                    <div className="icon-wrapper">
                                        <Icon name="calendar" size={16} color="#6b7280" />
                                    </div>
                                    <span>
                                        <strong>Desde:</strong> {formatDate(solicitud.fecha_inicio)}
                                        {solicitud.hora_inicio && ` a las ${solicitud.hora_inicio}`}
                                    </span>
                                </div>
                                <span className="date-arrow">→</span>
                                <div className="date-item">
                                    <div className="icon-wrapper">
                                        <Icon name="calendar" size={16} color="#6b7280" />
                                    </div>
                                    <span>
                                        <strong>Hasta:</strong> {formatDate(solicitud.fecha_fin)}
                                        {solicitud.hora_fin && ` a las ${solicitud.hora_fin}`}
                                    </span>
                                </div>
                            </div>

                            <div className="permiso-reason">
                                <label>Motivo</label>
                                <p>{solicitud.razon}</p>
                            </div>

                            {mode === 'admin' && solicitud.estado_solicitud === 'PENDIENTE' && (
                                <div className="admin-actions">
                                    <button
                                        className="btn-approve"
                                        onClick={() => handleStatusUpdate(solicitud.id, 'APROBADA')}
                                    >
                                        <Icon name="check" size={18} />
                                        Aprobar
                                    </button>
                                    <button
                                        className="btn-deny"
                                        onClick={() => handleStatusUpdate(solicitud.id, 'DENEGADA')}
                                    >
                                        <Icon name="x" size={18} />
                                        Denegar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PermisosPage;
