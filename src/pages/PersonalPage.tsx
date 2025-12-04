import React, { useEffect, useState } from 'react';
import { personalService } from '../services/personalService';
import type { PersonalResponseDTO, PersonalCreateDTO } from '../types';
import FaceCapture from '../components/FaceCapture';
import './PersonalPage.css';

const PersonalPage: React.FC = () => {
    const [personal, setPersonal] = useState<PersonalResponseDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!faceDescriptor) {
            setError('Debes capturar una foto del rostro antes de crear el personal');
            return;
        }

        try {
            setError(null);

            // Use the combined endpoint to register personal with face encoding in one call
            const response = await personalService.registerWithEncoding({
                dni: formData.dni,
                nombre: formData.nombre,
                apellido_paterno: formData.apellido_paterno,
                apellido_materno: formData.apellido_materno,
                email: formData.email,
                password: formData.password,
                es_administrador: formData.es_administrador,
                embedding: Array.from(faceDescriptor), // Convert Float32Array to regular array
            });

            console.log('Personal registered successfully:', response);

            // Reset form
            setShowCreateForm(false);
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

            loadPersonal();
        } catch (err) {
            console.error('Error creating personal:', err);

            // Check if it's a duplicate DNI or email error
            const errorMessage = err instanceof Error ? err.message : String(err);

            if (errorMessage.includes('personal_dni_key') || errorMessage.includes('dni')) {
                setError(`❌ El DNI "${formData.dni}" ya está registrado. Por favor, usa un DNI diferente.`);
            } else if (errorMessage.includes('personal_email_key') || errorMessage.includes('email')) {
                setError(`❌ El email "${formData.email}" ya está registrado. Por favor, usa un email diferente.`);
            } else {
                setError('❌ Error al crear el personal. Verifica que todos los datos sean correctos.');
            }
        }
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
                <button className="btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
                    {showCreateForm ? 'Cancelar' : '+ Nuevo Personal'}
                </button>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                    <button onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {showCreateForm && (
                <div className="create-form-card">
                    <h2>Crear Nuevo Personal</h2>
                    <form onSubmit={handleCreate}>
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
                                <label>Contraseña * (mínimo 8 caracteres)</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    minLength={8}
                                    required
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
                            <h3>📸 Captura de Rostro *</h3>
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
                                            🔄 Capturar Nuevo Rostro
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn-primary">
                                Crear Personal
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
                                            className="btn-delete"
                                            onClick={() => handleDelete(p.id)}
                                            title="Eliminar"
                                        >
                                            🗑️
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
