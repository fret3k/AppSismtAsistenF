import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { permisosService } from '../services/permisosService';
import { personalService } from '../services/personalService';
import type { SolicitudAusencia, SolicitudAusenciaCreate } from '../types/permisos';
import type { PersonalResponseDTO } from '../types';
import Icon from '../components/Icon';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { REPORT_IMAGES } from '../utils/reportImages';
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
    const [dependencia, setDependencia] = useState<string>('');
    const [cargo, setCargo] = useState<string>('');
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
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}${m}${day}`;
        return `BOL-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const getSolicitudMeta = (s: SolicitudAusencia) => {
        try {
            const parsed = JSON.parse(s.razon || '{}');
            // If parsing succeeds, we expect an object. If s.razon was just a string, JSON.parse might return it as string or number (unlikely if we control save).
            // But let's be safe.
            if (typeof parsed !== 'object' || parsed === null) throw new Error();
            return {
                numero_boleta: (s.numero_boleta || parsed.numero_boleta || '').toString(),
                codigos: (s.codigos || parsed.codigos || []) as string[],
                dependencia: (parsed.dependencia || '') as string,
                cargo: (parsed.cargo || '') as string,
                motivo: (parsed.motivo || s.razon || '') as string
            };
        } catch {
            return {
                numero_boleta: s.numero_boleta || '',
                codigos: s.codigos || [],
                dependencia: '',
                cargo: '',
                motivo: s.razon || ''
            };
        }
    };

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

        // Validar que se haya seleccionado al menos un código
        if (codigosSeleccionados.length === 0) {
            setError("Debe seleccionar un código");
            return;
        }

        // Validar que se haya seleccionado dependencia
        if (!dependencia) {
            setError("Debe seleccionar una dependencia");
            return;
        }

        // Validar que se haya seleccionado cargo
        if (!cargo) {
            setError("Debe seleccionar un cargo");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            // Pack extra info as JSON into the 'razon' field so backend/database can store it without schema changes
            const extra = {
                motivo: formData.razon ? ` ${formData.razon.trim()}` : ' ',
                numero_boleta: numeroBoleta,
                codigos: codigosSeleccionados,
                dependencia: dependencia,
                cargo: cargo
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
        if (!dateStr) return '';
        // Si es una cadena YYYY-MM-DD, tratarla como local para evitar el desfase UTC
        if (dateStr.length === 10 && dateStr.includes('-')) {
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        }
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Función para exportar a PDF
    const exportarPDF = () => {
        if (filteredSolicitudes.length === 0) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const centerX = pageWidth / 2;

        try {
            // 1. Escudo (Izquierda)
            if (REPORT_IMAGES.ESCUDO_PERU) {
                doc.addImage(REPORT_IMAGES.ESCUDO_PERU, 'PNG', 14, 10, 18, 20);
            }

            // 2. Logo PJ (Centro - Arriba)
            if (REPORT_IMAGES.LOGO_PJ) {
                doc.addImage(REPORT_IMAGES.LOGO_PJ, 'PNG', centerX - 10, 8, 20, 18);
            }

            // 3. Logo Bicentenario (Derecha)
            if (REPORT_IMAGES.LOGO_BICENTENARIO) {
                doc.addImage(REPORT_IMAGES.LOGO_BICENTENARIO, 'PNG', pageWidth - 40, 10, 25, 12);
            }
        } catch (error) {
            console.error("Error adding images to PDF:", error);
        }

        // Títulos Centrales
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Corte Superior de Justicia de Apurímac", centerX, 35, { align: 'center' });

        doc.setFontSize(12);
        doc.text("Administración del Módulo Penal de Abancay", centerX, 42, { align: 'center' });

        // Frase "Decenio..."
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.text('"Decenio de la Igualdad de oportunidades para mujeres y hombres"', centerX, 52, { align: 'center' });
        doc.text('"Año de la recuperación y consolidación de la economía peruana"', centerX, 57, { align: 'center' });

        // Título del reporte
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0);
        const tituloReporte = mode === 'admin' ? 'REPORTE DE GESTIÓN DE PERMISOS' : 'MIS SOLICITUDES DE PERMISOS';
        doc.text(tituloReporte, centerX, 68, { align: 'center' });

        // Lugar y Fecha
        const fechaActual = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(`Abancay, ${fechaActual}`, 14, 78);

        // Tabla
        const tableColumn = mode === 'admin'
            ? ["N°", "Boleta", "DNI", "Nombres", "Códigos", "Estado", "Fecha Sol."]
            : ["N°", "Boleta", "Códigos", "Motivo", "Estado", "Fecha Sol."];

        const tableRows = filteredSolicitudes.map((item, index) => {
            const meta = getSolicitudMeta(item);
            if (mode === 'admin') {
                return [
                    index + 1,
                    meta.numero_boleta || '-',
                    userDNIs[item.personal_id] || '-',
                    userNames[item.personal_id] || '-',
                    meta.codigos.join(', ') || '-',
                    item.estado_solicitud,
                    formatDate(item.fecha_solicitud)
                ];
            } else {
                return [
                    index + 1,
                    meta.numero_boleta || '-',
                    meta.codigos.join(', ') || '-',
                    meta.motivo.substring(0, 30) + (meta.motivo.length > 30 ? '...' : ''),
                    item.estado_solicitud,
                    formatDate(item.fecha_solicitud)
                ];
            }
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 85,
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 3,
                valign: 'middle'
            },
            headStyles: {
                fillColor: [102, 126, 234],
                textColor: 255,
                halign: 'center',
                valign: 'middle',
                minCellHeight: 12
            },
            bodyStyles: {
                minCellHeight: 10
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                4: { halign: 'center' },
                5: { halign: 'center' },
                6: { halign: 'center' },
            }
        });

        const estadoFiltro = activeTab === 'all' ? 'Todos' : activeTab;
        doc.save(`Reporte_Permisos_${estadoFiltro}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // When opening the form, prefill boleta and default dates automatically
    useEffect(() => {
        if (showForm) {
            const d = new Date();
            const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            setNumeroBoleta(generateBoleta());
            setDependencia('');
            setCargo('');
            // Establecer fechas automáticamente como hoy
            setFormData(prev => ({
                ...prev,
                fecha_inicio: today,
                fecha_fin: today
            }));
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
        setCodigosSeleccionados([code]);
    };

    // Filter by search term (for admin) — now includes boleta, códigos y motivo
    const getFilteredBySearch = (items: SolicitudAusencia[]) => {
        if (!searchTerm.trim() || mode !== 'admin') return items;

        const term = searchTerm.toLowerCase();
        return items.filter(s => {
            const meta = getSolicitudMeta(s);
            const name = userNames[s.personal_id]?.toLowerCase() || '';
            const dni = userDNIs[s.personal_id]?.toLowerCase() || '';
            const boleta = meta.numero_boleta.toLowerCase();
            const codigosStr = meta.codigos.join(' ').toLowerCase();
            const razon = meta.motivo.toLowerCase();
            // also allow searching by code label
            const codeLabels = meta.codigos.map(c => findCodeLabel(c).toLowerCase()).join(' ');
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
        const meta = getSolicitudMeta(s);
        return {
            nameMatch: (userNames[s.personal_id] || '').toLowerCase().includes(term),
            dniMatch: (userDNIs[s.personal_id] || '').toLowerCase().includes(term),
            boletaMatch: meta.numero_boleta.toLowerCase().includes(term),
            codigoMatches: meta.codigos.map(c => ({ code: c, match: c.toLowerCase().includes(term) || findCodeLabel(c).toLowerCase().includes(term) })),
            razonMatch: meta.motivo.toLowerCase().includes(term)
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


            {/* Last Approved Permission Notification */}
            {solicitudes.length > 0 && solicitudes[0].estado_solicitud === 'APROBADA' && (
                <div className="alert alert-info">
                    <Icon name="check-circle" size={20} />
                    <span>
                        Tu última solicitud del <strong>{formatDate(solicitudes[0].fecha_solicitud)}</strong> fue <strong>APROBADA</strong>.
                        Motivo: <strong>{getSolicitudMeta(solicitudes[0]).motivo}</strong>.
                    </span>
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

                <button
                    className="btn-export-pdf"
                    onClick={exportarPDF}
                    disabled={filteredSolicitudes.length === 0}
                    title="Exportar lista a PDF"
                >
                    <Icon name="printer" size={20} />
                    PDF
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
                                <div className="form-group full-width">
                                    <label>Buscar Empleado *</label>
                                    <div className="employee-search">
                                        <input
                                            type="text"
                                            placeholder="DNI o nombre..."
                                            value={employeeSearch}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setEmployeeSearch(val);
                                                setShowEmployeeDropdown(true);

                                                const onlyDigits = /^\d+$/.test(val.trim());
                                                if (onlyDigits) {
                                                    const found = listaPersonal.find(p => p.dni === val.trim());
                                                    if (found) {
                                                        setSelectedPersonalId(found.id);
                                                        setShowEmployeeDropdown(false);
                                                        setEmployeeSearch(`${found.dni} - ${found.nombre} ${found.apellido_paterno}`);
                                                    }
                                                } else {
                                                    setSelectedPersonalId('');
                                                }
                                            }}
                                            onFocus={() => setShowEmployeeDropdown(true)}
                                            required={mode === 'admin'}
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
                            )}

                            <div className="form-group">
                                <label>N° Boleta</label>
                                <input type="text" value={numeroBoleta} readOnly onChange={e => setNumeroBoleta(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Dependencia *</label>
                                <select
                                    value={dependencia}
                                    onChange={e => setDependencia(e.target.value)}
                                    required
                                >
                                    <option value="">(Seleccionar)</option>
                                    <option value="CIVIL">CIVIL</option>
                                    <option value="EXTINCIÓN DE DOMINIO">EXTINCIÓN DE DOMINIO</option>
                                    <option value="FAMILIA CIVIL">FAMILIA CIVIL</option>
                                    <option value="FAMILIA PENAL">FAMILIA PENAL</option>
                                    <option value="FAMILIA TUTELAR">FAMILIA TUTELAR</option>
                                    <option value="LABORAL">LABORAL</option>
                                    <option value="PENAL">PENAL</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Cargo *</label>
                                <select
                                    value={cargo}
                                    onChange={e => setCargo(e.target.value)}
                                    required
                                >
                                    <option value="">(Seleccionar)</option>
                                    <option value="Juez de Investigación Preparatoria">Juez de Investigación Preparatoria</option>
                                    <option value="Juez Penal Unipersonal">Juez Penal Unipersonal</option>
                                    <option value="Jueces del Juzgado Penal Colegiado">Jueces del Juzgado Penal Colegiado</option>
                                    <option value="Jueces de la Sala Penal de Apelaciones">Jueces de la Sala Penal de Apelaciones</option>
                                    <option value="Administrador del Módulo Penal">Administrador del Módulo Penal</option>
                                    <option value="Coordinador de Audiencias">Coordinador de Audiencias</option>
                                    <option value="Especialista Judicial de Juzgado (Causa)">Especialista Judicial de Juzgado (Causa)</option>
                                    <option value="Especialista Judicial de Audiencia">Especialista Judicial de Audiencia</option>
                                    <option value="Asistente Administrativo">Asistente Administrativo</option>
                                    <option value="Asistente de Comunicaciones">Asistente de Comunicaciones</option>
                                    <option value="Asistente de Custodia y Archivo">Asistente de Custodia y Archivo</option>
                                    <option value="Especialista de Informática (Sistemas)">Especialista de Informática (Sistemas)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Apellidos y Nombres</label>
                                <input
                                    type="text"
                                    value={mode === 'admin' ? (userNames[selectedPersonalId] || '') : `${user?.nombre || ''} ${user?.apellido_paterno || ''} ${user?.apellido_materno || ''}`}
                                    readOnly
                                />
                            </div>

                            {/* Fechas se establecen automáticamente */}
                            <div className="form-group full-width">
                                <div className="auto-date-notice">
                                    <Icon name="info" size={16} />
                                    <span>Fecha de solicitud: <strong>{formData.fecha_inicio || new Date().toLocaleDateString('es-PE')}</strong> (automática)</span>
                                </div>
                            </div>


                            <div className="form-group full-width">
                                <label>Seleccione Código *</label>
                                <div className="codes-grid">
                                    {CODE_OPTIONS_GENERAL.map(opt => (
                                        <label key={opt.code} className="code-checkbox">
                                            <input
                                                type="radio"
                                                name="codigo-general"
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
                                                type="radio"
                                                name="codigo-general"
                                                checked={codigosSeleccionados.includes(opt.code)}
                                                onChange={() => toggleCodigo(opt.code)}
                                            />
                                            <span className="code-label"><strong>{opt.code}</strong> {opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label>Motivo o Detalle Adicional (opcional)</label>
                                <textarea
                                    rows={3}
                                    value={formData.razon}
                                    onChange={e => setFormData({ ...formData, razon: e.target.value })}
                                    placeholder="Describa el motivo o agregue detalles adicionales..."
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
                </div >
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
            {
                searchTerm && mode === 'admin' && (
                    <div className="search-results-info">
                        Mostrando {filteredSolicitudes.length} resultado(s) para "{searchTerm}"
                    </div>
                )
            }

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
                    filteredSolicitudes.map(solicitud => {
                        const meta = getSolicitudMeta(solicitud);
                        const matches = getSearchMatches(solicitud);

                        return (
                            <div key={solicitud.id} className={`permiso-card status-${solicitud.estado_solicitud.toLowerCase()}`}>
                                <div className="permiso-card-header">
                                    <div className="permiso-card-info">
                                        {meta.numero_boleta && (
                                            <span className={`boleta-badge ${matches.boletaMatch ? 'highlight' : ''}`}>Boleta: {meta.numero_boleta}</span>
                                        )}

                                        {meta.codigos.length > 0 ? (
                                            <div className="codes-list">
                                                {meta.codigos.map(c => {
                                                    const codeMatchObj = matches.codigoMatches.find(x => x.code === c);
                                                    const codeMatch = codeMatchObj?.match;
                                                    const codeLabel = findCodeLabel(c);
                                                    return <span key={c} className={`code-pill ${codeMatch ? 'highlight' : ''}`}>{c} — {codeLabel}</span>;
                                                })}
                                            </div>
                                        ) : (
                                            <div className="codes-list empty">Sin códigos seleccionados</div>
                                        )}

                                        {mode === 'admin' && (
                                            <span className="permiso-user">
                                                <strong className={matches.nameMatch ? 'highlight' : ''}>{userNames[solicitud.personal_id] || 'Cargando...'}</strong>
                                                <span className={`user-dni ${matches.dniMatch ? 'highlight' : ''}`}>DNI: {userDNIs[solicitud.personal_id]}</span>
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
                                    <p><strong>Dependencia:</strong> {meta.dependencia || 'No especificada'}</p>
                                    <p><strong>Cargo:</strong> {meta.cargo || 'No especificado'}</p>
                                    <label>Motivo</label>
                                    <p>{meta.motivo}</p>
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
                        );
                    })
                )}
            </div>
        </div >
    );
};

export default PermisosPage;
