const NBSP = '\u00A0';

interface NumberFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

function inferMaximumFractionDigits(value: number): number {
  if (Number.isInteger(value)) return 0;
  if (Number.isInteger(value * 10)) return 1;
  return 2;
}

export function formatMedicalNumber(
  value: number,
  options: NumberFormatOptions = {},
): string {
  const maximumFractionDigits =
    options.maximumFractionDigits ?? inferMaximumFractionDigits(value);
  const minimumFractionDigits = options.minimumFractionDigits ?? 0;

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

export function formatValueWithUnit(
  value: number | string,
  unit: string,
  options: NumberFormatOptions = {},
): string {
  const formattedValue =
    typeof value === 'number' ? formatMedicalNumber(value, options) : value;
  return `${formattedValue}${NBSP}${unit}`;
}

export function formatRange(
  start: number | string,
  end: number | string,
  options: NumberFormatOptions = {},
): string {
  const formattedStart =
    typeof start === 'number' ? formatMedicalNumber(start, options) : start;
  const formattedEnd =
    typeof end === 'number' ? formatMedicalNumber(end, options) : end;
  return `${formattedStart}–${formattedEnd}`;
}

export function formatRangeWithUnit(
  start: number | string,
  end: number | string,
  unit: string,
  options: NumberFormatOptions = {},
): string {
  return formatValueWithUnit(formatRange(start, end, options), unit);
}

export function formatPercent(
  value: number,
  options: NumberFormatOptions = {},
): string {
  return `${formatMedicalNumber(value, options)}%`;
}

export function formatEveryDays(value: number): string {
  return `每 ${formatMedicalNumber(value)} 天`;
}
