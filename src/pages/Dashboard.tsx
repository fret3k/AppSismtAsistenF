import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import PersonalPage from './PersonalPage';
import ConfiguracionPage from './ConfiguracionPage';
import MiPerfilPage from './MiPerfilPage';
import Icon from '../components/Icon';
import AsistenciasPage from './AsistenciasPage';
import './Dashboard.css';
import { asistenciaService } from '../services/asistenciaService';
import type { EstadisticasDiaDTO } from '../types';

// Dashboard Home Component
const DashboardHome: React.FC = () => {
    const { isAdmin } = useAuth();
    const [stats, setStats] = useState<EstadisticasDiaDTO | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await asistenciaService.getEstadisticas();
                setStats(data);
            } catch (error) {
                console.error("Error fetching dashboard stats", error);
            }
        };
        fetchStats();
    }, []);

    return (
        <>
            <div className="dashboard-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}>
                        <Icon name="users" size={32} strokeWidth={2.5} />
                    </div>
                    <div className="stat-content">
                        <h3>Total Personal</h3>
                        <p className="stat-number">{stats?.total_personal || 0}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}>
                        <Icon name="check-circle" size={32} strokeWidth={2.5} />
                    </div>
                    <div className="stat-content">
                        <h3>Presentes</h3>
                        <p className="stat-number">{stats?.presentes || 0}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#ffebee', color: '#c62828' }}>
                        <Icon name="x" size={32} strokeWidth={2.5} />
                    </div>
                    <div className="stat-content">
                        <h3>Ausentes</h3>
                        <p className="stat-number">{stats?.ausentes || 0}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#fff3e0', color: '#ef6c00' }}>
                        <Icon name="clock" size={32} strokeWidth={2.5} />
                    </div>
                    <div className="stat-content">
                        <h3>Tardanzas</h3>
                        <p className="stat-number">{stats?.tardanzas || 0}</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-content-grid">
                <div className="content-card">
                    <h3>Actividad Reciente</h3>
                    <div className="activity-list">
                        <div className="activity-item">
                            <span className="activity-icon activity-entry">
                                <Icon name="log-in" size={22} color="#28a745" strokeWidth={2.5} />
                            </span>
                            <div className="activity-details">
                                <p><strong>Juan Pérez</strong> registró entrada</p>
                                <small>Hace 5 minutos</small>
                            </div>
                        </div>
                        <div className="activity-item">
                            <span className="activity-icon activity-exit">
                                <Icon name="log-out" size={22} color="#dc3545" strokeWidth={2.5} />
                            </span>
                            <div className="activity-details">
                                <p><strong>María García</strong> registró salida</p>
                                <small>Hace 15 minutos</small>
                            </div>
                        </div>
                        <div className="activity-item">
                            <span className="activity-icon activity-permit">
                                <Icon name="file-plus" size={22} color="#667eea" strokeWidth={2.5} />
                            </span>
                            <div className="activity-details">
                                <p><strong>Carlos López</strong> solicitó permiso</p>
                                <small>Hace 1 hora</small>
                            </div>
                        </div>
                    </div>
                </div>

                {isAdmin && (
                    <div className="content-card">
                        <h3>Acciones Rápidas</h3>
                        <div className="quick-actions">
                            <button className="action-btn">
                                <Icon name="user-plus" size={24} strokeWidth={2.5} />
                                <span>Nuevo Personal</span>
                            </button>
                            <button className="action-btn">
                                <Icon name="bar-chart-2" size={24} strokeWidth={2.5} />
                                <span>Generar Reporte</span>
                            </button>
                            <button className="action-btn">
                                <Icon name="check-square" size={24} strokeWidth={2.5} />
                                <span>Aprobar Permisos</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

// Placeholder components for other routes
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
    <div style={{ padding: '2rem' }}>
        <h2>{title}</h2>
        <p>Esta página está en desarrollo.</p>
    </div>
);

const Dashboard: React.FC = () => {
    const { user } = useAuth();

    return (
        <Routes>
            <Route
                path="/"
                element={
                    <DashboardLayout
                        title="Dashboard"
                        subtitle={`Bienvenido, ${user?.nombre || 'Usuario'}`}
                    >
                        <DashboardHome />
                    </DashboardLayout>
                }
            />
            <Route
                path="/personal"
                element={
                    <DashboardLayout title="Gestión de Personal" subtitle="Administra el personal del sistema">
                        <PersonalPage />
                    </DashboardLayout>
                }
            />
            <Route
                path="/mi-perfil"
                element={
                    <DashboardLayout title="Mi Perfil" subtitle="Información personal">
                        <MiPerfilPage />
                    </DashboardLayout>
                }
            />

            <Route
                path="/asistencias"
                element={
                    <DashboardLayout title="Registro y Control" subtitle="Gestión de asistencia y personal">
                        <AsistenciasPage />
                    </DashboardLayout>
                }
            />
            <Route
                path="/mis-asistencias"
                element={
                    <DashboardLayout title="Mis Asistencias" subtitle="Historial de asistencias">
                        <PlaceholderPage title="Mis Asistencias" />
                    </DashboardLayout>
                }
            />
            <Route
                path="/reporte-asistencias"
                element={
                    <DashboardLayout title="Reporte de Asistencias" subtitle="Reporte general">
                        <PlaceholderPage title="Reporte de Asistencias" />
                    </DashboardLayout>
                }
            />
            <Route
                path="/permisos"
                element={
                    <DashboardLayout title="Gestión de Permisos" subtitle="Administra permisos">
                        <PlaceholderPage title="Gestión de Permisos" />
                    </DashboardLayout>
                }
            />
            <Route
                path="/mis-permisos"
                element={
                    <DashboardLayout title="Mis Permisos" subtitle="Mis solicitudes de permisos">
                        <PlaceholderPage title="Mis Permisos" />
                    </DashboardLayout>
                }
            />
            <Route
                path="/encoding-faces"
                element={
                    <DashboardLayout title="Gestión de Encodings" subtitle="Administra encodings faciales">
                        <PlaceholderPage title="Gestión de Encodings" />
                    </DashboardLayout>
                }
            />
            <Route
                path="/registrar-rostro"
                element={
                    <DashboardLayout title="Registrar Rostro" subtitle="Registra tu rostro para reconocimiento">
                        <PlaceholderPage title="Registrar Rostro" />
                    </DashboardLayout>
                }
            />
            <Route
                path="/reportes"
                element={
                    <DashboardLayout title="Reportes Generales" subtitle="Reportes del sistema">
                        <PlaceholderPage title="Reportes Generales" />
                    </DashboardLayout>
                }
            />
            <Route
                path="/estadisticas"
                element={
                    <DashboardLayout title="Estadísticas" subtitle="Estadísticas del sistema">
                        <PlaceholderPage title="Estadísticas" />
                    </DashboardLayout>
                }
            />
            <Route
                path="/exportar"
                element={
                    <DashboardLayout title="Exportar Datos" subtitle="Exporta datos del sistema">
                        <PlaceholderPage title="Exportar Datos" />
                    </DashboardLayout>
                }
            />
            <Route
                path="/configuracion"
                element={
                    <DashboardLayout title="Configuración" subtitle="Configuración del sistema">
                        <ConfiguracionPage />
                    </DashboardLayout>
                }
            />
            <Route
                path="/usuarios"
                element={
                    <DashboardLayout title="Gestión de Usuarios" subtitle="Administra usuarios del sistema">
                        <PlaceholderPage title="Gestión de Usuarios" />
                    </DashboardLayout>
                }
            />
            <Route
                path="/ayuda"
                element={
                    <DashboardLayout title="Ayuda" subtitle="Centro de ayuda">
                        <PlaceholderPage title="Ayuda" />
                    </DashboardLayout>
                }
            />
            <Route
                path="/version"
                element={
                    <DashboardLayout title="Versión" subtitle="Información del sistema">
                        <PlaceholderPage title="Versión del Sistema" />
                    </DashboardLayout>
                }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
};

export default Dashboard;
