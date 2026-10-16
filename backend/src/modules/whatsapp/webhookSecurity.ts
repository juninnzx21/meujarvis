import { timingSafeEqual } from "node:crypto";

export type EvolutionWebhookMetadata = {
  event: string;
  instance: string;
  expectedInstance: string;
  messageId: string;
  phone: string;
  allowedSenders: string[];
  fromMe: boolean;
  isGroup: boolean;
};

export function isValidWebhookSecret(expected: string, received: string | undefined) {
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export function validateEvolutionWebhook(metadata: EvolutionWebhookMetadata): string | null {
  const normalizeEvent = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");
  const normalizePhone = (value: string) => value.replace(/\D/g, "");

  if (!metadata.expectedInstance || metadata.instance !== metadata.expectedInstance) return "instance_mismatch";
  if (!metadata.event.trim() || normalizeEvent(metadata.event) !== "messagesupsert") return "unsupported_event";
  if (!metadata.messageId.trim()) return "message_id_required";
  if (metadata.fromMe) return "from_me";
  if (metadata.isGroup || !/^\d{10,15}$/.test(normalizePhone(metadata.phone))) return "invalid_sender";

  const sender = normalizePhone(metadata.phone);
  const allowedSenders = metadata.allowedSenders.map(normalizePhone).filter(Boolean);
  if (!allowedSenders.includes(sender)) return "sender_not_allowed";
  return null;
}
