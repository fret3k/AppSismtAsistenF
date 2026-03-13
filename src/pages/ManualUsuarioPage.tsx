
import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { REPORT_IMAGES } from '../utils/reportImages';
import Icon from '../components/Icon';
import './ManualUsuarioPage.css';

const ManualUsuarioPage: React.FC = () => {

    // Función para generar el encabezado estándar en cada página
    const addHeader = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const centerX = pageWidth / 2;

        try {
            // 1. Escudo (Izquierda)
            if (REPORT_IMAGES.ESCUDO_PERU) {
                doc.addImage(REPORT_IMAGES.ESCUDO_PERU, 'PNG', 14, 10, 18, 20);
            }

            // 2. Logo PJ (Centro - Arriba)
            if (REPORT_IMAGES.LOGO_PJ) {
                doc.addImage(REPORT_IMAGES.LOGO_PJ, 'PNG', centerX - 10, 8, 20, 18);
            }

            // 3. Logo Bicentenario (Derecha)
            if (REPORT_IMAGES.LOGO_BICENTENARIO) {
                doc.addImage(REPORT_IMAGES.LOGO_BICENTENARIO, 'PNG', pageWidth - 40, 10, 25, 12);
            }
        } catch (error) {
            console.error("Error adding images to PDF:", error);
        }

        // Títulos Centrales
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Corte Superior de Justicia de Apurimac", centerX, 35, { align: 'center' });

        doc.setFontSize(12);
        doc.text("Administracion del Modulo Penal de Abancay", centerX, 42, { align: 'center' });

        // Frase "Decenio..."
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(80);
        doc.text('"Decenio de la Igualdad de oportunidades para mujeres y hombres"', centerX, 52, { align: 'center' });
        doc.text('"Año de la recuperación y consolidación de la economía peruana"', centerX, 57, { align: 'center' });

        // Línea separadora
        doc.setDrawColor(200);
        doc.line(14, 62, pageWidth - 14, 62);
    };

    const generarManualPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);

        const addFooter = () => {
            const totalPages = doc.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
            }
        };

        const drawUIBox = (x: number, y: number, w: number, h: number, title: string) => {
            doc.setDrawColor(200);
            doc.setFillColor(250, 250, 250);
            doc.roundedRect(x, y, w, h, 2, 2, 'FD');
            doc.setFillColor(230, 235, 255);
            doc.roundedRect(x, y, w, 8, 2, 2, 'F');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(50, 50, 150);
            doc.text(title, x + 5, y + 5);
        };

        // --- PÁGINA 1: PORTADA ---
        doc.setFillColor(245, 247, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setFillColor(102, 126, 234);
        doc.triangle(0, 0, pageWidth, 0, 0, 80, 'F');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(32);
        doc.setTextColor(255, 255, 255);
        doc.text("SICAF", margin, 40);
        doc.setFontSize(14);
        doc.text("Sistema Integral de Control de Asistencia Facial", margin, 50);

        doc.setFontSize(40);
        doc.setTextColor(102, 126, 234);
        doc.text("MANUAL DE\nUSUARIO", margin, 120);
        doc.setFontSize(18);
        doc.setTextColor(100);
        doc.text("Perfil: Administrador", margin, 150);

        doc.setFontSize(11);
        doc.setTextColor(80);
        doc.text("Corte Superior de Justicia de Apurimac\n2024", margin, 260);

        // --- PÁGINA 2: ÍNDICE ---
        doc.addPage();
        addHeader(doc);
        doc.setFontSize(18);
        doc.setTextColor(102, 126, 234);
        doc.text("Contenido Detallado", margin, 75);

        const indexData = [
            ["1. Introducción y Arquitectura", "3"],
            ["2. Acceso y Seguridad", "4"],
            ["3. Panel Principal (Dashboard)", "5"],
            ["4. Gestión de Personal (CRUD)", "6"],
            ["5. Proceso de Captura Biométrica", "7"],
            ["6. Control de Asistencias Diario", "8"],
            ["7. Historial y Exportación CSV/Excel", "9"],
            ["8. Gestión de Papeletas de Permisos", "10"],
            ["9. Configuración de API Facial", "11"],
            ["10. Soporte y Solución de Fallos", "12"]
        ];

        autoTable(doc, {
            startY: 85,
            body: indexData,
            theme: 'plain',
            styles: { fontSize: 11 },
            columnStyles: { 1: { halign: 'right' } }
        });

        // --- PÁGINA 3: INTRODUCCIÓN ---
        doc.addPage();
        addHeader(doc);
        let yPos = 75;
        doc.setFontSize(14);
        doc.text("1. Introducción al Sistema", margin, yPos);
        yPos += 10;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const introText = "El sistema SICAF utiliza tecnología de reconocimiento facial impulsada por inteligencia artificial (TensorFlow.js) para garantizar que el registro de jornada laboral sea preciso y personal. Este manual detalla los procedimientos que el Administrador debe realizar para mantener la integridad de los datos y el correcto funcionamiento de los puntos de control.";
        doc.text(doc.splitTextToSize(introText, contentWidth), margin, yPos);

        yPos += 30;
        doc.setFont("helvetica", "bold");
        doc.text("Arquitectura:", margin, yPos);
        yPos += 7;
        autoTable(doc, {
            startY: yPos,
            head: [['Capa', 'Tecnología']],
            body: [['Frontend', 'React 19'], ['Backend', 'FastAPI / Python'], ['Base de Datos', 'Supabase (PostgreSQL)']],
            theme: 'grid'
        });

        // --- PÁGINA 4: ACCESO Y SEGURIDAD ---
        doc.addPage();
        addHeader(doc);
        yPos = 75;
        doc.setFontSize(14);
        doc.text("2. Acceso y Seguridad", margin, yPos);
        yPos += 10;
        doc.setFontSize(11);
        doc.text("El acceso está restringido a usuarios con rol administrativo autenticados mediante correo institucional. Se recomienda cambiar la contraseña periódicamente.", margin, yPos, { maxWidth: contentWidth });
        yPos += 20;
        drawUIBox(margin + 30, yPos, 80, 50, "Interfaz de Login");

        // --- PÁGINA 5: DASHBOARD ---
        doc.addPage();
        addHeader(doc);
        yPos = 75;
        doc.setFontSize(14);
        doc.text("3. Panel de Control Administrativo", margin, yPos);
        yPos += 10;
        doc.setFontSize(11);
        doc.text("El administrador tiene una vista global de las estadísticas de asistencia del día, solicitudes pendientes y alertas de tardanzas.", margin, yPos, { maxWidth: contentWidth });

        yPos += 20;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200);
        doc.roundedRect(margin, yPos, 50, 25, 2, 2, 'FD');
        doc.text("124", margin + 10, yPos + 18);
        doc.setFontSize(8); doc.text("TOTAL PERSONAL", margin + 10, yPos + 8);

        doc.setFontSize(11);
        yPos += 40;
        doc.text("Secciones:", margin, yPos);
        yPos += 7;
        doc.text(["- Estadísticas Rápidas", "- Historial de Marcaciones Recientes", "- Accesos Directos a Módulos"], margin + 5, yPos);

        // --- PÁGINA 6: GESTIÓN DE PERSONAL ---
        doc.addPage();
        addHeader(doc);
        yPos = 75;
        doc.setFontSize(14);
        doc.text("4. Gestión de Personal (Base de Datos)", margin, yPos);
        yPos += 10;
        doc.setFontSize(11);
        doc.text("Desde este módulo se gestiona el alta de nuevos empleados. Cada registro debe contar obligatoriamente con el DNI, nombres completos, cargo y dependencia.", margin, yPos, { maxWidth: contentWidth });
        yPos += 20;
        autoTable(doc, {
            startY: yPos,
            head: [['Campo', 'Requerido', 'Validación']],
            body: [['DNI', 'SI', '8 dígitos numéricos'], ['Nombres', 'SI', 'Texto'], ['Cargo', 'SI', 'Selección de lista']],
            theme: 'grid'
        });

        // --- PÁGINA 7: ENROLAMIENTO FACIAL ---
        doc.addPage();
        addHeader(doc);
        yPos = 75;
        doc.setFontSize(14);
        doc.text("5. Proceso de Enrolamiento Facial", margin, yPos);
        yPos += 10;
        doc.setFontSize(11);
        doc.text("Este es el paso más crítico. Se captura el rostro del colaborador mediante la cámara web. El sistema genera un 'embedding' (vector numérico) que NO es una foto, sino una representación matemática única.", margin, yPos, { maxWidth: contentWidth });

        yPos += 25;
        doc.setFillColor(0, 0, 0);
        doc.rect(margin + 40, yPos, 80, 60, 'F');
        doc.setDrawColor(0, 255, 0);
        doc.rect(margin + 60, yPos + 15, 40, 35);
        doc.setTextColor(0, 255, 0); doc.setFontSize(7);
        doc.text("DETECCIÓN OK", margin + 65, yPos + 10);

        // --- PÁGINA 8: CONTROL DE ASISTENCIAS ---
        doc.addPage();
        addHeader(doc);
        yPos = 75;
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("6. Monitoreo de Asistencias Diario", margin, yPos);
        yPos += 10;
        doc.setFontSize(11);
        doc.text("Muestra el estado en tiempo real del personal. El sistema asigna automáticamente estados basados en el horario configurado:", margin, yPos, { maxWidth: contentWidth });
        yPos += 15;
        autoTable(doc, {
            startY: yPos,
            body: [['Puntual', 'Ingreso antes de la tolerancia'], ['Tardanza', 'Ingreso después de la tolerancia'], ['Falta', 'No se registra marcación']],
            theme: 'grid',
            styles: { fontSize: 10 }
        });

        // --- PÁGINA 9: EXPORTACIÓN ---
        doc.addPage();
        addHeader(doc);
        yPos = 75;
        doc.setFontSize(14);
        doc.text("7. Exportación y Reportes Mensuales", margin, yPos);
        yPos += 10;
        doc.setFontSize(11);
        doc.text("Los datos pueden ser exportados a Excel para su uso en planillas. El reporte consolidado incluye el total de minutos de tardanza y días asistidos por colaborador.", margin, yPos, { maxWidth: contentWidth });

        // --- PÁGINA 10: PERMISOS ---
        doc.addPage();
        addHeader(doc);
        yPos = 75;
        doc.setFontSize(14);
        doc.text("8. Gestión de Papeletas de Permisos", margin, yPos);
        yPos += 10;
        doc.text("Las solicitudes deben ser aprobadas por el administrador para que el sistema permita la marcación de salida por comisión o salud.", margin, yPos, { maxWidth: contentWidth });

        // --- PÁGINA 11: CONFIGURACIÓN BIOMÉTRICA ---
        doc.addPage();
        addHeader(doc);
        yPos = 75;
        doc.setFontSize(14);
        doc.text("9. Configuración Técnica de IA", margin, yPos);
        yPos += 10;
        doc.text("Parámetros ajustables:\n- Umbral de Similitud (0.4 - 0.6)\n- Prueba de Sonrisa (Detección de vida)\n- Margen de área facial", margin, yPos);

        // --- PÁGINA 12: TROUBLESHOOTING ---
        doc.addPage();
        addHeader(doc);
        yPos = 75;
        doc.setFontSize(14);
        doc.text("10. Resolución de Problemas", margin, yPos);
        yPos += 10;
        autoTable(doc, {
            startY: yPos,
            head: [['Error', 'Solución']],
            body: [['No reconoce rostro', 'Mejorar iluminación o re-enrolar'], ['Cámara negra', 'Verificar permisos de navegador'], ['Error de servidor', 'Comprobar conexión a internet']],
            theme: 'striped'
        });

        // Footer y guardado
        addFooter();
        doc.save("Manual_Administrador_Completo_SICAF.pdf");
    };

    return (
        <div className="manual-page">
            <div className="manual-header">
                <h1>Manual de Usuario - Administrador</h1>
                <p>Generación de documentación técnica y operativa del sistema</p>
            </div>

            <div className="manual-card">
                <div className="manual-icon-area">
                    <Icon name="book-open" size={64} color="#4f46e5" />
                </div>

                <div className="manual-content">
                    <h3>Documentación Oficial SICAF</h3>
                    <p>
                        Haga clic en el botón a continuación para generar y descargar el manual completo del administrador en formato PDF.
                        Este documento incluye especificaciones sobre módulos de personal, asistencia, permisos y configuración.
                    </p>

                    <button className="btn-download-manual" onClick={generarManualPDF}>
                        <Icon name="download" size={20} />
                        Descargar Manual en PDF
                    </button>
                </div>
            </div>

            <div className="manual-preview-grid">
                <div className="preview-item">
                    <Icon name="users" size={24} />
                    <h4>Gestión de Personal</h4>
                    <p>Altas, bajas y enrolamiento facial de colaboradores.</p>
                </div>
                <div className="preview-item">
                    <Icon name="activity" size={24} />
                    <h4>Monitoreo</h4>
                    <p>Control de tiempos, tardanzas y faltas en tiempo real.</p>
                </div>
                <div className="preview-item">
                    <Icon name="settings" size={24} />
                    <h4>Configuración</h4>
                    <p>Ajuste de horarios, umbrales y parámetros del sistema.</p>
                </div>
            </div>
        </div>
    );
};

export default ManualUsuarioPage;
