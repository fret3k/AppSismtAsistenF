import { apiRequest } from './api';
import type { Permiso } from '../types';

// Permiso Service
export const permisoService = {
    // Get all permisos
    async getAll(): Promise<Permiso[]> {
        return await apiRequest<Permiso[]>('/permisos', {}, true);
    },

    // Get permisos by personal ID
    async getByPersonalId(personalId: number): Promise<Permiso[]> {
        return await apiRequest<Permiso[]>(`/permisos/personal/${personalId}`, {}, true);
    },

    // Create new permiso
    async create(data: Omit<Permiso, 'id'>): Promise<Permiso> {
        return await apiRequest<Permiso>(
            '/permisos',
            {
                method: 'POST',
                body: JSON.stringify(data),
            },
            true
        );
    },

    // Approve permiso
    async aprobar(id: number): Promise<Permiso> {
        return await apiRequest<Permiso>(
            `/permisos/${id}/aprobar`,
            {
                method: 'PUT',
            },
            true
        );
    },

    // Reject permiso
    async rechazar(id: number): Promise<Permiso> {
        return await apiRequest<Permiso>(
            `/permisos/${id}/rechazar`,
            {
                method: 'PUT',
            },
            true
        );
    },
};
