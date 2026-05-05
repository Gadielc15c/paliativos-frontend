import type { DecimalValue } from "../../types/api";

export const toNumber = (value: DecimalValue | null | undefined) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};
