export function formatCurrency(value: number, currency: string = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

export function formatCents(valueInCents: number, currency: string = "GBP"): string {
  return formatCurrency(valueInCents / 100, currency);
}

export const formatCurrencyFromCents = formatCents;

export function convertAmountBetweenCurrencies(
  valueInCents: number,
  fromCurrency: string,
  toCurrency: string,
): number {
  if (fromCurrency === toCurrency) return valueInCents;
  const fxRatesFromGbp: Record<string, number> = {
    GBP: 1,
    USD: 1.27,
    EUR: 1.17,
    CAD: 1.72,
    AUD: 1.95,
    JPY: 191.8,
  };
  const fromRate = fxRatesFromGbp[fromCurrency] ?? 1;
  const toRate = fxRatesFromGbp[toCurrency] ?? 1;
  const gbpValue = valueInCents / fromRate;
  return Math.round(gbpValue * toRate);
}

function toPositiveOrFallback(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return fallback;
  }
  return value;
}

export function convertCents(
  valueInCents: number,
  fromRateToGbp: number | undefined,
  toRateToGbp: number | undefined,
): number {
  const source = toPositiveOrFallback(fromRateToGbp, 1);
  const target = toPositiveOrFallback(toRateToGbp, 1);
  const valueInSourceCurrency = valueInCents / 100;
  const valueInGbp = valueInSourceCurrency * source;
  const valueInTargetCurrency = valueInGbp / target;
  return Math.round(valueInTargetCurrency * 100);
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateShort(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function getInitials(text: string): string {
  const cleaned = text.trim();
  if (!cleaned) {
    return "?";
  }
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");
}
