const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable');
// The library jspdf-autotable might need to be called as a function on doc or imported differently depending on version.
// For modern versions in Node:
const applyAutoTable = require('jspdf-autotable').default || require('jspdf-autotable');
const fs = require('fs');
const path = require('path');

// Logos (Base64 placeholders - in a real scenario we'd use the ones from reportImages.ts)
// For the sake of the exercise, I will assume the library is installed and we can use it.
// I'll define a few helper colors
const COLORS = {
    PRIMARY: [102, 126, 234], // Blauish
    SECONDARY: [79, 70, 229], // Indigo
    TEXT: [51, 51, 51],
    LIGHT_TEXT: [107, 114, 128],
    BORDER: [229, 231, 235],
    SUCCESS: [16, 185, 129],
    WARNING: [245, 158, 11],
    DANGER: [239, 68, 68]
};

async function generateManual() {
    console.log('Iniciando generación de manual...');
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // --- FUNCIONES DE APOYO ---
    const drawUIBox = (x, y, w, h, title) => {
        doc.setDrawColor(200);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(x, y, w, h, 2, 2, 'FD');

        // Header de la "interfaz"
        doc.setFillColor(230, 235, 255);
        doc.roundedRect(x, y, w, 8, 2, 2, 'F');
        doc.rect(x, y + 6, w, 2, 'F'); // Aplanar la parte inferior del redondeado superior

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(50, 50, 150);
        doc.text(title, x + 5, y + 5);

        // Puntitos de "ventana"
        doc.setFillColor(255, 100, 100); doc.circle(x + w - 5, y + 4, 1, 'F');
        doc.setFillColor(255, 200, 100); doc.circle(x + w - 9, y + 4, 1, 'F');
        doc.setFillColor(100, 200, 100); doc.circle(x + w - 13, y + 4, 1, 'F');
    };

    const addFooter = () => {
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text(`Manual del Administrador - SICAF | Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        }
    };

    const addPageHeader = (title) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
        doc.text(title.toUpperCase(), margin, 30);
        doc.setDrawColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, 32, margin + 40, 32);
        doc.setLineWidth(0.1);
    };

    // --- PÁGINA 1: PORTADA ---
    doc.setFillColor(245, 247, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decoración de portada
    doc.setFillColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
    doc.triangle(0, 0, pageWidth, 0, 0, 80, 'F');
    doc.setFillColor(COLORS.SECONDARY[0], COLORS.SECONDARY[1], COLORS.SECONDARY[2]);
    doc.triangle(pageWidth, pageHeight, pageWidth, pageHeight - 100, pageWidth - 120, pageHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text('SICAF', margin, 40);

    doc.setFontSize(14);
    doc.text('Sistema Integral de Control de Asistencia Facial', margin, 50);

    doc.setFontSize(40);
    doc.setTextColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
    doc.text('MANUAL DE\nUSUARIO', margin, 120);

    doc.setFontSize(18);
    doc.setTextColor(100);
    doc.text('Perfil: Administrador de Sistema', margin, 150);

    doc.setDrawColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
    doc.setLineWidth(2);
    doc.line(margin, 160, margin + 100, 160);

    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text('Corte Superior de Justicia de Apurímac\nAdministración del Módulo Penal de Abancay\nVersión 1.5 - 2024', margin, 260);

    // --- PÁGINA 2: ÍNDICE ---
    doc.addPage();
    addPageHeader('Índice de Contenidos');

    const index = [
        ['1. Introducción al Sistema', '3'],
        ['2. Arquitectura y Seguridad', '4'],
        ['3. Acceso al Sistema y Autenticación', '5'],
        ['4. Panel Principal (Dashboard)', '6'],
        ['5. Gestión de Personal y Biometría', '7'],
        ['6. Proceso de Enrolamiento Facial', '8'],
        ['7. Control de Asistencias y Tiempos', '9'],
        ['8. Gestión de Permisos y Licencias', '10'],
        ['9. Configuración de Parámetros Facial-API', '11'],
        ['10. Gestión de Horarios y Turnos', '12'],
        ['11. Reportes y Exportación de Datos', '13'],
        ['12. Resolución de Problemas Frecuentes', '14']
    ];

    applyAutoTable(doc, {
        startY: 45,
        body: index,
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 150 }, 1: { halign: 'right' } }
    });

    // --- PÁGINA 3: INTRODUCCIÓN ---
    doc.addPage();
    addPageHeader('1. Introducción al Sistema');

    let y = 45;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);

    const introStr = 'El Sistema SICAF ha sido desarrollado para modernizar el control de asistencia del personal de la Corte Superior de Justicia. Utiliza tecnología de reconocimiento facial de última generación (Face-API.js) para garantizar que el registro de jornada sea personal e intransferible, eliminando el uso de tarjetas físicas o huellas dactilares que pueden ser vulnerables a suplantación o fallos mecánicos.\n\nEste manual está diseñado para que el administrador pueda gestionar todas las entidades del sistema, desde el alta del personal hasta la auditoría de marcaciones y la configuración de los umbrales de precisión biométrica.';
    const lines = doc.splitTextToSize(introStr, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 6 + 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Beneficios Claves:', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text([
        '- Precisión Biométrica superior al 98%.',
        '- Registro automático de tardanzas y salidas anticipadas.',
        '- Gestión web centralizada desde cualquier punto de la red institucional.',
        '- Exportación directa a formatos compatibles con sistemas de remuneraciones (Excel).'
    ], margin + 5, y);

    // --- PÁGINA 4: ARQUITECTURA ---
    doc.addPage();
    addPageHeader('2. Arquitectura y Seguridad');
    y = 45;

    doc.text('El sistema opera bajo una arquitectura Cliente-Servidor moderna:', margin, y);
    y += 10;

    applyAutoTable(doc, {
        startY: y,
        head: [['Capa', 'Tecnología', 'Función']],
        body: [
            ['Frontend', 'React 19 + Vite', 'Interfaz de usuario rápida y reactiva.'],
            ['Backend', 'FastAPI (Python)', 'Procesamiento de datos y lógica de negocio.'],
            ['Base de Datos', 'Supabase (PostgreSQL)', 'Almacenamiento seguro de registros y embeddings.'],
            ['IA / Biometría', 'TensorFlow + FaceAPI', 'Detección de rostros y prueba de vida.']
        ],
        theme: 'grid',
        headStyles: { fillColor: COLORS.PRIMARY }
    });

    y = doc.lastAutoTable.finalY + 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Seguridad de Datos:', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text('El sistema NO guarda fotos de los usuarios en la base de datos por razones de privacidad. Lo que se almacena es un "Descriptor Facial" (un vector numérico de 128 puntos) que es irreversible. Esto garantiza que, incluso ante una fuga de datos, el rostro real del empleado no pueda ser reconstruido.', margin, y, { maxWidth: contentWidth });

    // --- PÁGINA 5: ACCESO (CON INTERFAZ) ---
    doc.addPage();
    addPageHeader('3. Acceso al Sistema');
    y = 45;

    doc.text('Para acceder como administrador, debe dirigirse a la URL del sistema e ingresar sus credenciales institucionales.', margin, y);
    y += 10;

    // Mockup de Login
    drawUIBox(margin + 30, y, 90, 60, 'Iniciar Sesión - SICAF');
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text('Correo Institucional', margin + 35, y + 15);
    doc.rect(margin + 35, y + 17, 80, 6);
    doc.text('admin@pj.gob.pe', margin + 37, y + 21);

    doc.text('Contraseña', margin + 35, y + 28);
    doc.rect(margin + 35, y + 30, 80, 6);
    doc.text('********', margin + 37, y + 34);

    doc.setFillColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
    doc.roundedRect(margin + 35, y + 42, 80, 8, 1, 1, 'F');
    doc.setTextColor(255);
    doc.text('INGRESAR AL PANEL', margin + 75, y + 47, { align: 'center' });

    y += 75;
    doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text('Nota: Si olvida su contraseña, deberá contactar con el área de soporte técnico para el restablecimiento vía base de datos.', margin, y);

    // --- PÁGINA 6: DASHBOARD ---
    doc.addPage();
    addPageHeader('4. Panel Principal (Dashboard)');
    y = 45;

    doc.setFont('helvetica', 'normal');
    doc.text('El Dashboard es la central de monitoreo. Aquí podrá ver en tiempo real el pulso de la institución.', margin, y);
    y += 10;

    // Dibujar Tarjetas de Stats
    const drawStatCard = (x, y, w, title, value, color) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(color[0], color[1], color[2]);
        doc.roundedRect(x, y, w, 25, 2, 2, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(title, x + 5, y + 7);
        doc.setFontSize(14);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(value, x + 5, y + 18);
    };

    drawStatCard(margin, y, 50, 'TOTAL PERSONAL', '124', [50, 50, 200]);
    drawStatCard(margin + 60, y, 50, 'ASISTENCIAS HOY', '98', COLORS.SUCCESS);
    drawStatCard(margin + 120, y, 50, 'TARDANZAS', '12', COLORS.WARNING);

    y += 35;
    doc.setFontSize(11);
    doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);
    doc.text('Secciones del Dashboard:', margin, y);
    y += 7;
    applyAutoTable(doc, {
        startY: y,
        body: [
            ['Actividad Reciente', 'Muestra los últimos 5 empleados que han marcado entrada o salida.'],
            ['Acciones Rápidas', 'Botones de acceso directo a Enrolamiento, Reporte y Permisos.'],
            ['Gráfico de Estado', 'Resumen visual de puntualidad del mes actual.']
        ],
        columnStyles: { 0: { fontStyle: 'bold' } }
    });

    // --- PÁGINA 7: PERSONAL MANAGEMENT ---
    doc.addPage();
    addPageHeader('5. Gestión de Personal');
    y = 45;

    doc.text('En este módulo podrá registrar, editar o dar de baja a los colaboradores.', margin, y);
    y += 10;

    drawUIBox(margin, y, 170, 70, 'Módulo de Personal');
    // Simular Tabla en UI
    doc.setFillColor(240);
    doc.rect(margin + 5, y + 15, 160, 6, 'F');
    doc.setFontSize(6);
    doc.setTextColor(50);
    doc.text('DNI          NOMBRES                  CARGO                DEP.', margin + 8, y + 19);
    doc.line(margin + 5, y + 21, margin + 165, y + 21);
    doc.text('704412..   JUAN PEREZ             ANALISTA             PENAL', margin + 8, y + 27);
    doc.text('441235..   MARIA SUAREZ         SECRETARIA         ADMIN', margin + 8, y + 33);

    y += 80;
    doc.setFontSize(11);
    doc.text('Pasos para un nuevo registro:', margin, y);
    y += 7;
    doc.text([
        '1. Pulsar el botón "+ Nuevo Empleado".',
        '2. Completar los datos básicos (DNI es obligatorio y único).',
        '3. Seleccionar el régimen laboral.',
        '4. Proceder al enrolamiento facial (paso crítico).'
    ], margin + 5, y);

    // --- PÁGINA 8: ENROLAMIENTO (GRÁFICO) ---
    doc.addPage();
    addPageHeader('6. Proceso de Enrolamiento Facial');
    y = 45;

    doc.text('El enrolamiento es el proceso de capturar el rostro del empleado para generar su identidad digital.', margin, y);
    y += 10;

    // Simular Interfaz de Cámara
    drawUIBox(margin + 30, y, 100, 80, 'Captura Biométrica');
    doc.setFillColor(0, 0, 0); // Pantalla negra de cámara
    doc.rect(margin + 40, y + 12, 80, 50, 'F');
    doc.setDrawColor(0, 255, 0); // Cuadro de detección
    doc.rect(margin + 60, y + 18, 40, 35);
    doc.setTextColor(0, 255, 0);
    doc.setFontSize(6);
    doc.text('ROSTRO DETECTADO: 99%', margin + 60, y + 17);

    doc.setFillColor(COLORS.SUCCESS[0], COLORS.SUCCESS[1], COLORS.SUCCESS[2]);
    doc.roundedRect(margin + 50, y + 65, 60, 8, 1, 1, 'F');
    doc.setTextColor(255);
    doc.text('CAPTURAR Y CODIFICAR', margin + 80, y + 70, { align: 'center' });

    y += 100;
    doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Recomendaciones para una buena captura:', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text([
        '- Iluminación uniforme (evite sombras fuertes en la cara).',
        '- Fondo preferiblemente neutro y despejado.',
        '- El empleado debe mirar fijamente a la cámara sin anteojos oscuros.',
        '- No es necesario sonreír durante el enrolamiento, mantener expresión neutra.'
    ], margin + 5, y);

    // --- PÁGINA 9: ASISTENCIAS ---
    doc.addPage();
    addPageHeader('7. Control de Asistencias');
    y = 45;

    doc.text('El sistema genera automáticamente el estado de asistencia comparando la hora de marcación con el horario asignado.', margin, y);
    y += 15;

    applyAutoTable(doc, {
        startY: y,
        head: [['Estado', 'Regla Negocio', 'Color UI']],
        body: [
            ['Puntual', 'Marcación dentro de la tolerancia.', 'Verde'],
            ['Tardanza', 'Marcación posterior a la tolerancia.', 'Naranja/Ambar'],
            ['Falta', 'No se registra marcación de entrada.', 'Rojo'],
            ['Comisión', 'Tiene un permiso de salida aprobado.', 'Azul']
        ],
        theme: 'grid'
    });

    y = doc.lastAutoTable.finalY + 15;
    doc.text('Para exportar el reporte mensual a Excel, diríjase a "Control de Asistencias", seleccione el mes y año, y pulse el icono verde de Excel. El archivo incluirá el resumen de minutos de tardanza acumulados.', margin, y, { maxWidth: contentWidth });

    // --- PÁGINA 10: PERMISOS ---
    doc.addPage();
    addPageHeader('8. Gestión de Permisos');
    y = 45;

    doc.text('La gestión de papeletas de salida es fundamental para justificar ausencias en el reporte final.', margin, y);
    y += 10;

    drawUIBox(margin, y, 170, 70, 'Aprobación de Solicitudes');
    doc.setFontSize(7);
    doc.setTextColor(50);
    doc.text('SOLICITANTE: MARIA RUIZ', margin + 10, y + 15);
    doc.text('MOTIVO: CITA MEDICA ESSALUD', margin + 10, y + 25);
    doc.text('FECHA: 20/05/2024', margin + 10, y + 35);

    doc.setFillColor(COLORS.SUCCESS[0], COLORS.SUCCESS[1], COLORS.SUCCESS[2]);
    doc.roundedRect(margin + 120, y + 15, 30, 10, 1, 1, 'F');
    doc.setTextColor(255); doc.text('APROBAR', margin + 135, y + 21, { align: 'center' });

    doc.setFillColor(COLORS.DANGER[0], COLORS.DANGER[1], COLORS.DANGER[2]);
    doc.roundedRect(margin + 120, y + 35, 30, 10, 1, 1, 'F');
    doc.setTextColor(255); doc.text('RECHAZAR', margin + 135, y + 41, { align: 'center' });

    y += 85;
    doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);
    doc.setFontSize(11);
    doc.text('Importante: Una vez aprobado un permiso, el sistema lo toma en cuenta automáticamente en el módulo de "Kiosco" para permitir la salida del personal mediante reconocimiento facial.', margin, y, { maxWidth: contentWidth });

    // --- PÁGINA 11: CONFIGURACIÓN ---
    doc.addPage();
    addPageHeader('9. Configuración de Parámetros');
    y = 45;

    doc.text('Esta sección es técnica. Modifique estos valores solo si el reconocimiento está fallando o es demasiado permisivo.', margin, y);
    y += 10;

    applyAutoTable(doc, {
        startY: y,
        head: [['Parámetro', 'Valor Sugerido', 'Efecto']],
        body: [
            ['Umbral Similitud', '0.45', 'Menor valor = Más estricto. Mayor valor = Más permisivo.'],
            ['Prueba Sonrisa', 'Activo', 'Pide al usuario sonreír para evitar fotos estáticas.'],
            ['Detección Mínima', '0.50', 'Filtra caras que están muy lejos de la cámara.'],
            ['Auto-Marcación', 'Inactivo', 'Si se activa, el sistema marca solo con detectar el rostro.']
        ],
        theme: 'striped'
    });

    y = doc.lastAutoTable.finalY + 15;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.DANGER[0], COLORS.DANGER[1], COLORS.DANGER[2]);
    doc.text('ADVERTENCIA: Un umbral mayor a 0.60 puede permitir que personas parecidas marquen por otros. No se recomienda.', margin, y, { maxWidth: contentWidth });

    // --- PÁGINA 12: TROUBLESHOOTING ---
    doc.addPage();
    addPageHeader('12. Resolución de Problemas');
    y = 45;

    applyAutoTable(doc, {
        startY: y,
        head: [['Problema', 'Causa Probable', 'Solución']],
        body: [
            ['Cámara no carga', 'Permisos del navegador bloqueados.', 'Click en candado (URL) y Permitir Cámara.'],
            ['No reconoce rostro', 'Cambio físico drástico o luz pobre.', 'Cargar nueva foto o mejorar iluminación.'],
            ['Error de Base Datos', 'Pérdida de conexión a Internet.', 'Verificar conexión y refrescar (F5).'],
            ['Varios rostros detectados', 'Fondo con cuadros o muchas personas.', 'Aislar al usuario frente a la cámara.']
        ],
        theme: 'grid'
    });

    y = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.setTextColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
    doc.text('CONTACTO TÉCNICO', margin, y);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);
    doc.text('Email: soporte_informatica@csjapurimac.gob.pe\nTeléfono: (083) 321045 - Anexo 402', margin, y);

    // Finalizar
    addFooter();

    const pdfOutput = doc.output('arraybuffer');
    const rootPath = path.resolve(__dirname, '../../manual.pdf');
    fs.writeFileSync(rootPath, Buffer.from(pdfOutput));
    console.log(`Manual generado exitosamente en: ${rootPath}`);
}

generateManual().catch(err => {
    console.error('Error generando el manual:', err);
    process.exit(1);
});
