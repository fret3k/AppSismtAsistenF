import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './Login.css';
import logoMin from '../assets/logo_corte_min.jpg';
import logo from '../assets/logo_corte.jpg';

const ResetPassword: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const validatePassword = (): boolean => {
        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return false;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validatePassword()) {
            return;
        }

        if (!token) {
            setError('Token de recuperación no válido.');
            return;
        }

        setLoading(true);

        try {
            await authService.resetPassword(token, password);
            setSuccess(true);
            // Redirigir al login después de 3 segundos
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError('El enlace de recuperación es inválido o ha expirado. Por favor solicite uno nuevo.');
            console.error('Reset password error:', err);
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
                    <h1>Nueva Contraseña</h1>
                    <p>Ingrese su nueva contraseña</p>
                </div>

                {success ? (
                    <div className="success-message">
                        <div className="success-icon">✓</div>
                        <h2>¡Contraseña Actualizada!</h2>
                        <p>
                            Su contraseña ha sido restablecida exitosamente.
                            Ahora puede iniciar sesión con su nueva contraseña.
                        </p>
                        <p className="redirect-note">
                            Redirigiendo al inicio de sesión...
                        </p>
                        <Link to="/login" className="btn-login" style={{ textDecoration: 'none', textAlign: 'center' }}>
                            Ir al Login Ahora
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
                            <label htmlFor="password">Nueva Contraseña</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                className="form-input"
                                placeholder="Mínimo 8 caracteres"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError('');
                                }}
                                required
                                minLength={8}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                className="form-input"
                                placeholder="Repita su contraseña"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setError('');
                                }}
                                required
                                minLength={8}
                                disabled={loading}
                            />
                        </div>

                        <div className="password-requirements">
                            <p><strong>Requisitos de contraseña:</strong></p>
                            <ul>
                                <li className={password.length >= 8 ? 'valid' : ''}>
                                    Mínimo 8 caracteres
                                </li>
                                <li className={password === confirmPassword && password.length > 0 ? 'valid' : ''}>
                                    Las contraseñas deben coincidir
                                </li>
                            </ul>
                        </div>

                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'Actualizando...' : 'Restablecer Contraseña'}
                        </button>

                        <div className="form-footer">
                            <Link to="/forgot-password" className="back-link">
                                ¿El enlace expiró? Solicitar nuevo enlace
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
