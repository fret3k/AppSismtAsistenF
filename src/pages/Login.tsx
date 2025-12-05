import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import logoMin from '../assets/logo_corte_min.jpg';
import logo from '../assets/logo_corte.jpg';
const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setError(''); // Clear error on input change
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(formData.email, formData.password);
            navigate('/dashboard');
        } catch (err) {
            setError('Credenciales inválidas. Por favor, intente nuevamente.');
            console.error('Login error:', err);
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

                <Link to="/" className="btn-inicio">
                    ← Inicio
                </Link>
            </nav>

            <div className="login-card">
                <div className="login-header">
                    <img src={logoMin} alt="Logo" className="navbar-image" />
                    <h1>SICAF</h1>
                    <p>Sistema Control de Asistencia Facial</p>
                </div>

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
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            className="form-input"
                            placeholder="Ingrese su contraseña"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-options">
                        <label className="remember-me">
                            <input
                                type="checkbox"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleChange}
                                disabled={loading}
                            />
                            <span>Recordar sesión</span>
                        </label>
                        <a href="#" className="forgot-password">¿Olvidó su contraseña?</a>
                    </div>

                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>

                {/* <div className="login-footer">
                    <p className="demo-info">
                        <strong>Usuarios de prueba:</strong><br />
                        Admin: admin@sicape.com / password<br />
                        Usuario: user@sicape.com / password
                    </p>
                </div>
               */}
            </div>
        </div>
    );
};

export default Login;
