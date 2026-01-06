/**
 * Utilidades para generación de reportes en PDF con jsPDF + autotable
 */

const currencyFormatter = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

const COLORS = {
  positive: [16, 185, 129],
  negative: [239, 68, 68],
  neutral: [71, 85, 105],
};

function formatCurrencyValue(value = 0) {
  return currencyFormatter.format(value);
}

function formatPercent(value = 0, decimals = 1) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue.toFixed(decimals)}%`;
}

function applyAmountColor(cell, value = 0) {
  if (value > 0) {
    cell.styles.textColor = COLORS.positive;
  } else if (value < 0) {
    cell.styles.textColor = COLORS.negative;
  } else {
    cell.styles.textColor = COLORS.neutral;
  }
}

function createDocument() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error(
      "jsPDF no está disponible. Verifica tu conexión a internet e intenta de nuevo."
    );
  }

  const doc = new window.jspdf.jsPDF();
  doc.setFont("helvetica", "normal");
  return doc;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-HN");
}

export function exportDebtPaymentsPDF(debt) {
  const doc = createDocument();
  const title = `Pagos de la deuda: ${debt.nombre}`;

  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(11);
  doc.text(`Generado el ${formatDate(new Date().toISOString())}`, 14, 28);
  const lines = [];
  if (debt.personaNombre) {
    lines.push(`Persona: ${debt.personaNombre}`);
  }
  lines.push(
    `Tipo: ${debt.tipo === "yo-debo" ? "Cuenta por pagar" : "Cuenta por cobrar"}`
  );
  const dias = debt.getDiasTranscurridos?.() ?? null;
  if (dias !== null) {
    lines.push(`Días transcurridos: ${dias} día${dias === 1 ? "" : "s"}`);
  }
  lines.forEach((text, index) => {
    doc.text(text, 14, 34 + index * 6);
  });

  const hasPagos = debt.pagos.length > 0;
  const pagoRows = hasPagos
    ? debt.pagos.map((pago, index) => [
        index + 1,
        formatDate(pago.fecha),
        formatCurrencyValue(pago.monto),
        pago.nota || "-",
      ])
    : [];
  const pagoAmounts = hasPagos ? debt.pagos.map((pago) => pago.monto) : [];

  doc.autoTable({
    startY: 34 + lines.length * 6,
    head: [["#", "Fecha", "Monto", "Nota"]],
    body:
      pagoRows.length > 0
        ? pagoRows
        : [["-", "-", formatCurrencyValue(0), "Sin pagos registrados"]],
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 32 },
      2: { halign: "right", cellWidth: 32 },
      3: { cellWidth: 70 },
    },
    styles: {
      overflow: "linebreak",
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      minCellHeight: 10,
    },
    didParseCell: (data) => {
      if (hasPagos && data.section === "body" && data.column.index === 2) {
        const amount = pagoAmounts[data.row.index];
        if (typeof amount === "number") {
          applyAmountColor(data.cell, amount);
        }
      }
    },
  });

  const startSummary = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 50;
  doc.setFontSize(12);
  doc.text("Resumen", 14, startSummary);
  doc.setFontSize(11);
  doc.text(
    `Total adeudado: ${formatCurrencyValue(debt.totalAdeudado)}`,
    14,
    startSummary + 8
  );
  doc.text(
    `Total pagado: ${formatCurrencyValue(debt.getTotalPagado())}`,
    14,
    startSummary + 14
  );
  doc.text(
    `Saldo restante: ${formatCurrencyValue(debt.calcularSaldo())}`,
    14,
    startSummary + 20
  );

  const filename = `pagos-${debt.nombre.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(filename);
}

export function exportPaymentsReportPDF({ pagos, personaNombre, tipo }) {
  const doc = createDocument();
  doc.setFontSize(16);
  doc.text("Reporte de pagos recibidos", 14, 20);
  doc.setFontSize(11);
  const line1 = `Persona: ${personaNombre}`;
  const line2 =
    tipo === "yo-debo"
      ? "Tipo: Cuentas por pagar"
      : tipo === "me-deben"
      ? "Tipo: Cuentas por cobrar"
      : "Tipo: Todos";
  doc.text(`${line1} · ${line2}`, 14, 28);
  doc.text(`Generado el ${formatDate(new Date().toISOString())}`, 14, 34);

  const total = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  const pagosAmounts = pagos.map((pago) => pago.monto);

  doc.autoTable({
    startY: 40,
    head: [["Persona", "Deuda", "Tipo", "Fecha", "Monto", "Nota"]],
    body: pagos.map((pago) => [
      pago.persona,
      pago.deuda,
      pago.tipo === "yo-debo" ? "Cuenta por pagar" : "Cuenta por cobrar",
      formatDate(pago.fecha),
      formatCurrencyValue(pago.monto),
      pago.nota || "-",
    ]),
    columnStyles: {
      4: { halign: "right", cellWidth: 34 },
      5: { cellWidth: 60 },
    },
    styles: {
      overflow: "linebreak",
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      minCellHeight: 10,
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const amount = pagosAmounts[data.row.index];
        if (typeof amount === "number") {
          applyAmountColor(data.cell, amount);
        }
      }
    },
  });

  const summaryStart = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 50;
  doc.setFontSize(12);
  doc.text("Totales", 14, summaryStart);
  doc.setFontSize(11);
  doc.text(
    `Pagos registrados: ${pagos.length}`,
    14,
    summaryStart + 8
  );
  doc.text(
    `Suma total: ${formatCurrencyValue(total)}`,
    14,
    summaryStart + 14
  );

  const filename =
    personaNombre === "Todas las personas"
      ? "pagos-todas-las-personas.pdf"
      : `pagos-${personaNombre.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(filename);
}

export function exportFinancialSummaryPDF(summary) {
  const doc = createDocument();
  doc.setFontSize(16);
  doc.text("Reporte financiero 2026", 14, 20);
  doc.setFontSize(11);
  doc.text(`Generado el ${formatDate(new Date().toISOString())}`, 14, 28);

  const summaryRows = [
    { label: "Metas activas", value: summary.goals.active, formatter: (v) => `${v}` },
    { label: "Metas completadas", value: summary.goals.completed, formatter: (v) => `${v}` },
    { label: "Deudas activas", value: summary.debts.active, formatter: (v) => `${v}` },
    { label: "Deudas pagadas", value: summary.debts.paid, formatter: (v) => `${v}` },
    { label: "Cuentas por cobrar", value: summary.debts.meOwed, formatter: (v) => `${v}` },
    { label: "Cuentas por pagar", value: summary.debts.iOwe, formatter: (v) => `${v}` },
    {
      label: "Total adeudado",
      value: summary.debts.total,
      formatter: formatCurrencyValue,
      colorize: true,
    },
    {
      label: "Total ahorrado",
      value: summary.savings.total,
      formatter: formatCurrencyValue,
      colorize: true,
    },
    { label: "Fondos de ahorro", value: summary.savings.count, formatter: (v) => `${v}` },
    {
      label: "Balance neto lotería",
      value: summary.lottery.net,
      formatter: formatCurrencyValue,
      colorize: true,
    },
    {
      label: "ROI lotería",
      value: summary.lottery.roi ?? 0,
      formatter: (v) => formatPercent(v, 1),
      colorize: true,
    },
  ];

  doc.autoTable({
    startY: 34,
    head: [["Indicador", "Valor"]],
    body: summaryRows.map((row) => [row.label, row.formatter(row.value)]),
    columnStyles: {
      1: { halign: "right", cellWidth: 60 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const rowMeta = summaryRows[data.row.index];
        if (rowMeta?.colorize) {
          applyAmountColor(data.cell, rowMeta.value || 0);
        }
      }
    },
  });

  if (summary.personas?.length) {
    const startY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(13);
    doc.text("Saldo por persona", 14, startY);
    const personaAmounts = summary.personas.map((persona) => persona.saldo);
    doc.autoTable({
      startY: startY + 6,
      head: [["Persona", "Deudas activas", "Saldo"]],
      body: summary.personas.map((persona) => [
        persona.nombre,
        persona.deudas,
        formatCurrencyValue(persona.saldo),
      ]),
      columnStyles: {
        2: { halign: "right", cellWidth: 40 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          const amount = personaAmounts[data.row.index];
          applyAmountColor(data.cell, amount || 0);
        }
      },
    });
  }

  doc.save("reporte-financiero.pdf");
}
