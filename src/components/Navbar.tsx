import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';
import logo from '../assets/logo_corte.jpg';

const Navbar: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();
    const isPermisoPage = location.pathname === '/marcar-permiso';

    return (
        <nav className="navbar">
            <div className="navbar-content">
                <Link to="/" className="navbar-brand">

                    {/* ICONO DE IMAGEN */}
                    <img
                        src={logo}
                        alt="Logo"
                        className="navbar-image"
                    />

                    <span className="navbar-title">SICAF</span>
                </Link>

                <div className="navbar-actions">
                    {/* Botón de Marcar Permiso siempre visible */}
                    <Link
                        to={isPermisoPage ? "/" : "/marcar-permiso"}
                        className="btn-navbar btn-permiso-nav"
                    >
                        {isPermisoPage ? "Regresar" : "Marcar Permiso"}
                    </Link>

                    {/* Mostrar Dashboard y foto si está autenticado, sino mostrar Iniciar Sesión */}
                    {isAuthenticated ? (
                        <div className="navbar-user">
                            {user?.foto_base64 && (
                                <img src={user.foto_base64} alt="Perfil" className="navbar-avatar-min" />
                            )}
                            <Link to="/dashboard" className="btn-navbar">
                                Dashboard
                            </Link>
                        </div>
                    ) : (
                        <Link to="/login" className="btn-navbar">
                            Iniciar Sesión
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
