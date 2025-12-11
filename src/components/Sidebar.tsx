import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import type { IconName } from './Icon';
import './Sidebar.css';
import logoMin from '../assets/logo_corte_min.jpg';


const Sidebar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const { user, isAdmin, logout } = useAuth();

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const isActive = (path: string) => {
        return location.pathname === path ? 'active' : '';
    };

    const menuItems: {
        section: string;
        items: { path: string; icon: IconName; text: string; adminOnly: boolean; userOnly?: boolean }[];
    }[] = [
            {
                section: 'Principal',
                items: [
                    { path: '/dashboard', icon: 'bar-chart-2', text: 'Dashboard', adminOnly: false },
                    { path: '/dashboard/personal', icon: 'users', text: 'Gestión Personal', adminOnly: true },
                    { path: '/dashboard/mi-perfil', icon: 'user', text: 'Mi Perfil', adminOnly: false },
                ],
            },
            {
                section: 'Asistencias',
                items: [
                    { path: '/dashboard/asistencias', icon: 'calendar', text: 'Registro Asistencias', adminOnly: false },
                    { path: '/dashboard/mis-asistencias', icon: 'clipboard', text: 'Mis Asistencias', adminOnly: false, userOnly: true },
                    { path: '/dashboard/reporte-asistencias', icon: 'pie-chart', text: 'Reporte General', adminOnly: true },
                    { path: '/dashboard/permisos', icon: 'file-text', text: 'Gestión Permisos', adminOnly: true },
                    { path: '/dashboard/mis-permisos', icon: 'file', text: 'Mis Permisos', adminOnly: false, userOnly: true },
                ],
            },
            {
                section: 'Reportes',
                items: [
                    { path: '/dashboard/reportes', icon: 'trending-up', text: 'Reportes Generales', adminOnly: true },
                    { path: '/dashboard/estadisticas', icon: 'activity', text: 'Estadísticas', adminOnly: true },
                    { path: '/dashboard/exportar', icon: 'download', text: 'Exportar Datos', adminOnly: true },
                ],
            },

            {
                section: 'Sistema',
                items: [
                    { path: '/dashboard/configuracion', icon: 'settings', text: 'Configuración', adminOnly: true },
                    { path: '/dashboard/usuarios', icon: 'user-check', text: 'Gestión Usuarios', adminOnly: true },
                    { path: '/dashboard/ayuda', icon: 'help-circle', text: 'Ayuda', adminOnly: false },
                    { path: '/dashboard/version', icon: 'info', text: 'Versión', adminOnly: false },
                ],
            },
        ];

    return (
        <>
            <button className="sidebar-toggle" onClick={toggleSidebar}>
                <Icon name="menu" size={28} color="white" />
            </button>

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <img src={logoMin} alt="Logo" className="navbar-image" />
                    <div className="sidebar-title">
                        <h2>SICAF</h2>
                        <p>Sistema Control Asistencia Facial</p>
                    </div>
                </div>

                <nav className="sidebar-menu">
                    {menuItems.map((section, idx) => {
                        // Filter items based on user role
                        const visibleItems = section.items.filter((item) => {
                            // Hide admin-only items from regular users
                            if (item.adminOnly && !isAdmin) return false;
                            // Hide user-only items from admins
                            if (item.userOnly && isAdmin) return false;
                            return true;
                        });

                        // Don't render section if no items are visible
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={idx} className="menu-section">
                                <div className="menu-section-title">{section.section}</div>
                                {visibleItems.map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`menu-item ${isActive(item.path)}`}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <span className="menu-icon">
                                            <Icon name={item.icon} size={22} color="white" strokeWidth={2.5} />
                                        </span>
                                        <span className="menu-text">{item.text}</span>
                                    </Link>
                                ))}
                            </div>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.nombre?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="user-details">
                            <h4>
                                {user?.nombre && user?.apellido_paterno
                                    ? `${user.nombre} ${user.apellido_paterno}`
                                    : user?.nombre || 'Usuario'}
                            </h4>
                            <p>{isAdmin ? 'Administrador' : 'Usuario'}</p>
                        </div>
                    </div>

                    <button className="logout-btn" onClick={logout}>
                        <Icon name="log-out" size={20} color="white" strokeWidth={2.5} />
                        <span>Cerrar Sesión</span>
                    </button>

                    <div className="version-info">
                        v1.0.0 - SICAF 2025
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
