import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const { user, isAdmin } = useAuth();

    return (
        <DashboardLayout
            title="Dashboard"
            subtitle={`Bienvenido, ${user?.nombre || 'Usuario'}`}
        >
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
        </DashboardLayout>
    );
};

export default Dashboard;
