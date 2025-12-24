import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { permisosService } from '../services/permisosService';
import { personalService } from '../services/personalService';
import type { SolicitudAusencia, SolicitudAusenciaCreate } from '../types/permisos';
import Icon from '../components/Icon';
import './PermisosPage.css';

interface PermisosPageProps {
    mode: 'admin' | 'user'; // admin sees all, user sees own
}

const PermisosPage: React.FC<PermisosPageProps> = ({ mode }) => {
    const { user } = useAuth();
    const [solicitudes, setSolicitudes] = useState<SolicitudAusencia[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<SolicitudAusenciaCreate>({
        personal_id: user?.id || '',
        tipo_ausencia: 'PERSONAL',
        fecha_inicio: '',
        fecha_fin: '',
        razon: '',
        hora_inicio: '',
        hora_fin: ''
    });

    // Cache for user names (only relevant for admin view)
    const [userNames, setUserNames] = useState<Record<string, string>>({});

    useEffect(() => {
        loadData();
    }, [mode, user]);

    const loadData = async () => {
        try {
            setLoading(true);
            let data: SolicitudAusencia[] = [];

            if (mode === 'admin') {
                data = await permisosService.getAll();
                // Load names for IDs
                const names: Record<string, string> = {};
                // Optimization: In a real app, backend should include names or we batch fetch.
                // For now, we fetch all personal once if admin
                const allPersonal = await personalService.getAll();
                allPersonal.forEach(p => {
                    names[p.id] = `${p.nombre} ${p.apellido_paterno}`;
                });
                setUserNames(names);

            } else {
                if (user?.id) {
                    data = await permisosService.getByPersonal(user.id);
                }
            }

            // Sort by date desc
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
        if (!user?.id) return;

        try {
            setError(null);
            const payload = { ...formData, personal_id: user.id };
            // Remove empty time strings if not used
            if (!payload.hora_inicio) delete payload.hora_inicio;
            if (!payload.hora_fin) delete payload.hora_fin;

            await permisosService.create(payload);
            setSuccess("Solicitud enviada correctamente");
            setShowForm(false);
            setFormData({
                personal_id: user.id,
                tipo_ausencia: 'PERSONAL',
                fecha_inicio: '',
                fecha_fin: '',
                razon: '',
                hora_inicio: '',
                hora_fin: ''
            });
            loadData();
        } catch (err) {
            console.error(err);
            setError("Error al crear la solicitud");
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        if (!window.confirm(`¿Estás seguro de cambiar el estado a ${newStatus}?`)) return;
        try {
            await permisosService.updateStatus(id, newStatus);
            setSuccess(`Estado actualizado a ${newStatus}`); // Typo fix
            loadData();
        } catch (err) {
            console.error(err);
            setError("Error al actualizar el estado");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APROBADA': return 'success';
            case 'DENEGADA': return 'error';
            case 'PENDIENTE': return 'warning';
            default: return 'neutral';
        }
    };

    if (loading) return <div className="loading">Cargando permisos...</div>;

    return (
        <div className="permisos-page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon name={mode === 'admin' ? "check-square" : "file-text"} size={28} />
                    <h1>{mode === 'admin' ? 'Gestión de Permisos' : 'Mis Permisos'}</h1>
                </div>

                {mode === 'user' && ( // Only users (or admins acting as users) create requests here
                    <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancelar' : '+ Nueva Solicitud'}
                    </button>
                )}
            </div>

            {error && <div className="alert alert-error">{error} <button onClick={() => setError(null)}>x</button></div>}
            {success && <div className="alert alert-success">{success} <button onClick={() => setSuccess(null)}>x</button></div>}

            {showForm && (
                <div className="create-form-card fade-in">
                    <h2>Nueva Solicitud de Permiso</h2>
                    <form onSubmit={handleCreate}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Tipo de Ausencia</label>
                                <select
                                    value={formData.tipo_ausencia}
                                    onChange={e => setFormData({ ...formData, tipo_ausencia: e.target.value })}
                                    className="simple-select"
                                >
                                    <option value="PERSONAL">Motivos Personales</option>
                                    <option value="ENFERMEDAD">Enfermedad / Salud</option>
                                    <option value="VACACIONES">Vacaciones</option>
                                    <option value="OTRO">Otro</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Fecha Inicio</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.fecha_inicio}
                                    onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Fecha Fin</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.fecha_fin}
                                    onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-row">
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
                        </div>

                        <div className="form-group">
                            <label>Razón / Detalle</label>
                            <textarea
                                required
                                rows={3}
                                value={formData.razon}
                                onChange={e => setFormData({ ...formData, razon: e.target.value })}
                                className="simple-textarea"
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary">Enviar Solicitud</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="permisos-list">
                {solicitudes.length === 0 ? (
                    <div className="empty-state">No hay solicitudes registradas.</div>
                ) : (
                    solicitudes.map(solicitud => (
                        <div key={solicitud.id} className={`permiso-card status-${solicitud.estado_solicitud.toLowerCase()}`}>
                            <div className="permiso-header">
                                <div className="permiso-info">
                                    <span className={`permiso-type badge-type`}>
                                        {solicitud.tipo_ausencia}
                                    </span>
                                    {mode === 'admin' && (
                                        <span className="user-name">
                                            Solicitado por: <strong>{userNames[solicitud.personal_id] || 'Cargando...'}</strong>
                                        </span>
                                    )}
                                    <span className="permiso-date">
                                        {new Date(solicitud.fecha_solicitud).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className={`status-badge ${getStatusColor(solicitud.estado_solicitud)}`}>
                                    {solicitud.estado_solicitud}
                                </div>
                            </div>

                            <div className="permiso-dates">
                                <div className="date-block">
                                    <Icon name="calendar" size={16} />
                                    <span>Desde: {new Date(solicitud.fecha_inicio).toLocaleDateString()} {solicitud.hora_inicio && ` ${solicitud.hora_inicio}`}</span>
                                </div>
                                <div className="date-arrow">→</div>
                                <div className="date-block">
                                    <Icon name="calendar" size={16} />
                                    <span>Hasta: {new Date(solicitud.fecha_fin).toLocaleDateString()} {solicitud.hora_fin && ` ${solicitud.hora_fin}`}</span>
                                </div>
                            </div>

                            <div className="permiso-reason">
                                <p><strong>Motivo:</strong> {solicitud.razon}</p>
                            </div>

                            {mode === 'admin' && solicitud.estado_solicitud === 'PENDIENTE' && (
                                <div className="admin-actions">
                                    <button
                                        className="btn-approve"
                                        onClick={() => handleStatusUpdate(solicitud.id, 'APROBADA')}
                                    >
                                        <Icon name="check" size={16} /> Aprobar
                                    </button>
                                    <button
                                        className="btn-deny"
                                        onClick={() => handleStatusUpdate(solicitud.id, 'DENEGADA')}
                                    >
                                        <Icon name="x" size={16} /> Denegar
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
