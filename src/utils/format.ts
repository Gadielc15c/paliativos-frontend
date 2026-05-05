// Utilidades de formato
import { format, formatDistance, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const formatDate = (date: string | Date, pattern = "dd/MM/yyyy") => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern, { locale: es });
};

export const formatDateTime = (
  date: string | Date,
  pattern = "dd/MM/yyyy HH:mm"
) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern, { locale: es });
};

export const formatRelativeTime = (date: string | Date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistance(d, new Date(), {
    locale: es,
    addSuffix: true,
  });
};

export const formatCurrency = (amount: number, currency = "USD") => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
  }).format(amount);
};

export const formatNumber = (num: number, decimals = 2) => {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatPercentage = (num: number, decimals = 1) => {
  return `${formatNumber(num, decimals)}%`;
};
