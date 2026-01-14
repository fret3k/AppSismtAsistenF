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

    // Extra UI state for request form
    const [numeroBoleta, setNumeroBoleta] = useState<string>('');
    const [codigosSeleccionados, setCodigosSeleccionados] = useState<string[]>([]);
    const [employeeSearch, setEmployeeSearch] = useState<string>('');
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState<boolean>(false);

    const CODE_OPTIONS_GENERAL = [
        { code: 'CS', label: 'Comisión de Servicio' },
        { code: 'CGDM', label: 'Descanso Médico' },
        { code: 'CGCM', label: 'Cita Médica' },
        { code: 'SGPP', label: 'Permiso personal o particular' },
        { code: 'CGCO', label: 'Capacitación oficializada' },
        { code: 'CGCNO', label: 'Capacitación No Oficializada' }
    ];

    const CODE_OPTIONS_SPECIAL = [
        { code: 'CGF', label: 'Fallecimiento de Familiar hasta 2do. Grado' },
        { code: 'ACV', label: 'Permiso a cuenta de vacaciones' },
        { code: 'S', label: 'Suspensión' },
        { code: 'L', label: 'Licencia' },
        { code: 'O', label: 'Otros (Detallar)' }
    ];

    const ALL_CODE_OPTIONS = [...CODE_OPTIONS_GENERAL, ...CODE_OPTIONS_SPECIAL];

    const findCodeLabel = (code: string) => ALL_CODE_OPTIONS.find(o => o.code === code)?.label || '';

    const generateBoleta = () => {
        const d = new Date();
        const dateStr = d.toISOString().slice(0,10).replace(/-/g, '');
        return `BOL-${dateStr}-${Math.floor(1000 + Math.random()*9000)}`;
    }

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
            // Pack extra info as JSON into the 'razon' field so backend/database can store it without schema changes
            const extra = {
                motivo: formData.razon,
                numero_boleta: numeroBoleta,
                codigos: codigosSeleccionados
            };

            const payload = {
                ...formData,
                personal_id: personalIdToUse,
                // Replace 'razon' text with a JSON string containing the reason and metadata
                razon: JSON.stringify(extra)
            };

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



    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // When opening the form, prefill boleta and default start date
    useEffect(() => {
        if (showForm) {
            setNumeroBoleta(generateBoleta());
            setFormData(prev => ({ ...prev, fecha_inicio: prev.fecha_inicio || new Date().toISOString().slice(0,10) }));
            setCodigosSeleccionados([]);
            // clear employee search state
            setEmployeeSearch('');
            setSelectedPersonalId('');
        }
    }, [showForm]);

    // Keep employeeSearch in sync when selecting employee (fill display text)
    useEffect(() => {
        if (selectedPersonalId) {
            const p = listaPersonal.find(x => x.id === selectedPersonalId);
            if (p) setEmployeeSearch(`${p.dni} - ${p.nombre} ${p.apellido_paterno}`);
        }
    }, [selectedPersonalId, listaPersonal]);

    const toggleCodigo = (code: string) => {
        setCodigosSeleccionados(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
    };

    // Filter by search term (for admin) — now includes boleta, códigos y motivo
    const getFilteredBySearch = (items: SolicitudAusencia[]) => {
        if (!searchTerm.trim() || mode !== 'admin') return items;

        const term = searchTerm.toLowerCase();
        return items.filter(s => {
            const name = userNames[s.personal_id]?.toLowerCase() || '';
            const dni = userDNIs[s.personal_id]?.toLowerCase() || '';
            const boleta = (s.numero_boleta || '').toLowerCase();
            const codigosStr = (s.codigos || []).join(' ').toLowerCase();
            const razon = (s.razon || '').toLowerCase();
            // also allow searching by code label
            const codeLabels = (s.codigos || []).map(c => findCodeLabel(c).toLowerCase()).join(' ');
            return (
                name.includes(term) ||
                dni.includes(term) ||
                boleta.includes(term) ||
                codigosStr.includes(term) ||
                codeLabels.includes(term) ||
                razon.includes(term)
            );
        });
    };

    const getSearchMatches = (s: SolicitudAusencia) => {
        const term = searchTerm.toLowerCase();
        return {
            nameMatch: (userNames[s.personal_id] || '').toLowerCase().includes(term),
            dniMatch: (userDNIs[s.personal_id] || '').toLowerCase().includes(term),
            boletaMatch: (s.numero_boleta || '').toLowerCase().includes(term),
            codigoMatches: (s.codigos || []).map(c => ({ code: c, match: c.toLowerCase().includes(term) || findCodeLabel(c).toLowerCase().includes(term) })),

            razonMatch: (s.razon || '').toLowerCase().includes(term)
        };
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


            {/* Action Bar */}
            <div className="action-bar">
                {mode === 'admin' && (
                    <div className="search-box">
                        <Icon name="search" size={20} color="#9ca3af" />
                        <input
                            type="text"
                            placeholder="Buscar por DNI o nombre..."
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
                            <div className="form-group">
                                <label>N° Boleta</label>
                                <input type="text" value={numeroBoleta} readOnly onChange={e => setNumeroBoleta(e.target.value)} />
                            </div>

                            {mode === 'admin' && (
                                <>
                                    <div className="form-group">
                                        <label>Buscar</label>
                                        <div className="employee-search">
                                            <input
                                                type="text"
                                                placeholder="DNI o nombre..."
                                                value={employeeSearch}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setEmployeeSearch(val);
                                                    setShowEmployeeDropdown(true);

                                                    // If user types only digits and matches exact DNI, auto-select the employee
                                                    const onlyDigits = /^\d+$/.test(val.trim());
                                                    if (onlyDigits) {
                                                        const found = listaPersonal.find(p => p.dni === val.trim());
                                                        if (found) {
                                                            setSelectedPersonalId(found.id);
                                                            setShowEmployeeDropdown(false);
                                                            setEmployeeSearch(`${found.dni} - ${found.nombre} ${found.apellido_paterno}`);
                                                        }
                                                    } else {
                                                        // if not digits, clear selection while typing names
                                                        setSelectedPersonalId('');
                                                    }
                                                }}
                                                onFocus={() => setShowEmployeeDropdown(true)}
                                                required
                                            />
                                            {showEmployeeDropdown && (
                                                <div className="employee-dropdown">
                                                    {listaPersonal.filter(p => {
                                                        const term = employeeSearch.toLowerCase();
                                                        return p.dni.includes(term) || (`${p.nombre} ${p.apellido_paterno} ${p.apellido_materno}`).toLowerCase().includes(term);
                                                    }).slice(0, 10).map(p => (
                                                        <div key={p.id} className="employee-item" onClick={() => { setSelectedPersonalId(p.id); setShowEmployeeDropdown(false); setEmployeeSearch(`${p.dni} - ${p.nombre} ${p.apellido_paterno}`); }}>
                                                            <strong>{p.dni}</strong> — {p.nombre} {p.apellido_paterno} {p.apellido_materno}
                                                        </div>
                                                    )) || <div className="employee-item empty">No se encontraron resultados</div>}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Apellidos y Nombres</label>
                                        <input type="text" value={userNames[selectedPersonalId] || ''} readOnly />
                                    </div>
                                </>
                            )}

                            {mode !== 'admin' && (
                                <div className="form-group">
                                    <label>Apellidos y Nombres</label>
                                    <input
                                        type="text"
                                        value={`${user?.nombre || ''} ${user?.apellido_paterno || ''} ${user?.apellido_materno || ''}`}
                                        readOnly
                                    />
                                </div>
                            )}



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

                            <div className="form-group full-width">
                                <label>Seleccione Código(s)</label>
                                <div className="codes-grid">
                                    {CODE_OPTIONS_GENERAL.map(opt => (
                                        <label key={opt.code} className="code-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={codigosSeleccionados.includes(opt.code)}
                                                onChange={() => toggleCodigo(opt.code)}
                                            />
                                            <span className="code-label"><strong>{opt.code}</strong> {opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group full-width special-codes-box">
                                <label>Códigos Especiales</label>
                                <div className="codes-grid special">
                                    {CODE_OPTIONS_SPECIAL.map(opt => (
                                        <label key={opt.code} className="code-checkbox special">
                                            <input
                                                type="checkbox"
                                                checked={codigosSeleccionados.includes(opt.code)}
                                                onChange={() => toggleCodigo(opt.code)}
                                            />
                                            <span className="code-label"><strong>{opt.code}</strong> {opt.label}</span>
                                        </label>
                                    ))}
                                </div>
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
                                    {(() => {
                                        const matches = getSearchMatches(solicitud);
                                        return (
                                            <>
                                                {solicitud.numero_boleta && (
                                                    <span className={`boleta-badge ${matches.boletaMatch ? 'highlight' : ''}`}>Boleta: {solicitud.numero_boleta}</span>
                                                )}

                                                {(() => {
                                                    // The API may store codes inside the razon as JSON — handle both cases
                                                    let codes: string[] = solicitud.codigos || [];
                                                    try {
                                                        const parsed = JSON.parse(solicitud.razon || '"{}"');
                                                        if (parsed && parsed.codigos && Array.isArray(parsed.codigos)) {
                                                            codes = parsed.codigos;
                                                        }
                                                    } catch (e) {
                                                        // ignore
                                                    }

                                                    if (codes && codes.length > 0) {
                                                        return (
                                                            <div className="codes-list">
                                                                {codes.map(c => {
                                                                    const codeMatchObj = matches.codigoMatches.find(x => x.code === c);
                                                                    const codeMatch = codeMatchObj?.match;
                                                                    const codeLabel = findCodeLabel(c);
                                                                    return <span key={c} className={`code-pill ${codeMatch ? 'highlight' : ''}`}>{c} — {codeLabel}</span>;
                                                                })}
                                                            </div>
                                                        );
                                                    }

                                                    return <div className="codes-list empty">Sin códigos seleccionados</div>;
                                                })()}

                                                {mode === 'admin' && (
                                                    <span className="permiso-user">
                                                        <strong className={matches.nameMatch ? 'highlight' : ''}>{userNames[solicitud.personal_id] || 'Cargando...'}</strong>
                                                        <span className={`user-dni ${matches.dniMatch ? 'highlight' : ''}`}>DNI: {userDNIs[solicitud.personal_id]}</span>
                                                    </span>
                                                )}
                                            </>
                                        );
                                    })()}
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
                                <p>{(() => {
                                    try {
                                        const parsed = JSON.parse(solicitud.razon || '""');
                                        return parsed.motivo || '';
                                    } catch (e) {
                                        return solicitud.razon || '';
                                    }
                                })()}</p>
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
