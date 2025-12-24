import { apiRequest } from './api';
import type { SolicitudAusencia, SolicitudAusenciaCreate } from '../types/permisos';

export const permisosService = {
    getAll: async (): Promise<SolicitudAusencia[]> => {
        return await apiRequest<SolicitudAusencia[]>('/solicitudes-ausencias/');
    },

    getByPersonal: async (personalId: string): Promise<SolicitudAusencia[]> => {
        return await apiRequest<SolicitudAusencia[]>(`/solicitudes-ausencias/personal/${personalId}`);
    },

    create: async (data: SolicitudAusenciaCreate): Promise<SolicitudAusencia> => {
        return await apiRequest<SolicitudAusencia>('/solicitudes-ausencias/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateStatus: async (id: string, status: string): Promise<SolicitudAusencia> => {
        return await apiRequest<SolicitudAusencia>(`/solicitudes-ausencias/${id}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ estado_solicitud: status }),
        });
    }
};
