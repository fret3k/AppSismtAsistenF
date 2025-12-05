import { apiRequest } from './api';

// Types for schedule management - adjusted to actual API response
export interface HorarioEntrada {
    a_tiempo: string;      // On-time limit (HH:MM format)
    tarde: string;         // Late threshold
}

export interface HorarioSalida {
    limite_temprano: string; // Early exit limit
}

export interface Horarios {
    ENTRADA_M: HorarioEntrada;  // Morning entry
    SALIDA_M: HorarioSalida;    // Morning exit
    ENTRADA_T: HorarioEntrada;  // Afternoon entry
    SALIDA_T: HorarioSalida;    // Afternoon exit
}

// Horarios Service - GET and PUT operations
export const horariosService = {
    // Get all schedules - GET /horarios/
    async getAll(): Promise<Horarios> {
        return await apiRequest<Horarios>('/horarios/', {}, true);
    },

    // Update schedules - PUT /horarios/
    async update(data: Horarios): Promise<string> {
        return await apiRequest<string>(
            '/horarios/',
            {
                method: 'PUT',
                body: JSON.stringify(data),
            },
            true
        );
    },
};
