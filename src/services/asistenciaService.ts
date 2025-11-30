import { apiRequest } from './api';
import type { Asistencia } from '../types';

// Asistencia Service
export const asistenciaService = {
    // Get all asistencias
    async getAll(): Promise<Asistencia[]> {
        return await apiRequest<Asistencia[]>('/asistencias', {}, true);
    },

    // Get asistencias by personal ID
    async getByPersonalId(personalId: number): Promise<Asistencia[]> {
        return await apiRequest<Asistencia[]>(`/asistencias/personal/${personalId}`, {}, true);
    },

    // Get asistencias by date range
    async getByDateRange(startDate: string, endDate: string): Promise<Asistencia[]> {
        return await apiRequest<Asistencia[]>(
            `/asistencias?start_date=${startDate}&end_date=${endDate}`,
            {},
            true
        );
    },

    // Register entrada
    async registrarEntrada(personalId: number): Promise<Asistencia> {
        return await apiRequest<Asistencia>(
            '/asistencias/entrada',
            {
                method: 'POST',
                body: JSON.stringify({ personal_id: personalId }),
            },
            true
        );
    },

    // Register salida
    async registrarSalida(asistenciaId: number): Promise<Asistencia> {
        return await apiRequest<Asistencia>(
            `/asistencias/${asistenciaId}/salida`,
            {
                method: 'PUT',
            },
            true
        );
    },
};
