import { apiRequest } from './api';
import type { ReporteMensualItem } from '../types';

export const reportesService = {
    // GET /reportes/mensual?mes={mes}&anio={anio}&personal_id={personalId}
    async getReporteMensual(mes: number, anio: number, personalId?: string): Promise<ReporteMensualItem[]> {
        let query = `?mes=${mes}&anio=${anio}`;
        if (personalId) {
            query += `&personal_id=${personalId}`;
        }
        return await apiRequest<ReporteMensualItem[]>(`/reportes/mensual${query}`, {}, true);
    }
};
