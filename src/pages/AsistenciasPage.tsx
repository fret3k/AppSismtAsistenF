import React, { useEffect, useState } from 'react';
import { asistenciaService } from '../services/asistenciaService';
import type { PersonalStatusDTO, HistorialAsistenciaDTO } from '../types';
import Icon from '../components/Icon';
import './AsistenciasPage.css';
import * as XLSX from 'xlsx';

const AsistenciasPage: React.FC = () => {
    // --- State ---
    const [activeTab, setActiveTab] = useState<'control' | 'historial'>('control');
    const [loading, setLoading] = useState(false);
    const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Control Diario Data
    const [personalStatuses, setPersonalStatuses] = useState<PersonalStatusDTO[]>([]);
    const [selectedPersonalId, setSelectedPersonalId] = useState<string | null>(null);
    const [filterText, setFilterText] = useState('');

    // Historial Data
    const [history, setHistory] = useState<HistorialAsistenciaDTO[]>([]);
    const [histStartDate, setHistStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [histEndDate, setHistEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [histUnknownFilter, setHistUnknownFilter] = useState(''); // Text filter for history table if server filter fails or supplements it

    // --- Effects ---

    // Load Data on Tab/Date change
    useEffect(() => {
        if (activeTab === 'control') {
            loadControlData();
        } else {
            loadHistoryData();
        }
    }, [activeTab, currentDate, histStartDate, histEndDate]);

    const loadControlData = async () => {
        setLoading(true);
        try {
            const statuses = await asistenciaService.getPersonalStatus(currentDate);
            setPersonalStatuses(statuses);
        } catch (error) {
            console.error("Error loading control data:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadHistoryData = async () => {
        setLoading(true);
        try {
            const hist = await asistenciaService.getHistorial(histStartDate, histEndDate);
            setHistory(hist);
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const exportToExcel = () => {
        const dataToExport = activeTab === 'control'
            ? personalStatuses.map(p => ({
                DNI: p.dni,
                Nombre: p.nombre_completo,
                Estado: p.estado_dia,
                Ultima_Marca: p.ultima_marcacion ? new Date(p.ultima_marcacion).toLocaleTimeString() : '-',
                Horas_Trabajadas: p.horas_trabajadas
            }))
            : history.map(h => ({
                Fecha: h.fecha,
                Hora: new Date(h.marca_tiempo).toLocaleTimeString(),
                Personal: h.nombre_personal,
                DNI: h.dni,
                Tipo: h.tipo_registro,
                Estado: h.estado,
                Motivo: h.motivo || ''
            }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte");
        XLSX.writeFile(wb, `Reporte_Asistencias_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // --- Render Helpers ---

    const filteredStatuses = personalStatuses.filter(p =>
        p.nombre_completo.toLowerCase().includes(filterText.toLowerCase()) ||
        p.dni.includes(filterText)
    );

    const selectedPerson = personalStatuses.find(p => p.id === selectedPersonalId);

    return (
        <div className="asistencia-page">
            <div className="page-header-premium">
                <div className="header-info">
                    <h1>Registro y Control</h1>
                    <p className="subtitle">Gestión y monitoreo de asistencia del personal</p>
                </div>
                <div className="header-actions">
                    <div className="tabs-premium">
                        <button
                            className={`tab-btn ${activeTab === 'control' ? 'active' : ''}`}
                            onClick={() => setActiveTab('control')}
                        >
                            <Icon name="activity" size={20} />
                            <span>Panel de Control</span>
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
                            onClick={() => setActiveTab('historial')}
                        >
                            <Icon name="clock" size={20} />
                            <span>Historial Completo</span>
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'control' && (
                <>
                    <div className="control-layout-premium">
                        <div className="list-panel-premium">
                            <div className="panel-header-top">
                                <div className="date-picker-area">
                                    <div className="input-with-icon">
                                        <Icon name="calendar" size={16} />
                                        <input
                                            type="date"
                                            value={currentDate}
                                            onChange={(e) => setCurrentDate(e.target.value)}
                                        />
                                    </div>
                                    <button className="btn-today-minimal" onClick={() => setCurrentDate(new Date().toISOString().split('T')[0])}>
                                        Hoy
                                    </button>
                                </div>
                                <div className="search-bar-premium">
                                    <Icon name="search" size={18} />
                                    <input
                                        type="text"
                                        placeholder="DNI o nombres..."
                                        value={filterText}
                                        onChange={(e) => setFilterText(e.target.value)}
                                    />
                                    {filterText && (
                                        <button className="clear-search" onClick={() => setFilterText('')}>
                                            <Icon name="x" size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="personal-list-premium">
                                {loading && personalStatuses.length === 0 ? (
                                    <div className="loading-state-simple">
                                        <div className="spinner"></div>
                                        <span>Cargando reportes...</span>
                                    </div>
                                ) : filteredStatuses.length > 0 ? (
                                    filteredStatuses.map(p => (
                                        <div
                                            key={p.id}
                                            className={`personal-card-item ${selectedPersonalId === p.id ? 'active' : ''}`}
                                            onClick={() => setSelectedPersonalId(p.id)}
                                        >
                                            <div className="p-avatar">
                                                {p.nombre_completo.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="p-content">
                                                <div className="p-main-info">
                                                    <h4>{p.nombre_completo}</h4>
                                                    <span className="p-dni-tag">{p.dni}</span>
                                                </div>
                                                <div className="p-status-area">
                                                    <span className={`p-pill ${p.estado_dia.toLowerCase()}`}>
                                                        {p.estado_dia}
                                                    </span>
                                                    {p.ultima_marcacion && (
                                                        <span className="p-time-tag">
                                                            <Icon name="clock" size={10} />
                                                            {new Date(p.ultima_marcacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-chevron">
                                                <Icon name="chevron-right" size={18} />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-results-state">
                                        <Icon name="search" size={40} />
                                        <p>No se encontraron coincidencias para "{filterText}"</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="detail-panel-premium">
                            {selectedPerson ? (
                                <div className="detail-card-premium">
                                    <div className="detail-header">
                                        <div className="detail-avatar-large">
                                            {selectedPerson.nombre_completo.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="detail-title-info">
                                            <h2>{selectedPerson.nombre_completo}</h2>
                                            <span className="detail-dni-subtitle">Documento Nacional de Identidad: <strong>{selectedPerson.dni}</strong></span>
                                        </div>
                                    </div>

                                    <div className="detail-stats-row">
                                        <div className="d-stat-box">
                                            <span className="d-stat-label">Estado del Día</span>
                                            <span className={`p-pill large ${selectedPerson.estado_dia.toLowerCase()}`}>
                                                {selectedPerson.estado_dia}
                                            </span>
                                        </div>
                                        <div className="d-stat-box">
                                            <span className="d-stat-label">Horas Trabajadas</span>
                                            <span className="d-stat-value">{selectedPerson.horas_trabajadas || '0.0h'}</span>
                                        </div>
                                    </div>

                                    <div className="daily-timeline">
                                        <div className="timeline-header">
                                            <h3><Icon name="list" size={18} /> Historial del Día</h3>
                                            <span className="date-tag">{currentDate}</span>
                                        </div>
                                        <div className="timeline-list">
                                            {selectedPerson.registros?.length > 0 ? (
                                                selectedPerson.registros.sort((a, b) => new Date(a.marca_tiempo).getTime() - new Date(b.marca_tiempo).getTime()).map((r: any, idx) => (
                                                    <div key={idx} className="timeline-item-premium">
                                                        <div className="t-time">
                                                            {new Date(r.marca_tiempo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <div className="t-marker">
                                                            <div className={`t-dot ${r.estado === 'TARDE' ? 'warning' : 'success'}`}></div>
                                                            <div className="t-line"></div>
                                                        </div>
                                                        <div className="t-content">
                                                            <div className="t-type">{r.tipo_registro.replace('_', ' ')}</div>
                                                            <div className={`t-status-text ${r.estado.toLowerCase()}`}>
                                                                {r.estado}
                                                            </div>
                                                            {r.motivo && <div className="t-motive">"{r.motivo}"</div>}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="timeline-empty">
                                                    <Icon name="calendar" size={32} />
                                                    <p>Sin registros detectados para este día.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="detail-footer-actions">
                                        <button className="btn-secondary-outline">
                                            <Icon name="user" size={16} /> Ver Perfil Completo
                                        </button>
                                        <button className="btn-secondary-outline" onClick={exportToExcel}>
                                            <Icon name="download" size={16} /> Exportar Reporte
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="empty-detail-state">
                                    <div className="empty-illustration">
                                        <div className="pulse-circle"></div>
                                        <Icon name="target" size={48} />
                                    </div>
                                    <h3>Seleccione un registro</h3>
                                    <p>Haga clic en un empleado de la lista para visualizar su actividad detallada y estadísticas del día.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'historial' && (
                <div className="historial-layout-premium">
                    <div className="historial-filters-premium">
                        <div className="filter-group">
                            <label><Icon name="filter" size={14} /> Rango de Fechas</label>
                            <div className="date-range-inputs">
                                <input type="date" value={histStartDate} onChange={e => setHistStartDate(e.target.value)} />
                                <span className="range-sep">-</span>
                                <input type="date" value={histEndDate} onChange={e => setHistEndDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="filter-group flex-1">
                            <label><Icon name="search" size={14} /> Búsqueda Rápida</label>
                            <div className="search-input-wrapper">
                                <input
                                    type="text"
                                    placeholder="DNI o nombres..."
                                    value={histUnknownFilter}
                                    onChange={(e) => setHistUnknownFilter(e.target.value)}
                                />
                            </div>
                        </div>
                        <button className="btn-premium-export" onClick={exportToExcel}>
                            <Icon name="file-text" size={18} />
                            <span>Exportar Excel</span>
                        </button>
                    </div>

                    <div className="table-wrapper-premium">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Hora</th>
                                    <th>Nombres</th>
                                    <th>DNI</th>
                                    <th>Tipo de Registro</th>
                                    <th>Estado de Marcación</th>
                                    <th>Observaciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7}>
                                            <div className="table-loading">
                                                <div className="spinner"></div>
                                                <span>Sincronizando registros...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : history.length > 0 ? (
                                    history.filter(h =>
                                        h.nombre_personal.toLowerCase().includes(histUnknownFilter.toLowerCase()) ||
                                        h.dni.includes(histUnknownFilter)
                                    ).map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="w-120">{row.fecha}</td>
                                            <td className="w-100 font-mono">{new Date(row.marca_tiempo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="font-semibold">{row.nombre_personal}</td>
                                            <td className="text-secondary">{row.dni}</td>
                                            <td>
                                                <span className={`type-tag ${row.tipo_registro.toLowerCase()}`}>
                                                    {row.tipo_registro.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-pill-premium ${row.estado.replace(/\s+/g, '_').toLowerCase()}`}>
                                                    {row.estado}
                                                </span>
                                            </td>
                                            <td className="text-italic">{row.motivo || '-'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7}>
                                            <div className="table-empty-state">
                                                <Icon name="database" size={40} />
                                                <p>No se encontraron registros de asistencia en el periodo seleccionado.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AsistenciasPage;
