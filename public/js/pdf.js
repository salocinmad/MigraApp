/* =====================================================
   MigraApp — pdf.js
   Generación de informes PDF con jsPDF + autotable
   ===================================================== */

const PDFReport = (() => {

  function generate(userId, startDate, endDate) {
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      UI.toast('Librería PDF no disponible. Comprueba la conexión a Internet.', 'error');
      return;
    }

    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const user    = Storage.getUserById(userId);
    const entries = Migraine.getEntries(userId, startDate, endDate);
    const episodes = Migraine.groupIntoEpisodes(entries);
    const stats   = Migraine.getStats(userId, startDate, endDate);

    const dateGenerated = new Date().toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const startLabel = UI.formatDate(startDate);
    const endLabel   = UI.formatDate(endDate);
    const patientName = user?.displayName || user?.username || 'Paciente';

    // ─── Colores ───
    const purple = [124, 58, 237];
    const purpleLight = [168, 85, 247];
    const dark   = [13, 13, 26];
    const gray   = [100, 116, 139];
    const white  = [255, 255, 255];
    const lightBg = [248, 247, 255];

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 0;

    // ─── Cabecera ───
    doc.setFillColor(...purple);
    doc.rect(0, 0, pageW, 42, 'F');

    // Gradiente simulado con un rectángulo más claro
    doc.setFillColor(...purpleLight);
    doc.setGState(doc.GState({ opacity: 0.3 }));
    doc.rect(pageW * 0.5, 0, pageW * 0.5, 42, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));

    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('MigraApp', margin, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Informe de Seguimiento de Migraña', margin, 24);

    doc.setFontSize(9);
    doc.text(`Paciente: ${patientName}`, margin, 32);
    doc.text(`Período: ${startLabel} al ${endLabel}`, margin, 38);

    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.text(`Generado: ${dateGenerated}`, pageW - margin, 38, { align: 'right' });

    y = 52;

    // ─── Resumen estadístico ───
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin, y, pageW - margin * 2, 36, 3, 3, 'F');

    doc.setTextColor(...purple);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RESUMEN DEL PERÍODO', margin + 4, y + 7);

    const statItems = [
      ['Días con migraña', stats.totalDays],
      ['Episodios',         stats.totalEpisodes],
      ['Intensidad media',  `${stats.avgIntensity}/10`],
      ['Mayor episodio',    `${stats.longestEpisode} días`],
      ['Con neuralgia',     `${stats.neuralgiaPercent}%`],
      ['Fotosensibilidad',  `${stats.photoPercent}%`]
    ];

    const colW = (pageW - margin * 2) / 3;
    statItems.forEach(([label, value], idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = margin + 4 + col * colW;
      const sy = y + 14 + row * 12;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...purple);
      doc.text(String(value), x, sy);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...gray);
      doc.text(label, x, sy + 5);
    });

    y += 44;

    // ─── Desglose mensual (si hay datos) ───
    if (Object.keys(stats.monthly).length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text('DESGLOSE MENSUAL', margin, y + 4);
      y += 8;

      const months   = Object.keys(stats.monthly).sort();
      const maxCount = Math.max(...Object.values(stats.monthly));
      const barAreaW = pageW - margin * 2;
      const barH_max = 20;
      const barW     = Math.min(20, barAreaW / months.length - 4);

      months.forEach((m, i) => {
        const count  = stats.monthly[m];
        const bH     = maxCount > 0 ? (count / maxCount) * barH_max : 0;
        const bX     = margin + i * (barW + 4);
        const bY     = y + barH_max - bH + 2;

        doc.setFillColor(...purpleLight);
        doc.roundedRect(bX, bY, barW, bH, 1, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...purple);
        doc.text(String(count), bX + barW / 2, bY - 1, { align: 'center' });

        const [my, mm] = m.split('-');
        const shortMonth = new Date(parseInt(my), parseInt(mm) - 1).toLocaleDateString('es-ES', { month: 'short' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...gray);
        doc.text(shortMonth, bX + barW / 2, y + barH_max + 7, { align: 'center' });
      });

      y += barH_max + 14;
    }

    // ─── Tabla de episodios ───
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text('REGISTRO DE EPISODIOS', margin, y + 4);
    y += 8;

    if (episodes.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...gray);
      doc.text('No se encontraron episodios en el período seleccionado.', margin, y + 6);
      y += 14;
    } else {
      const tableData = episodes.map(ep => [
        ep.startDate !== ep.endDate
          ? `${UI.formatDateShort(ep.startDate)}\nal ${UI.formatDateShort(ep.endDate)}`
          : UI.formatDateShort(ep.startDate),
        `${ep.duration} día${ep.duration > 1 ? 's' : ''}`,
        `${ep.maxIntensity}/10`,
        ep.hasNeuralgia ? 'Sí' : 'No',
        ep.hasPhotosensitivity ? 'Sí' : 'No',
        ep.medications || '—',
        ep.notes || '—'
      ]);

      doc.autoTable({
        startY:  y,
        head:    [['Fecha(s)', 'Duración', 'Int. máx', 'Neuralgia', 'Foto', 'Medicación', 'Notas']],
        body:    tableData,
        margin:  { left: margin, right: margin },
        styles:  {
          fontSize:   8,
          cellPadding: 3,
          textColor:  dark,
          lineColor:  [220, 220, 230],
          lineWidth:  0.1
        },
        headStyles: {
          fillColor:  purple,
          textColor:  white,
          fontStyle:  'bold',
          fontSize:   8.5
        },
        alternateRowStyles: { fillColor: lightBg },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 16, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 14, halign: 'center' },
          5: { cellWidth: 28 },
          6: { cellWidth: 'auto' }
        },
        didParseCell(data) {
          // Colorear intensidad
          if (data.column.index === 2 && data.section === 'body') {
            const val = parseInt(data.cell.text[0]);
            if (!isNaN(val)) {
              const c = UI.intensityColor(val);
              const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
              data.cell.styles.textColor = hex2rgb(c);
              data.cell.styles.fontStyle = 'bold';
            }
          }
          // Colorear Sí/No de neuralgia/foto
          if ((data.column.index === 3 || data.column.index === 4) && data.section === 'body') {
            if (data.cell.text[0] === 'Sí') {
              data.cell.styles.textColor = [239, 68, 68];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      y = doc.lastAutoTable.finalY + 8;
    }

    // ─── Tabla de registros individuales (si hay suficiente espacio) ───
    if (entries.length > 0 && y < pageH - 40) {
      // Añadir nueva página para registros detallados
      doc.addPage();
      y = 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text('REGISTRO DIARIO DETALLADO', margin, y);
      y += 6;

      const dailyData = entries.map(e => [
        UI.formatDateShort(e.date),
        e.fromPrevious ? 'Sí' : 'No',
        `${e.intensity || '?'}/10`,
        e.neuralgia ? 'Sí' : 'No',
        e.photosensitivity ? 'Sí' : 'No',
        e.medication || '—',
        e.notes || '—'
      ]);

      doc.autoTable({
        startY:  y,
        head:    [['Fecha', '¿Anterior?', 'Intensidad', 'Neuralgia', 'Foto', 'Medicación', 'Notas']],
        body:    dailyData,
        margin:  { left: margin, right: margin },
        styles:  { fontSize: 7.5, cellPadding: 2.5, textColor: dark, lineColor: [220,220,230], lineWidth: 0.1 },
        headStyles: { fillColor: purple, textColor: white, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: lightBg },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 14, halign: 'center' },
          5: { cellWidth: 28 },
          6: { cellWidth: 'auto' }
        }
      });
    }

    // ─── Pie de página en todas las páginas ───
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...gray);
      doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
      doc.text(`MigraApp — Informe de ${patientName}`, margin, pageH - 6);
      doc.text(`Página ${p} de ${totalPages}`, pageW - margin, pageH - 6, { align: 'right' });
    }

    // ─── Guardar ───
    const filename = `MigraApp_${patientName}_${startDate}_${endDate}.pdf`;
    doc.save(filename);
    UI.toast(`Informe generado: ${filename}`, 'success');
  }

  return { generate };
})();
