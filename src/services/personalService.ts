import { apiRequest } from './api';
import type {
    PersonalResponseDTO,
    PersonalCreateDTO,
    PersonalRegisterWithEncodingDTO,
    PersonalRegisterWithEncodingResponse
} from '../types';

// Personal Service - CRUD operations for consuming the API
export const personalService = {
    // Get all personal - GET /personal/
    async getAll(): Promise<PersonalResponseDTO[]> {
        return await apiRequest<PersonalResponseDTO[]>('/personal/', {}, true);
    },

    // Get personal by ID - GET /personal/{personal_id}
    async getById(id: string): Promise<PersonalResponseDTO> {
        return await apiRequest<PersonalResponseDTO>(`/personal/${id}`, {}, true);
    },

    // Create new personal - POST /personal/
    async create(data: PersonalCreateDTO): Promise<PersonalResponseDTO> {
        return await apiRequest<PersonalResponseDTO>(
            '/personal/',
            {
                method: 'POST',
                body: JSON.stringify(data),
            },
            true
        );
    },

    // Register personal with face encoding - POST /personal/register-with-encoding
    async registerWithEncoding(data: PersonalRegisterWithEncodingDTO): Promise<PersonalRegisterWithEncodingResponse> {
        return await apiRequest<PersonalRegisterWithEncodingResponse>(
            '/personal/register-with-encoding',
            {
                method: 'POST',
                body: JSON.stringify(data),
            },
            true
        );
    },

    // Delete personal - DELETE /personal/{personal_id}
    async delete(id: string): Promise<void> {
        await apiRequest<void>(
            `/personal/${id}`,
            {
                method: 'DELETE',
            },
            true
        );
    },
};
