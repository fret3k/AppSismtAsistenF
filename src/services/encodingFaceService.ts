import { apiRequest } from './api';
import type { EncodingFaceResponseDTO, EncodingFaceCreateDTO } from '../types';

// Encoding Face Service - CRUD operations for facial encodings
export const encodingFaceService = {
    // Get all encoding faces - GET /encoding-face/
    async getAll(): Promise<EncodingFaceResponseDTO[]> {
        return await apiRequest<EncodingFaceResponseDTO[]>('/encoding-face/', {}, true);
    },

    // Get encoding face by ID - GET /encoding-face/{id}
    async getById(id: string): Promise<EncodingFaceResponseDTO> {
        return await apiRequest<EncodingFaceResponseDTO>(`/encoding-face/${id}`, {}, true);
    },

    // Get encoding faces by personal ID - GET /encoding-face/personal/{personal_id}
    async getByPersonalId(personalId: string): Promise<EncodingFaceResponseDTO[]> {
        return await apiRequest<EncodingFaceResponseDTO[]>(
            `/encoding-face/personal/${personalId}`,
            {},
            true
        );
    },

    // Create new encoding face - POST /encoding-face/
    async create(data: EncodingFaceCreateDTO): Promise<EncodingFaceResponseDTO> {
        return await apiRequest<EncodingFaceResponseDTO>(
            '/encoding-face/',
            {
                method: 'POST',
                body: JSON.stringify(data),
            },
            true
        );
    },

    // Delete encoding face - DELETE /encoding-face/{id}
    async delete(id: string): Promise<void> {
        await apiRequest<void>(
            `/encoding-face/${id}`,
            {
                method: 'DELETE',
            },
            true
        );
    },
};
