import { apiRequest } from './api';
import type {
    PersonalStatusDTO,
    HistorialAsistenciaDTO,
    EstadisticasDiaDTO,
    RegistrarAsistenciaDTO
} from '../types';

export const asistenciaService = {
    // GET /asistencia/personal?fecha={fecha}
    // Lista el estado de todo el personal para un día específico
    async getPersonalStatus(fecha?: string): Promise<PersonalStatusDTO[]> {
        const query = fecha ? `?fecha=${fecha}` : '';
        return await apiRequest<PersonalStatusDTO[]>(`/asistencia/personal${query}`, {}, true);
    },

    // GET /asistencia/historial?fecha_inicio={start}&fecha_fin={end}&personal_id={id}
    // Obtiene el historial detallado
    async getHistorial(fechaInicio: string, fechaFin: string, personalId?: string): Promise<HistorialAsistenciaDTO[]> {
        let query = `?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
        if (personalId) {
            query += `&personal_id=${personalId}`;
        }
        return await apiRequest<HistorialAsistenciaDTO[]>(`/asistencia/historial${query}`, {}, true);
    },

    // GET /asistencia/estadisticas?fecha={fecha}
    async getEstadisticas(fecha?: string): Promise<EstadisticasDiaDTO> {
        const query = fecha ? `?fecha=${fecha}` : '';
        return await apiRequest<EstadisticasDiaDTO>(`/asistencia/estadisticas${query}`, {}, true);
    },

    // POST /asistencia/registrar
    // Marcación manual
    async registrarManual(data: RegistrarAsistenciaDTO): Promise<any> {
        return await apiRequest<any>(
            '/asistencia/registrar',
            {
                method: 'POST',
                body: JSON.stringify(data),
            },
            true
        );
    },

    // GET /asistencia/recientes?limite={limite}
    async getRecientes(limite: number = 5): Promise<any> {
        return await apiRequest<any>(`/asistencia/recientes?limite=${limite}`, {}, true);
    }
};
