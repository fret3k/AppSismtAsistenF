// Types for API responses and data structures

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

export interface User {
    id: number;
    email: string;
    nombre: string;
    rol: 'admin' | 'user';
}

export interface Personal {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    cargo: string;
    departamento: string;
    fecha_ingreso: string;
    estado: 'activo' | 'inactivo';
}

export interface Asistencia {
    id: number;
    personal_id: number;
    fecha: string;
    hora_entrada: string;
    hora_salida?: string;
    estado: 'presente' | 'ausente' | 'tardanza';
}

export interface Permiso {
    id: number;
    personal_id: number;
    tipo: string;
    fecha_inicio: string;
    fecha_fin: string;
    motivo: string;
    estado: 'pendiente' | 'aprobado' | 'rechazado';
}

export interface ApiError {
    detail: Array<{
        loc: string[];
        msg: string;
        type: string;
    }>;
}
