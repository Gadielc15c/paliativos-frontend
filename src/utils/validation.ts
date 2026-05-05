// Utilidades de validación
export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  // Acepta números con espacios, guiones, paréntesis
  const regex = /^[\d\s\-\+\(\)]+$/;
  return regex.test(phone) && phone.replace(/\D/g, "").length >= 10;
};

export const isValidDocument = (doc: string): boolean => {
  // Simple: al menos 5 dígitos
  return /^\d{5,}$/.test(doc.replace(/\D/g, ""));
};

export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
};
