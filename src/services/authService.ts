import { apiRequest } from './api';
import type { LoginRequest, LoginResponse } from '../types';

// Authentication Service
export const authService = {
    // Login
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const response = await apiRequest<LoginResponse>(
            '/personal/login',
            {
                method: 'POST',
                body: JSON.stringify(credentials),
            },
            false
        );

        // Store token in localStorage
        if (response.access_token) {
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('token_type', response.token_type);
        }

        return response;
    },

    // Logout
    logout(): void {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_type');
        localStorage.removeItem('user');
    },

    // Check if user is authenticated
    isAuthenticated(): boolean {
        return !!localStorage.getItem('access_token');
    },

    // Get current token
    getToken(): string | null {
        return localStorage.getItem('access_token');
    },

    /**
     * Solicita la recuperación de contraseña mediante envío de email.
     * Genera un token temporal de recuperación y envía un correo electrónico.
     * El token expira en 60 minutos.
     * 
     * @param email - Correo electrónico del personal
     * @param baseUrl - URL base de la aplicación para generar el link de reset
     */
    async forgotPassword(email: string, baseUrl: string): Promise<{ message: string }> {
        return await apiRequest<{ message: string }>(
            '/personal/forgot-password',
            {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    base_url: baseUrl
                }),
            },
            false
        );
    },

    /**
     * Restablece la contraseña usando un token de recuperación válido.
     * El token debe ser válido y no haber expirado (60 minutos desde su generación).
     * 
     * @param token - Token de recuperación recibido por email
     * @param password - Nueva contraseña (mínimo 8 caracteres)
     */
    async resetPassword(token: string, password: string): Promise<{ message: string }> {
        return await apiRequest<{ message: string }>(
            `/personal/reset/${token}`,
            {
                method: 'POST',
                body: JSON.stringify({
                    password
                }),
            },
            false
        );
    },
};
