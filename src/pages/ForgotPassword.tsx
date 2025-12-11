import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import './Login.css';
import logoMin from '../assets/logo_corte_min.jpg';
import logo from '../assets/logo_corte.jpg';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Obtener la URL base de la aplicación actual
            const baseUrl = window.location.origin;
            await authService.forgotPassword(email, baseUrl);
            setSuccess(true);
        } catch (err) {
            setError('Error al procesar la solicitud. Inténtelo nuevamente.');
            console.error('Forgot password error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Navbar con enlace de Inicio */}
            <nav className="login-navbar">
                <Link to="/" className="login-navbar-brand">
                    <div className="login-navbar-logo">
                        <img src={logo} alt="Logo" className="navbar-image" />
                    </div>
                    <span>SICAF</span>
                </Link>

                <Link to="/login" className="btn-inicio">
                    ← Volver al Login
                </Link>
            </nav>

            <div className="login-card">
                <div className="login-header">
                    <img src={logoMin} alt="Logo" className="navbar-image" />
                    <h1>Recuperar Contraseña</h1>
                    <p>Ingrese su correo electrónico para recibir instrucciones</p>
                </div>

                {success ? (
                    <div className="success-message">
                        <div className="success-icon">✓</div>
                        <h2>¡Correo Enviado!</h2>
                        <p>
                            Hemos enviado las instrucciones de recuperación a <strong>{email}</strong>.
                            Por favor revise su bandeja de entrada y siga las instrucciones para restablecer su contraseña.
                        </p>
                        <p className="note">
                            El enlace de recuperación expirará en 60 minutos.
                        </p>
                        <Link to="/login" className="btn-login" style={{ textDecoration: 'none', textAlign: 'center' }}>
                            Volver al Login
                        </Link>
                    </div>
                ) : (
                    <form className="login-form" onSubmit={handleSubmit}>
                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="email">Correo Electrónico</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className="form-input"
                                placeholder="usuario@ejemplo.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError('');
                                }}
                                required
                                disabled={loading}
                            />
                        </div>

                        <p className="help-text">
                            Ingrese el correo electrónico asociado a su cuenta. Le enviaremos un enlace para restablecer su contraseña.
                        </p>

                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar Instrucciones'}
                        </button>

                        <div className="form-footer">
                            <Link to="/login" className="back-link">
                                ← Volver al inicio de sesión
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
