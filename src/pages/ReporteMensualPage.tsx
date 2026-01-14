import { useState, useEffect } from 'react';
import { reportesService } from '../services/reportesService';
import { personalService } from '../services/personalService';
import type { ReporteMensualItem, PersonalResponseDTO } from '../types';
import Icon from '../components/Icon';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { REPORT_IMAGES } from '../utils/reportImages';
import './ReporteMensualPage.css';

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

export const ReporteMensualPage = () => {
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [personalId, setPersonalId] = useState<string>('');
    const [listaPersonal, setListaPersonal] = useState<PersonalResponseDTO[]>([]);
    const [reporte, setReporte] = useState<ReporteMensualItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        cargarPersonal();
    }, []);

    const cargarPersonal = async () => {
        try {
            const data = await personalService.getAll();
            setListaPersonal(data);
        } catch (err) {
            console.error('Error cargando personal:', err);
        }
    };

    const generarReporte = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await reportesService.getReporteMensual(mes, anio, personalId || undefined);
            setReporte(data);
        } catch (err) {
            console.error('Error generando reporte:', err);
            setError('Ocurrió un error al generar el reporte.');
        } finally {
            setLoading(false);
        }
    };

    const exportarExcel = () => {
        if (reporte.length === 0) return;

        const ws = XLSX.utils.json_to_sheet(reporte.map(item => ({
            "N°": item.numero,
            "DNI": item.dni,
            "Apellidos y Nombres": item.apellidos_y_nombres,
            "Asistencias": item.dias_asistidos,
            "Tardanzas": item.tardanzas,
            "Faltas": item.faltas,
            "Aus. Just.": item.ausencias_justificadas,
            "Sal. Ant.": item.salidas_anticipadas,
            "H. Ext": item.horas_sobretiempo.toFixed(2),
            "H. Trabajadas": item.horas_trabajadas.toFixed(2),
            "Observaciones": item.observaciones
        })));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte");

        const mesNombre = MESES.find(m => m.value === mes)?.label;
        XLSX.writeFile(wb, `Reporte_Asistencia_${mesNombre}_${anio}.xlsx`);
    };

    const exportarPDF = () => {
        if (reporte.length === 0) return;

        const doc = new jsPDF();
        const mesNombre = MESES.find(m => m.value === mes)?.label;

        // --- CABECERA PERSONALIZADA ---
        const pageWidth = doc.internal.pageSize.getWidth();
        const centerX = pageWidth / 2;

        try {
            // 1. Escudo (Izquierda)
            if (REPORT_IMAGES.ESCUDO_PERU) {
                doc.addImage(REPORT_IMAGES.ESCUDO_PERU, 'PNG', 14, 10, 18, 20); // x, y, w, h
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

        // Títulos Centrales (Con más espaciado)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Corte Superior de Justicia de Apurimac", centerX, 35, { align: 'center' });

        doc.setFontSize(12);
        doc.text("Administracion del Modulo Penal de Abancay", centerX, 42, { align: 'center' });

        // Frase "Decenio..."
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.text('"Decenio de la Igualdad de oportunidades para mujeres y hombres"', centerX, 52, { align: 'center' });
        doc.text('"Año de la recuperación y consolidación de la economía peruana"', centerX, 57, { align: 'center' });

        // Lugar y Fecha
        const fechaActual = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0); // Negro
        doc.text(`Abancay, ${fechaActual}`, 14, 68);

        // --- TABLA ---
        const tableColumn = ["N°", "DNI", "Nombres", "Asist", "Tard", "Faltas", "Aus. J", "Sal. A", "H. Ext", "H. Trab", "Obs"];
        const tableRows = reporte.map(item => [
            item.numero,
            item.dni,
            item.apellidos_y_nombres,
            item.dias_asistidos,
            item.tardanzas,
            item.faltas,
            item.ausencias_justificadas,
            item.salidas_anticipadas,
            item.horas_sobretiempo.toFixed(1),
            item.horas_trabajadas.toFixed(1),
            item.observaciones
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 75,
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 3, // Espaciado interno para simular 1.5
                valign: 'middle'
            },
            headStyles: {
                fillColor: [102, 126, 234], // Azulito PJ
                textColor: 255,
                halign: 'center',
                valign: 'middle',
                minCellHeight: 12
            },
            bodyStyles: {
                minCellHeight: 10 // Altura mínima de fila
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 }, // N°
                1: { halign: 'center' }, // DNI
                3: { halign: 'center' }, // Asist
                4: { halign: 'center' }, // Tard
                5: { halign: 'center' }, // Faltas
                6: { halign: 'center' }, // Aus. J
                7: { halign: 'center' }, // Sal. A
                8: { halign: 'center' }, // H. Ext
                9: { halign: 'center' }, // H. Trab
            }
        });

        doc.save(`Reporte_Asistencia_${mesNombre}_${anio}.pdf`);
    };

    return (
        <div className="reporte-page">
            {/* Card de Filtros */}
            <div className="reporte-filters-card">
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>Mes</label>
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
                        />
                    </div>

                    <div className="filter-group">
                        <label>Personal</label>
                        <select value={personalId} onChange={(e) => setPersonalId(e.target.value)}>
                            <option value="">Todos</option>
                            {listaPersonal.length > 0 ? (
                                listaPersonal.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.apellido_paterno} {p.apellido_materno}, {p.nombre}
                                    </option>
                                ))
                            ) : (
                                <option disabled>Cargando personal...</option>
                            )}
                        </select>
                    </div>
                </div>

                <div className="action-buttons-row">
                    <button className="btn-generar" onClick={generarReporte} disabled={loading}>
                        <Icon name={loading ? 'loader' : 'file-text'} size={20} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Generando Reporte...' : 'Generar Reporte'}
                    </button>

                    <div className="export-buttons">
                        <button
                            className="btn-export btn-export-excel"
                            onClick={exportarExcel}
                            disabled={reporte.length === 0 || loading}
                        >
                            <Icon name="download" size={18} />
                            Excel
                        </button>
                        <button
                            className="btn-export btn-export-pdf"
                            onClick={exportarPDF}
                            disabled={reporte.length === 0 || loading}
                        >
                            <Icon name="printer" size={18} />
                            PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="error-alert">
                    <Icon name="alert-circle" size={24} color="#EF4444" />
                    <div>
                        <h4>Error al generar reporte</h4>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {/* Card de Resultados */}
            <div className="reporte-results-card">
                <div className="results-header">
                    <Icon name="bar-chart-2" size={24} color="white" />
                    <h3>Resultados del Reporte</h3>
                </div>

                <div className="reporte-table-container">
                    <table className="reporte-table">
                        <thead>
                            <tr>
                                <th>N°</th>
                                <th>DNI</th>
                                <th>Apellidos y Nombres</th>
                                <th className="center">Asist</th>
                                <th className="center">Tard</th>
                                <th className="center">Faltas</th>
                                <th className="center">Aus. Just</th>
                                <th className="center">Sal. Ant</th>
                                <th className="center">H. Ext</th>
                                <th className="center">H. Trab</th>
                                <th>Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reporte.length > 0 ? (
                                reporte.map((item) => (
                                    <tr key={item.numero}>
                                        <td>{item.numero}</td>
                                        <td className="mono">{item.dni}</td>
                                        <td className="bold">{item.apellidos_y_nombres}</td>
                                        <td className="center">
                                            <span className="badge badge-blue">{item.dias_asistidos}</span>
                                        </td>
                                        <td className="center">
                                            {item.tardanzas > 0 ? (
                                                <span className="badge badge-yellow">{item.tardanzas}</span>
                                            ) : (
                                                <span className="badge-empty">-</span>
                                            )}
                                        </td>
                                        <td className="center">
                                            {item.faltas > 0 ? (
                                                <span className="badge badge-red">{item.faltas}</span>
                                            ) : (
                                                <span className="badge-empty">-</span>
                                            )}
                                        </td>
                                        <td className="center">
                                            {item.ausencias_justificadas > 0 ? (
                                                <span className="badge badge-green">{item.ausencias_justificadas}</span>
                                            ) : (
                                                <span className="badge-empty">-</span>
                                            )}
                                        </td>
                                        <td className="center">
                                            {item.salidas_anticipadas > 0 ? (
                                                <span className="badge badge-orange">{item.salidas_anticipadas}</span>
                                            ) : (
                                                <span className="badge-empty">-</span>
                                            )}
                                        </td>
                                        <td className="center">
                                            {item.horas_sobretiempo > 0 ? (
                                                <span className="badge badge-purple">{item.horas_sobretiempo.toFixed(1)}h</span>
                                            ) : (
                                                <span className="badge-empty">-</span>
                                            )}
                                        </td>
                                        <td className="center">
                                            {item.horas_trabajadas > 0 ? (
                                                <span className="badge badge-blue-light">{item.horas_trabajadas.toFixed(1)}h</span>
                                            ) : (
                                                <span className="badge-empty">-</span>
                                            )}
                                        </td>
                                        <td>{item.observaciones || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin observaciones</span>}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={11}>
                                        <div className="empty-state">
                                            <div className="empty-state-icon">
                                                <Icon name={loading ? 'loader' : 'inbox'} size={40} color="#9CA3AF" className={loading ? 'animate-spin' : ''} />
                                            </div>
                                            <h4>{loading ? 'Generando reporte...' : 'No hay datos disponibles'}</h4>
                                            <p>
                                                {loading
                                                    ? 'Estamos procesando tu solicitud, por favor espera un momento.'
                                                    : 'Selecciona los filtros y haz clic en "Generar Reporte" para visualizar los resultados.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {reporte.length > 0 && (
                    <div className="results-footer">
                        <div className="total">
                            <Icon name="users" size={16} />
                            <span>Total de registros: {reporte.length}</span>
                        </div>
                        <div className="date">
                            Reporte generado el {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
