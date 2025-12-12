import { apiRequest } from './api';
import type {
    PersonalResponseDTO,
    PersonalCreateDTO,
    PersonalUpdateDTO,
    PersonalRegisterWithEncodingDTO,
    PersonalRegisterWithEncodingResponse,
    PersonalUpdateWithEncodingDTO
} from '../types';
import { encodingFaceService } from './encodingFaceService';

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

    // Update personal - PATCH /personal/{personal_id}
    async update(id: string, data: PersonalUpdateDTO): Promise<PersonalResponseDTO> {
        return await apiRequest<PersonalResponseDTO>(
            `/personal/${id}`,
            {
                method: 'PATCH',
                body: JSON.stringify(data),
            },
            true
        );
    },

    // Update personal with encoding handling
    async updateWithEncoding(id: string, data: PersonalUpdateWithEncodingDTO): Promise<PersonalResponseDTO> {
        // 1. Update personal details
        const { embedding, ...personalData } = data;
        const updatedPersonal = await this.update(id, personalData);

        // 2. If embedding is provided, update it
        if (embedding && embedding.length > 0) {
            try {
                // Get existing encodings
                const existingEncodings = await encodingFaceService.getByPersonalId(id);

                // Delete existing encodings
                for (const encoding of existingEncodings) {
                    await encodingFaceService.delete(encoding.id);
                }

                // Create new encoding
                await encodingFaceService.create({
                    personal_id: id,
                    embedding: embedding,
                    embedding_model: 'face_api_js_standard',
                    version: '1.0'
                });
            } catch (error) {
                console.error('Error updating face encoding:', error);
                // We don't throw here to avoid failing the whole update if only encoding fails,
                // but strictly speaking we might want to warn the user.
                // For now, logging is sufficient as the personal data was updated.
            }
        }
        return updatedPersonal;
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
