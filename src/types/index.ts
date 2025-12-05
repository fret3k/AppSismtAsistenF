// Types for API responses and data structures based on OpenAPI schema

// ============ Authentication Types ============
export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponseDTO {
    access_token: string;
    token_type: string;
    personal: PersonalResponseDTO;
}

// Alias for backward compatibility
export type LoginResponse = LoginResponseDTO;
export type TokenResponseDTO = LoginResponseDTO;

// ============ Personal Types ============
export interface PersonalResponseDTO {
    id: string; // UUID
    dni: string;
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string;
    email: string;
    es_administrador: boolean;
}

export interface PersonalCreateDTO {
    dni: string;
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string;
    email: string;
    es_administrador?: boolean;
    password: string;
}

// DTO for partial updates (PATCH)
export interface PersonalUpdateDTO {
    nombre?: string;
    apellido_paterno?: string;
    apellido_materno?: string;
    email?: string;
    es_administrador?: boolean;
    password?: string;
}

// Combined registration with face encoding
export interface PersonalRegisterWithEncodingDTO {
    dni: string;
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string;
    email: string;
    es_administrador?: boolean;
    password: string;
    embedding: number[]; // Face encoding vector (128-dimensional for face-api.js)
}

export interface PersonalRegisterWithEncodingResponse {
    personal_id: string; // UUID
    encoding_id: string; // UUID
    message: string;
}

// Alias for backward compatibility
export type Personal = PersonalResponseDTO;

// User type for AuthContext
export interface User {
    id: string;
    email: string;
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string;
    rol: 'admin' | 'user';
    es_administrador: boolean;
}

// ============ Encoding Face Types ============
export interface EncodingFaceResponseDTO {
    id: string; // UUID
    personal_id: string; // UUID
    vector: number[];
    embedding_model: string;
    version: string;
}

export interface EncodingFaceCreateDTO {
    personal_id: string; // UUID
    vector: number[];
    embedding_model?: string;
    version?: string;
}

// ============ Asistencia Types ============
export interface RegistrarAsistenciaDTO {
    personal_id: string; // UUID
    reconocimiento_valido: boolean;
    motivo?: string | null;
}

export interface Asistencia {
    id: number;
    personal_id: string;
    fecha: string;
    hora_entrada: string;
    hora_salida?: string;
    estado: 'presente' | 'ausente' | 'tardanza';
}

// ============ Password Recovery Types ============
export interface RecoverRequestDTO {
    email: string;
    base_url: string;
}

export interface ResetPasswordDTO {
    password: string;
}

// ============ Permiso Types ============
export interface Permiso {
    id: number;
    personal_id: string;
    tipo: string;
    fecha_inicio: string;
    fecha_fin: string;
    motivo: string;
    estado: 'pendiente' | 'aprobado' | 'rechazado';
}

// ============ Error Types ============
export interface ValidationError {
    loc: (string | number)[];
    msg: string;
    type: string;
}

export interface HTTPValidationError {
    detail: ValidationError[];
}

export interface ApiError {
    detail: string | ValidationError[];
}
