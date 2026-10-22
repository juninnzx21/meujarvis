import { z } from "zod";

export const DEFAULT_USER_TIMEZONE = "America/Sao_Paulo";

export function isValidIanaTimezone(timezone: string): boolean {
  if (timezone.length < 1 || timezone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export const timezoneSchema = z.string().trim().refine(isValidIanaTimezone, "Informe um fuso horário IANA válido");
