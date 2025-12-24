import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import PersonalPage from './PersonalPage';
import ConfiguracionPage from './ConfiguracionPage';
import MiPerfilPage from './MiPerfilPage';
import Icon from '../components/Icon';
import AsistenciasPage from './AsistenciasPage';
import PermisosPage from './PermisosPage';
import './Dashboard.css';
import { asistenciaService } from '../services/asistenciaService';
import type { EstadisticasDiaDTO } from '../types';

// Dashboard Home Component
const DashboardHome: React.FC = () => {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<EstadisticasDiaDTO | null>(null);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const statsData = await asistenciaService.getEstadisticas();
                setStats(statsData);

                const recentData = await asistenciaService.getRecientes(5);
                if (Array.isArray(recentData)) {
                    setRecentActivities(recentData);
                } else {
                    setRecentActivities(recentData.asistencias || []);
                }
            } catch (error) {
                console.error("Error fetching dashboard data", error);
            }
        };
        loadDashboardData();
    }, []);

    const getStatusColor = (estado: string) => {
        const e = estado?.toUpperCase() || '';
        if (e === 'A TIEMPO' || e === 'NORMAL') return '#28a745';
        if (e === 'TARDE') return '#fd7e14';
        if (e === 'FALTA') return '#dc3545';
        return '#6c757d';
    };

    const getStatusIcon = (estado: string) => {
        const e = estado?.toUpperCase() || '';
        if (e === 'A TIEMPO' || e === 'NORMAL') return 'check-circle';
        if (e === 'TARDE') return 'alert-circle';
        return 'clock';
    };

    return (
        <>
            <div className="dashboard-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}>
                        <Icon name="users" size={24} strokeWidth={2.5} />
                    </div>
                    <div className="stat-content">
                        <h3>Total Personal</h3>
                        <p className="stat-number">{stats?.total_personal || 0}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}>
                        <Icon name="check-circle" size={24} strokeWidth={2.5} />
                    </div>
                    <div className="stat-content">
                        <h3>Presentes</h3>
                        <p className="stat-number">{stats?.presentes || 0}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#ffebee', color: '#c62828' }}>
                        <Icon name="x" size={24} strokeWidth={2.5} />
                    </div>
                    <div className="stat-content">
                        <h3>Ausentes</h3>
                        <p className="stat-number">{stats?.ausentes || 0}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#fff3e0', color: '#ef6c00' }}>
                        <Icon name="clock" size={24} strokeWidth={2.5} />
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
                        {recentActivities.length > 0 ? (
                            recentActivities.map((activity: any, index: number) => (
                                <div key={activity.id || index} className="activity-item">
                                    <span className="activity-icon" style={{ color: getStatusColor(activity.estado) }}>
                                        <Icon name={getStatusIcon(activity.estado) as any} size={22} strokeWidth={2.5} />
                                    </span>
                                    <div className="activity-details">
                                        <p><strong>{activity.usuario}</strong> - {activity.turno}</p>
                                        <small>{activity.hora} • <span style={{ color: getStatusColor(activity.estado), fontWeight: 600 }}>{activity.estado}</span></small>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="no-activity">No hay actividad reciente</p>
                        )}
                    </div>
                </div>

                {isAdmin && (
                    <div className="content-card">
                        <h3>Acciones Rápidas</h3>
                        <div className="quick-actions">
                            <button className="action-btn" onClick={() => navigate('/dashboard/personal')}>
                                <Icon name="user-plus" size={24} strokeWidth={2.5} />
                                <span>Nuevo Personal</span>
                            </button>
                            <button className="action-btn" onClick={() => navigate('/dashboard/reporte-asistencias')}>
                                <Icon name="bar-chart-2" size={24} strokeWidth={2.5} />
                                <span>Generar Reporte</span>
                            </button>
                            <button className="action-btn" onClick={() => navigate('/dashboard/permisos')}>
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
    <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
        <Icon name="settings" size={48} strokeWidth={1.5} />
        <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>La sección <strong>{title}</strong> está en desarrollo.</p>
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
                    <DashboardLayout title="Gestión de Permisos" subtitle="Administra permisos y ausencias">
                        <PermisosPage mode="admin" />
                    </DashboardLayout>
                }
            />
            <Route
                path="/mis-permisos"
                element={
                    <DashboardLayout title="Mis Permisos" subtitle="Mis solicitudes de permisos">
                        <PermisosPage mode="user" />
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
