import { z } from "zod";

const settingsRotationArgsSchema = z.array(z.literal("--dry-run")).max(1);

export function parseSettingsRotationArgs(args: string[]):
  | { success: true; dryRun: boolean }
  | { success: false } {
  const parsed = settingsRotationArgsSchema.safeParse(args);
  return parsed.success
    ? { success: true, dryRun: parsed.data.includes("--dry-run") }
    : { success: false };
}
