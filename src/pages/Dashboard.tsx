import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import PersonalPage from './PersonalPage';
import ConfiguracionPage from './ConfiguracionPage';
import './Dashboard.css';

// Dashboard Home Component
const DashboardHome: React.FC = () => {
    const { isAdmin } = useAuth();

    return (
        <>
            <div className="dashboard-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>Personal Activo</h3>
                        <p className="stat-number">45</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>Asistencias Hoy</h3>
                        <p className="stat-number">38</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-content">
                        <h3>Permisos Pendientes</h3>
                        <p className="stat-number">{isAdmin ? '5' : '2'}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">⏰</div>
                    <div className="stat-content">
                        <h3>Tardanzas</h3>
                        <p className="stat-number">3</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-content-grid">
                <div className="content-card">
                    <h3>Actividad Reciente</h3>
                    <div className="activity-list">
                        <div className="activity-item">
                            <span className="activity-icon">🟢</span>
                            <div className="activity-details">
                                <p><strong>Juan Pérez</strong> registró entrada</p>
                                <small>Hace 5 minutos</small>
                            </div>
                        </div>
                        <div className="activity-item">
                            <span className="activity-icon">🔴</span>
                            <div className="activity-details">
                                <p><strong>María García</strong> registró salida</p>
                                <small>Hace 15 minutos</small>
                            </div>
                        </div>
                        <div className="activity-item">
                            <span className="activity-icon">📝</span>
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
                                <span>➕</span>
                                <span>Nuevo Personal</span>
                            </button>
                            <button className="action-btn">
                                <span>📊</span>
                                <span>Generar Reporte</span>
                            </button>
                            <button className="action-btn">
                                <span>✅</span>
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
                        <PlaceholderPage title="Mi Perfil" />
                    </DashboardLayout>
                }
            />
            <Route
                path="/asistencias"
                element={
                    <DashboardLayout title="Registro de Asistencias" subtitle="Registra tu asistencia">
                        <PlaceholderPage title="Registro de Asistencias" />
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
