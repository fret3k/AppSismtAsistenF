import React, { useEffect, useState } from 'react';
import { personalService } from '../services/personalService';
import { ApiError } from '../services/api';
import type { PersonalResponseDTO, PersonalCreateDTO } from '../types';
import FaceCapture from '../components/FaceCapture';
import Icon from '../components/Icon';
import './PersonalPage.css';

const PersonalPage: React.FC = () => {
    const [personal, setPersonal] = useState<PersonalResponseDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showFaceCapture, setShowFaceCapture] = useState(false);
    const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
    const [faceImageUrl, setFaceImageUrl] = useState<string | null>(null);
    const [formData, setFormData] = useState<PersonalCreateDTO>({
        dni: '',
        nombre: '',
        apellido_paterno: '',
        apellido_materno: '',
        email: '',
        password: '',
        es_administrador: false,
    });

    // Fetch all personal on component mount
    useEffect(() => {
        loadPersonal();
    }, []);

    const loadPersonal = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await personalService.getAll();
            setPersonal(data);
        } catch (err) {
            setError('Error al cargar el personal. Verifica que la API esté corriendo.');
            console.error('Error loading personal:', err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            dni: '',
            nombre: '',
            apellido_paterno: '',
            apellido_materno: '',
            email: '',
            password: '',
            es_administrador: false,
        });
        setFaceDescriptor(null);
        setFaceImageUrl(null);
        setIsEditing(false);
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (p: PersonalResponseDTO) => {
        setFormData({
            dni: p.dni,
            nombre: p.nombre,
            apellido_paterno: p.apellido_paterno,
            apellido_materno: p.apellido_materno,
            email: p.email,
            password: '', // Password is not returned by API, standard practice to leave blank on edit unless changing
            es_administrador: p.es_administrador,
        });
        // We don't fetch the face image/encoding for display as it's not easily compatible with a simple image URL 
        // without decoding the vector or having a separate image store. 
        // We will assume if they want to update the face, they will capture a new one.
        setFaceDescriptor(null);
        setFaceImageUrl(null);

        setIsEditing(true);
        setEditingId(p.id);
        setShowForm(true);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation for Create mode
        if (!isEditing && !faceDescriptor) {
            setError('Debes capturar una foto del rostro antes de crear el personal');
            return;
        }

        try {
            setError(null);
            setSuccess(null);

            if (isEditing && editingId) {
                // Update mode
                const updateData: any = {
                    ...formData,
                };

                // Only include password if it was entered
                if (!formData.password) {
                    delete updateData.password;
                }

                // Include embedding if captured
                if (faceDescriptor) {
                    updateData.embedding = Array.from(faceDescriptor);
                }

                await personalService.updateWithEncoding(editingId, updateData);
                setSuccess(`✅ Personal "${formData.nombre}" actualizado exitosamente.`);
            } else {
                // Create mode
                await personalService.registerWithEncoding({
                    dni: formData.dni,
                    nombre: formData.nombre,
                    apellido_paterno: formData.apellido_paterno,
                    apellido_materno: formData.apellido_materno,
                    email: formData.email,
                    password: formData.password,
                    es_administrador: formData.es_administrador,
                    embedding: Array.from(faceDescriptor!), // Assert non-null because of check above
                });
                setSuccess(`✅ Personal "${formData.nombre}" registrado exitosamente.`);
            }

            // Reset form
            resetForm();
            loadPersonal();

            // Auto-hide success message after 5 seconds
            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            console.error('Error saving personal:', err);
            // Handle ApiError with detailed validation errors
            if (err instanceof ApiError) {
                if (err.errores && err.errores.length > 0) {
                    // Format validation errors for display
                    const errorMessages = err.errores.map(e => {
                        const fieldName = formatFieldName(e.campo);
                        return `• ${fieldName}: ${translateErrorMessage(e.mensaje)}`;
                    }).join('\n');
                    setError(`❌ Errores de validación:\n${errorMessages}`);
                } else if (err.detail.includes('dni') || err.detail.includes('personal_dni_key')) {
                    setError(`❌ El DNI "${formData.dni}" ya está registrado. Por favor, usa un DNI diferente.`);
                } else if (err.detail.includes('email') || err.detail.includes('personal_email_key')) {
                    setError(`❌ El email "${formData.email}" ya está registrado. Por favor, usa un email diferente.`);
                } else {
                    setError(`❌ ${err.detail}`);
                }
            } else {
                setError('❌ Error al guardar el personal. Verifica que todos los datos sean correctos.');
            }
        }
    };

    // Helper function to format field names for display
    const formatFieldName = (campo: string): string => {
        const fieldName = campo.replace('body -> ', '').replace('body->', '');
        const fieldMap: Record<string, string> = {
            'dni': 'DNI',
            'nombre': 'Nombre',
            'apellido_paterno': 'Apellido Paterno',
            'apellido_materno': 'Apellido Materno',
            'email': 'Email',
            'password': 'Contraseña',
            'es_administrador': 'Es Administrador',
            'embedding': 'Codificación Facial',
        };
        return fieldMap[fieldName] || fieldName;
    };

    // Helper function to translate common error messages to Spanish
    const translateErrorMessage = (mensaje: string): string => {
        const translations: Record<string, string> = {
            'value is not a valid email address': 'No es una dirección de email válida',
            'field required': 'Este campo es requerido',
            'ensure this value has at least 8 characters': 'Debe tener al menos 8 caracteres',
            'value is not a valid integer': 'Debe ser un número entero válido',
            'value is not a valid float': 'Debe ser un número válido',
        };
        return translations[mensaje] || mensaje;
    };

    const handleFaceDetected = (descriptor: Float32Array, imageUrl: string) => {
        setFaceDescriptor(descriptor);
        setFaceImageUrl(imageUrl);
        setShowFaceCapture(false);
    };

    const handleCancelFaceCapture = () => {
        setShowFaceCapture(false);
    };

    const handleRemoveFace = () => {
        setFaceDescriptor(null);
        setFaceImageUrl(null);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de eliminar este personal?')) return;

        try {
            await personalService.delete(id);
            loadPersonal();
        } catch (err) {
            setError('Error al eliminar el personal');
            console.error('Error deleting personal:', err);
        }
    };

    if (loading) {
        return <div className="personal-page"><div className="loading">Cargando...</div></div>;
    }

    return (
        <div className="personal-page">
            <div className="page-header">
                <h1>Gestión de Personal</h1>
                <button
                    className="btn-primary"
                    onClick={() => {
                        if (showForm) {
                            resetForm();
                        } else {
                            resetForm(); // Clear any previous edit state
                            setShowForm(true);
                        }
                    }}
                >
                    {showForm ? 'Cancelar' : '+ Nuevo Personal'}
                </button>
            </div>

            {error && (
                <div className="alert alert-error">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{error}</pre>
                    <button onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    {success}
                    <button onClick={() => setSuccess(null)}>✕</button>
                </div>
            )}

            {showForm && (
                <div className="create-form-card">
                    <h2>{isEditing ? 'Editar Personal' : 'Crear Nuevo Personal'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>DNI *</label>
                                <input
                                    type="text"
                                    value={formData.dni}
                                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre *</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Apellido Paterno *</label>
                                <input
                                    type="text"
                                    value={formData.apellido_paterno}
                                    onChange={(e) => setFormData({ ...formData, apellido_paterno: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Apellido Materno *</label>
                                <input
                                    type="text"
                                    value={formData.apellido_materno}
                                    onChange={(e) => setFormData({ ...formData, apellido_materno: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Contraseña {isEditing ? '(Dejar en blanco para mantener)' : '* (mínimo 8 caracteres)'}</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    minLength={isEditing ? undefined : 8}
                                    required={!isEditing}
                                />
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.es_administrador}
                                        onChange={(e) => setFormData({ ...formData, es_administrador: e.target.checked })}
                                    />
                                    Es Administrador
                                </label>
                            </div>
                        </div>

                        {/* Face Capture Section */}
                        <div className="face-capture-section">
                            <h3>📸 Captura de Rostro {isEditing ? '(Opcional)' : '*'}</h3>
                            {!faceImageUrl ? (
                                <div className="no-face-captured">
                                    <p>No se ha capturado ningún rostro</p>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={() => setShowFaceCapture(true)}
                                    >
                                        📷 Capturar Rostro
                                    </button>
                                </div>
                            ) : (
                                <div className="face-captured">
                                    <img src={faceImageUrl} alt="Rostro capturado" className="face-preview" />
                                    <div className="face-actions">
                                        <p className="face-success">✅ Rostro detectado correctamente</p>
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={handleRemoveFace}
                                        >

                                            🔄 {isEditing ? 'Cambiar Rostro' : 'Capturar Nuevo Rostro'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-secondary" onClick={resetForm}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn-primary">
                                {isEditing ? 'Guardar Cambios' : 'Crear Personal'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="personal-table-card">
                <h2>Lista de Personal ({personal.length})</h2>
                <div className="table-container">
                    <table className="personal-table">
                        <thead>
                            <tr>
                                <th>DNI</th>
                                <th>Nombre Completo</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {personal.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.dni}</td>
                                    <td>{`${p.nombre} ${p.apellido_paterno} ${p.apellido_materno}`}</td>
                                    <td>{p.email}</td>
                                    <td>
                                        <span className={`badge ${p.es_administrador ? 'badge-admin' : 'badge-user'}`}>
                                            {p.es_administrador ? 'Administrador' : 'Usuario'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn-edit"
                                            onClick={() => handleEdit(p)}
                                            title="Editar"
                                            style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            <Icon name="edit" size={20} color="#007bff" />
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDelete(p.id)}
                                            title="Eliminar"
                                        >
                                            <Icon name="trash-2" size={20} color="#dc3545" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Face Capture Modal */}
            {showFaceCapture && (
                <FaceCapture
                    onFaceDetected={handleFaceDetected}
                    onCancel={handleCancelFaceCapture}
                />
            )}
        </div>
    );
};

export default PersonalPage;
