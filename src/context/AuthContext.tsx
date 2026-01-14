import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/authService';
import { personalService } from '../services/personalService';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        const storedUser = localStorage.getItem('user');
        if (storedUser && authService.isAuthenticated()) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            // Attempt to load photo separately to keep the session small
            loadUserPhoto(parsedUser.id);
        }
        setLoading(false);
    }, []);

    const loadUserPhoto = async (userId: string) => {
        try {
            const photoData = await personalService.getFoto(userId);
            if (photoData && photoData.foto_base64) {
                updateUser({ foto_base64: photoData.foto_base64 });
            }
        } catch (error) {
            console.error('Error loading user photo:', error);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            // Step 1: Login and get access token + personal data
            const loginResponse = await authService.login({ email, password });

            // Step 2: Convert PersonalResponseDTO to User (data comes directly from login response)
            const userData: User = {
                id: loginResponse.personal.id,
                email: loginResponse.personal.email,
                nombre: loginResponse.personal.nombre,
                apellido_paterno: loginResponse.personal.apellido_paterno,
                apellido_materno: loginResponse.personal.apellido_materno,
                rol: loginResponse.personal.es_administrador ? 'admin' : 'user',
                es_administrador: loginResponse.personal.es_administrador,
            };

            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));

            // Step 3: Load photo
            await loadUserPhoto(userData.id);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        localStorage.removeItem('user');
    };

    // Update user data locally after profile update
    const updateUser = (userData: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...userData };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isAdmin: user?.rol === 'admin',
        login,
        logout,
        updateUser,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
