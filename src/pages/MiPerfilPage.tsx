import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { personalService } from '../services/personalService';
import Icon from '../components/Icon';
import type { PersonalUpdateDTO } from '../types';
import './MiPerfilPage.css';

// Notification component for success/error messages
interface NotificationProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`notification-toast ${type}`}>
            <span className="notification-icon">
                <Icon name={type === 'success' ? 'check-circle' : 'x-circle'} size={20} color="white" />
            </span>
            <span>{message}</span>
        </div>
    );
};

const MiPerfilPage: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error';
    } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        nombre: '',
        apellido_paterno: '',
        apellido_materno: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const [showPasswordFields, setShowPasswordFields] = useState(false);

    // Initialize form data with user info
    useEffect(() => {
        if (user) {
            setFormData({
                nombre: user.nombre || '',
                apellido_paterno: user.apellido_paterno || '',
                apellido_materno: user.apellido_materno || '',
                email: user.email || '',
                password: '',
                confirmPassword: '',
            });
        }
    }, [user]);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        // Reset form data to original user data
        if (user) {
            setFormData({
                nombre: user.nombre || '',
                apellido_paterno: user.apellido_paterno || '',
                apellido_materno: user.apellido_materno || '',
                email: user.email || '',
                password: '',
                confirmPassword: '',
            });
        }
        setShowPasswordFields(false);
        setIsEditing(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.id) {
            showNotification('Error: No se pudo identificar al usuario', 'error');
            return;
        }

        // Validate password if provided
        if (showPasswordFields && formData.password) {
            if (formData.password.length < 8) {
                showNotification('La contraseña debe tener al menos 8 caracteres', 'error');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                showNotification('Las contraseñas no coinciden', 'error');
                return;
            }
        }

        setIsLoading(true);

        try {
            // Build update data (only include changed fields)
            const updateData: PersonalUpdateDTO = {};

            if (formData.nombre !== user.nombre) {
                updateData.nombre = formData.nombre;
            }
            if (formData.apellido_paterno !== user.apellido_paterno) {
                updateData.apellido_paterno = formData.apellido_paterno;
            }
            if (formData.apellido_materno !== user.apellido_materno) {
                updateData.apellido_materno = formData.apellido_materno;
            }
            if (formData.email !== user.email) {
                updateData.email = formData.email;
            }
            if (showPasswordFields && formData.password) {
                updateData.password = formData.password;
            }

            // Check if there are any changes
            if (Object.keys(updateData).length === 0) {
                showNotification('No hay cambios que guardar', 'error');
                setIsLoading(false);
                return;
            }

            // Call API to update
            const updatedPersonal = await personalService.update(user.id, updateData);

            // Update local user state
            updateUser({
                nombre: updatedPersonal.nombre,
                apellido_paterno: updatedPersonal.apellido_paterno,
                apellido_materno: updatedPersonal.apellido_materno,
                email: updatedPersonal.email,
            });

            showNotification('¡Perfil actualizado correctamente!', 'success');
            setIsEditing(false);
            setShowPasswordFields(false);
            setFormData(prev => ({
                ...prev,
                password: '',
                confirmPassword: '',
            }));
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification(
                error instanceof Error ? error.message : 'Error al actualizar el perfil',
                'error'
            );
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="mi-perfil-page">
                <p>Cargando información del usuario...</p>
            </div>
        );
    }

    return (
        <div className="mi-perfil-page">
            {/* Notification Toast */}
            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            {/* Profile Card */}
            <div className="profile-card">
                <div className="profile-header">
                    <div className="profile-avatar">
                        {user.nombre?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="profile-info">
                        <h2>
                            {user.nombre} {user.apellido_paterno} {user.apellido_materno}
                        </h2>
                        <p className="profile-email">{user.email}</p>
                        <span className={`profile-role ${user.es_administrador ? 'admin' : 'user'}`}>
                            <Icon name={user.es_administrador ? 'shield' : 'user'} size={14} />
                            {user.es_administrador ? ' Administrador' : ' Usuario'}
                        </span>
                    </div>
                    {!isEditing && (
                        <button className="btn-edit" onClick={handleEdit}>
                            <Icon name="edit-2" size={16} color="white" />
                            Editar Perfil
                        </button>
                    )}
                </div>

                {!isEditing ? (
                    /* View Mode */
                    <div className="profile-details">
                        <div className="detail-item">
                            <label>Nombre</label>
                            <p>{user.nombre}</p>
                        </div>
                        <div className="detail-item">
                            <label>Apellido Paterno</label>
                            <p>{user.apellido_paterno}</p>
                        </div>
                        <div className="detail-item">
                            <label>Apellido Materno</label>
                            <p>{user.apellido_materno}</p>
                        </div>
                        <div className="detail-item">
                            <label>Correo Electrónico</label>
                            <p>{user.email}</p>
                        </div>
                    </div>
                ) : (
                    /* Edit Mode */
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="nombre">Nombre</label>
                                <input
                                    type="text"
                                    id="nombre"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="apellido_paterno">Apellido Paterno</label>
                                <input
                                    type="text"
                                    id="apellido_paterno"
                                    name="apellido_paterno"
                                    value={formData.apellido_paterno}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="apellido_materno">Apellido Materno</label>
                                <input
                                    type="text"
                                    id="apellido_materno"
                                    name="apellido_materno"
                                    value={formData.apellido_materno}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Correo Electrónico</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Section */}
                        <div className="password-section">
                            <label
                                className="password-toggle"
                                onClick={() => setShowPasswordFields(!showPasswordFields)}
                            >
                                <Icon name="lock" size={16} />
                                {showPasswordFields ? ' Ocultar' : ' Cambiar'} Contraseña
                            </label>

                            {showPasswordFields && (
                                <div className="form-row" style={{ marginTop: '1rem' }}>
                                    <div className="form-group">
                                        <label htmlFor="password">Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Mínimo 8 caracteres"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            placeholder="Repite la contraseña"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Form Actions */}
                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleCancel}
                                disabled={isLoading}
                            >
                                <Icon name="x" size={16} /> Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="loading-spinner"></span>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Icon name="save" size={16} color="white" /> Guardar Cambios
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default MiPerfilPage;
