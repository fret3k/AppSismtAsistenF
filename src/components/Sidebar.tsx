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

    // Menú para ADMINISTRADORES
    const adminMenuItems: {
        section: string;
        items: { path: string; icon: IconName; text: string }[];
    }[] = [
            {
                section: 'Principal',
                items: [
                    { path: '/dashboard', icon: 'bar-chart-2', text: 'Dashboard' },
                    { path: '/dashboard/personal', icon: 'users', text: 'Gestión Personal' },
                    { path: '/dashboard/mi-perfil', icon: 'user', text: 'Mi Perfil' },
                ],
            },
            {
                section: 'Asistencias',
                items: [
                    { path: '/dashboard/asistencias', icon: 'camera', text: 'Registro y Control' },
                ],
            },
            {
                section: 'Permisos',
                items: [
                    { path: '/dashboard/permisos', icon: 'check-square', text: 'Gestión Permisos' },
                    { path: '/dashboard/control-entrada-salida', icon: 'clock', text: 'Marcar Permiso' },
                    { path: '/dashboard/historial-permisos', icon: 'archive', text: 'Historial Permisos' },
                ],
            },
            {
                section: 'Reportes',
                items: [
                    { path: '/dashboard/reporte-asistencias', icon: 'pie-chart', text: 'Reporte General' },
                ],
            },
            {
                section: 'Sistema',
                items: [
                    { path: '/dashboard/configuracion', icon: 'settings', text: 'Configuración' },
                ],
            },
            {
                section: 'Ayuda',
                items: [
                    { path: '/dashboard/ayuda', icon: 'help-circle', text: 'Centro de Ayuda' },
                ],
            },
        ];

    // Menú para USUARIOS COMUNES (simplificado)
    const userMenuItems: {
        section: string;
        items: { path: string; icon: IconName; text: string }[];
    }[] = [
            {
                section: 'Principal',
                items: [
                    { path: '/dashboard', icon: 'bar-chart-2', text: 'Dashboard' },
                ],
            },
            {
                section: 'Mi Espacio',
                items: [
                    { path: '/dashboard/mi-perfil', icon: 'user', text: 'Mi Perfil' },
                    { path: '/dashboard/mis-asistencias', icon: 'calendar', text: 'Mis Asistencias' },
                ],
            },
            {
                section: 'Permisos',
                items: [
                    { path: '/dashboard/mis-permisos', icon: 'file-text', text: 'Solicitar Permiso' },
                    { path: '/dashboard/control-entrada-salida', icon: 'clock', text: 'Marcar Permiso' },
                    { path: '/dashboard/historial-permisos', icon: 'archive', text: 'Mi Historial' },
                ],
            },
            {
                section: 'Ayuda',
                items: [
                    { path: '/dashboard/ayuda', icon: 'help-circle', text: 'Centro de Ayuda' },
                ],
            },
        ];

    // Seleccionar menú según rol
    const menuItems = isAdmin ? adminMenuItems : userMenuItems;

    return (
        <>
            <button className="sidebar-toggle" onClick={toggleSidebar}>
                <Icon name="menu" size={24} color="white" />
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
                    {/* Botón de Inicio para volver a la página principal */}
                    <Link
                        to="/"
                        className={`menu-item ${isActive('/') ? 'active' : ''}`}
                        onClick={() => setIsOpen(false)}
                    >
                        <span className="menu-icon">
                            <Icon name="home" size={18} color="white" strokeWidth={2.5} />
                        </span>
                        <span className="menu-text">Inicio</span>
                    </Link>

                    {menuItems.map((section, idx) => (
                        <div key={idx} className="menu-section">
                            <div className="menu-section-title">{section.section}</div>
                            {section.items.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`menu-item ${isActive(item.path)}`}
                                    onClick={() => setIsOpen(false)}
                                >
                                    <span className="menu-icon">
                                        <Icon name={item.icon} size={18} color="white" strokeWidth={2.5} />
                                    </span>
                                    <span className="menu-text">{item.text}</span>
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.foto_base64 ? (
                                <img src={user.foto_base64} alt="Perfil" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                user?.nombre?.charAt(0).toUpperCase() || 'U'
                            )}
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
                        <Icon name="log-out" size={18} color="white" strokeWidth={2.5} />
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
