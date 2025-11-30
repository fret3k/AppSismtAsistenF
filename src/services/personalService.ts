import { apiRequest } from './api';
import type { Personal } from '../types';

// Personal Service - CRUD operations
export const personalService = {
    // Get all personal
    async getAll(): Promise<Personal[]> {
        return await apiRequest<Personal[]>('/personal', {}, true);
    },

    // Get personal by ID
    async getById(id: number): Promise<Personal> {
        return await apiRequest<Personal>(`/personal/${id}`, {}, true);
    },

    // Create new personal
    async create(data: Omit<Personal, 'id'>): Promise<Personal> {
        return await apiRequest<Personal>(
            '/personal',
            {
                method: 'POST',
                body: JSON.stringify(data),
            },
            true
        );
    },

    // Update personal
    async update(id: number, data: Partial<Personal>): Promise<Personal> {
        return await apiRequest<Personal>(
            `/personal/${id}`,
            {
                method: 'PUT',
                body: JSON.stringify(data),
            },
            true
        );
    },

    // Delete personal
    async delete(id: number): Promise<void> {
        return await apiRequest<void>(
            `/personal/${id}`,
            {
                method: 'DELETE',
            },
            true
        );
    },
};
