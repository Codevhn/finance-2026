const decimalFormatter = new Intl.NumberFormat("es-HN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formatea un valor numérico como moneda local (Lempiras)
 * @param {number} value
 * @param {string} symbol
 * @returns {string}
 */
export function formatCurrency(value = 0, symbol = "Lps") {
  const numberValue = Number(value) || 0;
  return `${symbol} ${decimalFormatter.format(numberValue)}`;
}

export function formatPlainNumber(value = 0) {
  return decimalFormatter.format(Number(value) || 0);
}
