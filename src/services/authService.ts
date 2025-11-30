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
};
