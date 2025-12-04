import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar: React.FC = () => {
    return (
        <nav className="navbar">
            <div className="navbar-content">
                <Link to="/" className="navbar-brand">
                    <div className="navbar-logo">PJP</div>
                    <span>SICAF</span>
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
