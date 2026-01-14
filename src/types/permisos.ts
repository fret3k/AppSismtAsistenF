export interface SolicitudAusencia {
    id: string;
    personal_id: string;
    tipo_ausencia: 'VACACIONES' | 'ENFERMEDAD' | 'PERSONAL' | 'OTRO';
    fecha_inicio: string; // ISO Date YYYY-MM-DD
    fecha_fin: string; // ISO Date YYYY-MM-DD
    hora_inicio?: string; // HH:MM:SS
    hora_fin?: string; // HH:MM:SS
    razon: string;
    estado_solicitud: 'PENDIENTE' | 'APROBADA' | 'DENEGADA' | 'ANULADA';
    fecha_solicitud: string; // ISO Datetime
    // Optional additional fields returned by the API
    numero_boleta?: string;
    codigos?: string[];
}

export interface SolicitudAusenciaCreate {
    personal_id: string;
    tipo_ausencia: string;
    fecha_inicio: string;
    fecha_fin: string;
    hora_inicio?: string;
    hora_fin?: string;
    razon: string;
    // Optional fields sent from the frontend
    numero_boleta?: string;
    codigos?: string[];
}

export interface SolicitudAusenciaUpdate {
    estado_solicitud: string;
}
