import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

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

    const menuItems = [
        {
            section: 'Principal',
            items: [
                { path: '/dashboard', icon: '📊', text: 'Dashboard', adminOnly: false },
                { path: '/dashboard/personal', icon: '👥', text: 'Personal', adminOnly: true },
            ],
        },
        {
            section: 'Asistencias',
            items: [
                { path: '/dashboard/asistencias', icon: '📅', text: 'Reporte Asistencias', adminOnly: false },
                { path: '/dashboard/permisos', icon: '📝', text: 'Permisos', adminOnly: false },
            ],
        },
        {
            section: 'Reportes',
            items: [
                { path: '/dashboard/reportes', icon: '📈', text: 'Reportes', adminOnly: true },
            ],
        },
        {
            section: 'Sistema',
            items: [
                { path: '/dashboard/ayuda', icon: '❓', text: 'Ayuda', adminOnly: false },
                { path: '/dashboard/version', icon: 'ℹ️', text: 'Versión', adminOnly: false },
            ],
        },
    ];

    return (
        <>
            <button className="sidebar-toggle" onClick={toggleSidebar}>
                ☰
            </button>

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">PJP</div>
                    <div className="sidebar-title">
                        <h2>SICAPE</h2>
                        <p>Sistema de Control</p>
                    </div>
                </div>

                <nav className="sidebar-menu">
                    {menuItems.map((section, idx) => (
                        <div key={idx} className="menu-section">
                            <div className="menu-section-title">{section.section}</div>
                            {section.items.map((item) => {
                                // Hide admin-only items from regular users
                                if (item.adminOnly && !isAdmin) return null;

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`menu-item ${isActive(item.path)}`}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <span className="menu-icon">{item.icon}</span>
                                        <span className="menu-text">{item.text}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.nombre?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="user-details">
                            <h4>{user?.nombre || 'Usuario'}</h4>
                            <p>{isAdmin ? 'Administrador' : 'Usuario'}</p>
                        </div>
                    </div>

                    <button className="logout-btn" onClick={logout}>
                        <span>🚪</span>
                        <span>Cerrar Sesión</span>
                    </button>

                    <div className="version-info">
                        v1.0.0 - SICAPE 2025
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
