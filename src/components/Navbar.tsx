import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';
import logo from '../assets/logo_corte.jpg';

const Navbar: React.FC = () => {
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
                    <Link to="/login" className="btn-navbar">
                        Iniciar Sesión
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
