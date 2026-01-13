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

    // Marking Panel State
    const [currentTime, setCurrentTime] = useState(new Date());
    const [motivo, setMotivo] = useState('');
    const [markingMessage, setMarkingMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Historial Data
    const [history, setHistory] = useState<HistorialAsistenciaDTO[]>([]);
    const [histStartDate, setHistStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [histEndDate, setHistEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [histUnknownFilter, setHistUnknownFilter] = useState(''); // Text filter for history table if server filter fails or supplements it

    // --- Effects ---

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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

    const handleMarking = async (tipo: 'ENTRADA_M' | 'SALIDA_M' | 'ENTRADA_T' | 'SALIDA_T') => {
        if (!selectedPersonalId) return;
        setMarkingMessage(null);
        try {
            await asistenciaService.registrarManual({
                personal_id: selectedPersonalId,
                reconocimiento_valido: false, // Manual
                tipo_registro: tipo,
                motivo: motivo || undefined,
                marca_tiempo: new Date().toISOString()
            });
            setMarkingMessage({ type: 'success', text: 'Marcación registrada correctamente.' });
            loadControlData(); // Refresh list
            setMotivo('');
        } catch (error: any) {
            const msg = error.detail || "Error al registrar asistencia";
            setMarkingMessage({ type: 'error', text: typeof msg === 'string' ? msg : JSON.stringify(msg) });
        }
    };

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

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="asistencia-page">
            <div className="page-header" style={{ justifyContent: 'flex-end' }}>
                <div className="header-actions">
                    <div className="tabs">
                        <button className={activeTab === 'control' ? 'active' : ''} onClick={() => setActiveTab('control')}>
                            <Icon name="check-circle" size={18} /> Control Diario
                        </button>
                        <button className={activeTab === 'historial' ? 'active' : ''} onClick={() => setActiveTab('historial')}>
                            <Icon name="list" size={18} /> Historial
                        </button>
                    </div>
                </div>
            </div>



            {activeTab === 'control' && (
                <div className="control-layout">
                    <div className="list-panel">
                        <div className="panel-header">
                            <h3>Lista de Personal</h3>
                            <div className="panel-controls">
                                <input
                                    type="date"
                                    value={currentDate}
                                    onChange={(e) => setCurrentDate(e.target.value)}
                                    className="date-input"
                                />
                                <button className="btn-today" onClick={() => setCurrentDate(new Date().toISOString().split('T')[0])}>Hoy</button>
                            </div>
                            <div className="search-box">
                                <Icon name="search" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o DNI..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="personal-list">
                            {loading ? <div className="loading">Cargando...</div> : filteredStatuses.map(p => (
                                <div
                                    key={p.id}
                                    className={`personal-item ${selectedPersonalId === p.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedPersonalId(p.id)}
                                >
                                    <div className="pi-info">
                                        <h4>{p.nombre_completo}</h4>
                                        <span className="pi-dni">{p.dni}</span>
                                    </div>
                                    <div className="pi-status">
                                        <span className={`status-badge ${p.estado_dia.toLowerCase()}`}>
                                            {p.estado_dia}
                                        </span>
                                        {(() => {
                                            const entries = p.registros
                                                .filter(r => r.tipo_registro.includes('ENTRADA'))
                                                .sort((a, b) => new Date(a.marca_tiempo).getTime() - new Date(b.marca_tiempo).getTime());
                                            const firstEntry = entries.length > 0 ? entries[0] : null;
                                            return firstEntry ? (
                                                <span className="last-mark" style={{ color: '#2e7d32' }}>
                                                    Ent: {new Date(firstEntry.marca_tiempo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            ) : null;
                                        })()}
                                        {p.ultima_marcacion && <span className="last-mark">Ult: {new Date(p.ultima_marcacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="action-panel">
                        {selectedPerson ? (
                            <div className="marking-card">
                                <div className="mc-header">
                                    <h2>{selectedPerson.nombre_completo}</h2>
                                    <span className="mc-dni">DNI: {selectedPerson.dni}</span>
                                </div>
                                <div className="digital-clock">
                                    {formatTime(currentTime)}
                                </div>

                                {markingMessage && (
                                    <div className={`alert ${markingMessage.type}`}>
                                        {markingMessage.text}
                                    </div>
                                )}

                                <div className="marking-buttons">
                                    <div className="mb-row">
                                        <span>Turno Mañana</span>
                                        <div className="btn-group">
                                            <button className="btn-mark entrada" onClick={() => handleMarking('ENTRADA_M')}>ENTRADA</button>
                                            <button className="btn-mark salida" onClick={() => handleMarking('SALIDA_M')}>SALIDA</button>
                                        </div>
                                    </div>
                                    <div className="mb-row">
                                        <span>Turno Tarde</span>
                                        <div className="btn-group">
                                            <button className="btn-mark entrada" onClick={() => handleMarking('ENTRADA_T')}>ENTRADA</button>
                                            <button className="btn-mark salida" onClick={() => handleMarking('SALIDA_T')}>SALIDA</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="motive-field">
                                    <label>Motivo (Opcional):</label>
                                    <input
                                        type="text"
                                        value={motivo}
                                        onChange={(e) => setMotivo(e.target.value)}
                                        placeholder="Ej: Salida médica, reunión externa..."
                                    />
                                </div>

                                <div className="todays-records">
                                    <h4>Registros de Hoy</h4>
                                    <ul>
                                        {selectedPerson.registros?.length > 0 ? selectedPerson.registros.map((r: any) => (
                                            <li key={r.marca_tiempo}>
                                                <strong>{r.tipo_registro}</strong> - {new Date(r.marca_tiempo).toLocaleTimeString()}
                                                <span className={`mini-badge ${r.estado === 'TARDE' ? 'tarde' : 'ok'}`}>{r.estado}</span>
                                            </li>
                                        )) : <li className="empty">Sin registros</li>}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <Icon name="user-check" size={48} color="#ccc" />
                                <p>Selecciona un personal de la lista para registrar asistencia o ver sus detalles.</p>
                            </div>
                        )}
                        <div className="action-panel-footer">
                            <button className="btn-export" onClick={exportToExcel}>
                                <Icon name="download" size={16} /> Exportar Reporte del Día
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'historial' && (
                <div className="historial-layout">
                    <div className="filters-bar">
                        <div className="date-range">
                            <label>Desde:</label>
                            <input type="date" value={histStartDate} onChange={e => setHistStartDate(e.target.value)} />
                            <label>Hasta:</label>
                            <input type="date" value={histEndDate} onChange={e => setHistEndDate(e.target.value)} />
                        </div>
                        <div className="search-filter">
                            <input
                                type="text"
                                placeholder="Filtrar en resultados..."
                                value={histUnknownFilter}
                                onChange={(e) => setHistUnknownFilter(e.target.value)}
                            />
                        </div>
                        <button className="btn-export secondary" onClick={exportToExcel}>
                            <Icon name="download" size={16} /> Exportar Excel
                        </button>
                    </div>

                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Hora</th>
                                    <th>Personal</th>
                                    <th>DNI</th>
                                    <th>Tipo</th>
                                    <th>Estado</th>
                                    <th>Motivo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="loading-cell">Cargando datos...</td></tr>
                                ) : history.filter(h =>
                                    h.nombre_personal.toLowerCase().includes(histUnknownFilter.toLowerCase()) ||
                                    h.dni.includes(histUnknownFilter)
                                ).map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{row.fecha}</td>
                                        <td>{new Date(row.marca_tiempo).toLocaleTimeString()}</td>
                                        <td>{row.nombre_personal}</td>
                                        <td>{row.dni}</td>
                                        <td>{row.tipo_registro}</td>
                                        <td>
                                            <span className={`status-pill ${row.estado.replace(/\s+/g, '_').toLowerCase()}`}>
                                                {row.estado}
                                            </span>
                                        </td>
                                        <td>{row.motivo || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!loading && history.length === 0 && <div className="no-data">No hay registros en este rango</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AsistenciasPage;
