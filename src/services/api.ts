// API Base Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper function to get auth token
const getAuthToken = (): string | null => {
    return localStorage.getItem('access_token');
};

// Helper function to create headers
const createHeaders = (includeAuth: boolean = false): HeadersInit => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (includeAuth) {
        const token = getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
};

// Custom API Error class to hold detailed error information
export class ApiError extends Error {
    public status: number;
    public detail: string;
    public errores: Array<{ campo: string; mensaje: string; tipo_error: string }>;

    constructor(
        message: string,
        status: number,
        detail: string,
        errores: Array<{ campo: string; mensaje: string; tipo_error: string }> = []
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.detail = detail;
        this.errores = errores;
    }

    // Get a user-friendly error message
    getFormattedMessage(): string {
        if (this.errores && this.errores.length > 0) {
            return this.errores
                .map(e => `${this.formatFieldName(e.campo)}: ${e.mensaje}`)
                .join('\n');
        }
        return this.detail || this.message;
    }

    // Format field names for display
    private formatFieldName(campo: string): string {
        // Convert "body -> email" to "Email"
        const fieldName = campo.replace('body -> ', '').replace('body->', '');
        const fieldMap: Record<string, string> = {
            'dni': 'DNI',
            'nombre': 'Nombre',
            'apellido_paterno': 'Apellido Paterno',
            'apellido_materno': 'Apellido Materno',
            'email': 'Email',
            'password': 'Contraseña',
            'es_administrador': 'Es Administrador',
            'embedding': 'Codificación Facial',
        };
        return fieldMap[fieldName] || fieldName;
    }
}

// Generic API request handler
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    requiresAuth: boolean = false
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = createHeaders(requiresAuth);

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();

            // Handle the new error format with 'errores' array
            if (errorData.errores && Array.isArray(errorData.errores)) {
                throw new ApiError(
                    errorData.detail || 'Error de validación',
                    response.status,
                    errorData.detail,
                    errorData.errores
                );
            }

            // Handle standard error format
            const detail = typeof errorData.detail === 'string'
                ? errorData.detail
                : 'Error en la solicitud';

            throw new ApiError(detail, response.status, detail, []);
        }

        return await response.json();
    } catch (error) {
        if (error instanceof ApiError) {
            console.error('API Error:', error.getFormattedMessage());
            throw error;
        }
        console.error('Network Error:', error);
        throw new ApiError(
            'Error de conexión con el servidor',
            0,
            'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
            []
        );
    }
}

export { API_BASE_URL, getAuthToken, apiRequest };
