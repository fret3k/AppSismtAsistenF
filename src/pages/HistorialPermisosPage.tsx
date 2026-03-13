import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { permisosService } from '../services/permisosService';
import type { SolicitudAusencia } from '../types/permisos';
import Icon from '../components/Icon';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { REPORT_IMAGES } from '../utils/reportImages';
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
        if (!dateStr) return '';
        // Si es una cadena YYYY-MM-DD, tratarla como local para evitar el desfase UTC
        if (dateStr.length === 10 && dateStr.includes('-')) {
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
        return new Date(dateStr).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const calculateHoursNumeric = (s: SolicitudAusencia): number => {
        if (s.hora_inicio && s.hora_fin) {
            try {
                const [h1, m1] = s.hora_inicio.split(':').map(Number);
                const [h2, m2] = s.hora_fin.split(':').map(Number);
                const totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);
                return Math.max(0, totalMins / 60);
            } catch (e) {
                console.error("Error calculating hours", e);
                return 0;
            }
        }

        // Si no hay horas, calcular por días (asumiendo 8h por día)
        try {
            const [y1, m1, d1] = s.fecha_inicio.split('-').map(Number);
            const [y2, m2, d2] = s.fecha_fin.split('-').map(Number);
            const start = new Date(y1, m1 - 1, d1);
            const end = new Date(y2, m2 - 1, d2);
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return diffDays * 8;
        } catch {
            return 0;
        }
    };

    const calculateHours = (s: SolicitudAusencia): string => {
        if (s.hora_inicio && s.hora_fin) {
            try {
                const [h1, m1] = s.hora_inicio.split(':').map(Number);
                const [h2, m2] = s.hora_fin.split(':').map(Number);
                const totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);
                const mins = Math.max(0, totalMins);
                const hours = Math.floor(mins / 60);
                const remainingMins = mins % 60;
                return `${hours}h ${remainingMins}m`;
            } catch (e) {
                console.error("Error calculating hours", e);
                return '0h 0m';
            }
        }

        // Si no hay horas, calcular por días (asumiendo 8h por día)
        try {
            const [y1, m1, d1] = s.fecha_inicio.split('-').map(Number);
            const [y2, m2, d2] = s.fecha_fin.split('-').map(Number);
            const start = new Date(y1, m1 - 1, d1);
            const end = new Date(y2, m2 - 1, d2);
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const totalHours = diffDays * 8;
            return `${totalHours}h 0m`;
        } catch {
            return '0h 0m';
        }
    };

    // Filtrar solicitudes
    const filteredSolicitudes = solicitudes.filter(s => {
        if (filterStatus !== 'all' && s.estado_solicitud !== filterStatus) return false;
        if (filterMonth) {
            const d = new Date(s.fecha_solicitud);
            const solicitudMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
        totalHoras: solicitudes
            .filter(s => s.estado_solicitud === 'APROBADA')
            .reduce((acc, s) => acc + calculateHoursNumeric(s), 0)
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
        doc.text('HISTORIAL DE PERMISOS', centerX, 68, { align: 'center' });

        // Información del usuario
        const nombreUsuario = user ? `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno}` : '';
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Empleado: ${nombreUsuario}`, 14, 78);

        // Lugar y Fecha
        const fechaActual = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.text(`Fecha de generación: ${fechaActual}`, 14, 84);

        // Tabla
        const tableColumn = ["N°", "Boleta", "Códigos", "Motivo", "Estado", "Horas", "Fecha Sol."];

        const tableRows = filteredSolicitudes.map((item, index) => {
            const meta = getSolicitudMeta(item);
            return [
                index + 1,
                meta.numero_boleta || '-',
                meta.codigos.join(', ') || '-',
                meta.motivo.substring(0, 25) + (meta.motivo.length > 25 ? '...' : ''),
                item.estado_solicitud,
                calculateHours(item),
                formatDate(item.fecha_solicitud)
            ];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 92,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 2,
                valign: 'middle'
            },
            headStyles: {
                fillColor: [102, 126, 234],
                textColor: 255,
                halign: 'center',
                valign: 'middle',
                minCellHeight: 10
            },
            bodyStyles: {
                minCellHeight: 8
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                4: { halign: 'center' },
                5: { halign: 'center' },
                6: { halign: 'center' },
            }
        });

        // Resumen al final
        const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 200;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`Total de solicitudes: ${filteredSolicitudes.length}`, 14, finalY + 10);
        doc.text(`Total horas aprobadas: ${stats.totalHoras.toFixed(1)}h`, 14, finalY + 16);

        doc.save(`Historial_Permisos_${user?.dni || 'usuario'}_${new Date().toISOString().split('T')[0]}.pdf`);
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
                <div className="stat-item hours">
                    <Icon name="watch" size={18} />
                    <span>{stats.totalHoras.toFixed(1)} Horas Acum.</span>
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

                <button
                    className="btn-export-pdf"
                    onClick={exportarPDF}
                    disabled={filteredSolicitudes.length === 0}
                    title="Exportar historial a PDF"
                >
                    <Icon name="printer" size={18} />
                    PDF
                </button>
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
                                <th>TIEMPO DE AUSENCIA</th>
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
                                        <td>{calculateHours(solicitud)}</td>
                                        <td className="codes-cell">
                                            {meta.codigos && meta.codigos.length > 0 ? (
                                                meta.codigos.map(code => (
                                                    <span key={code} className="code-tag" title={findCodeLabel(code)}>
                                                        {code}
                                                    </span>
                                                ))
                                            ) : (
                                                // Try to guess code from motivo if direct string match (fallback)
                                                ((() => {
                                                    const match = CODE_OPTIONS.find(o => o.label === meta.motivo);
                                                    return match ? (
                                                        <span className="code-tag" title={match.label}>{match.code}</span>
                                                    ) : (
                                                        <span className="no-code">-</span>
                                                    );
                                                })())
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
