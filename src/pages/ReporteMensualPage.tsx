import { useState, useEffect } from 'react';
import { reportesService } from '../services/reportesService';
import { personalService } from '../services/personalService';
import type { ReporteMensualItem, PersonalResponseDTO } from '../types';
import Icon from '../components/Icon';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
            "Días Lab.": item.dias_laborables,
            "Asistencias": item.dias_asistidos,
            "Tardanzas": item.tardanzas,
            "Faltas": item.faltas,
            "Aus. Just.": item.ausencias_justificadas,
            "Sal. Ant.": item.salidas_anticipadas,
            "H. Extra": item.horas_sobretiempo,
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

        doc.setFontSize(18);
        doc.text("Reporte General de Asistencia", 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Mes: ${mesNombre}`, 14, 32);
        doc.text(`Año: ${anio}`, 14, 38);
        doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 44);

        const tableColumn = ["N°", "DNI", "Nombres", "D. Lab", "Asist", "Tard", "Faltas", "Aus. J", "Sal. A", "H. Ext", "Obs"];
        const tableRows = reporte.map(item => [
            item.numero,
            item.dni,
            item.apellidos_y_nombres,
            item.dias_laborables,
            item.dias_asistidos,
            item.tardanzas,
            item.faltas,
            item.ausencias_justificadas,
            item.salidas_anticipadas,
            item.horas_sobretiempo.toFixed(1),
            item.observaciones
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [102, 126, 234] }
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
                                <th className="center">D. Lab</th>
                                <th className="center">Asist</th>
                                <th className="center">Tard</th>
                                <th className="center">Faltas</th>
                                <th className="center">Aus. Just</th>
                                <th className="center">Sal. Ant</th>
                                <th className="center">H. Ext</th>
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
                                        <td className="center">{item.dias_laborables}</td>
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
