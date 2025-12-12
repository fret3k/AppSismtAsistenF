import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';
import logo from '../assets/logo_corte.jpg';

const Navbar: React.FC = () => {
    const { isAuthenticated } = useAuth();

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
                    {/* Mostrar botón de Dashboard si está autenticado, sino mostrar Iniciar Sesión */}
                    {isAuthenticated ? (
                        <Link to="/dashboard" className="btn-navbar">
                            Dashboard
                        </Link>
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
