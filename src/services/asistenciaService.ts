import { apiRequest } from './api';
import type { Asistencia, RegistrarAsistenciaDTO } from '../types';

// Asistencia Service - Operations for attendance management
export const asistenciaService = {
    // Register new asistencia - POST /asistencia/registrar
    async registrar(data: RegistrarAsistenciaDTO): Promise<void> {
        await apiRequest<void>(
            '/asistencia/registrar',
            {
                method: 'POST',
                body: JSON.stringify(data),
            },
            true
        );
    },

    // Get all asistencias (if endpoint exists in the future)
    async getAll(): Promise<Asistencia[]> {
        return await apiRequest<Asistencia[]>('/asistencias', {}, true);
    },

    // Get asistencias by personal ID (if endpoint exists in the future)
    async getByPersonalId(personalId: string): Promise<Asistencia[]> {
        return await apiRequest<Asistencia[]>(`/asistencias/personal/${personalId}`, {}, true);
    },

    // Get asistencias by date range (if endpoint exists in the future)
    async getByDateRange(startDate: string, endDate: string): Promise<Asistencia[]> {
        return await apiRequest<Asistencia[]>(
            `/asistencias?start_date=${startDate}&end_date=${endDate}`,
            {},
            true
        );
    },
};
