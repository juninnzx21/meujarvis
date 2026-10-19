import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const MAX_SECRET_LENGTH = 256;

function encodeBase32(value: Buffer) {
  let bits = 0;
  let accumulator = 0;
  let output = "";

  for (const byte of value) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(accumulator >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) output += BASE32_ALPHABET[(accumulator << (5 - bits)) & 31];
  return output;
}

function decodeBase32(secret: string) {
  const normalized = secret.replace(/=+$/u, "").replace(/\s+/gu, "").toUpperCase();
  if (!normalized || normalized.length > MAX_SECRET_LENGTH || /[^A-Z2-7]/u.test(normalized)) {
    throw new Error("Invalid TOTP secret");
  }

  let bits = 0;
  let accumulator = 0;
  const output: number[] = [];
  for (const char of normalized) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value < 0) throw new Error("Invalid TOTP secret");
    accumulator = (accumulator << 5) | value;
    bits += 5;
    if (bits >= 8) {
      output.push((accumulator >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  if (bits > 0 && (accumulator & ((1 << bits) - 1)) !== 0) throw new Error("Invalid TOTP secret");
  return Buffer.from(output);
}

export function generateTotpSecret(bytes = 20) {
  if (!Number.isInteger(bytes) || bytes < 16 || bytes > 64) throw new Error("TOTP secret size must be between 16 and 64 bytes");
  return encodeBase32(crypto.randomBytes(bytes));
}

export function createTotpCode(secret: string, timestampMs = Date.now()) {
  if (!Number.isFinite(timestampMs) || timestampMs < 0) throw new Error("Invalid TOTP timestamp");
  const counter = BigInt(Math.floor(timestampMs / 1000 / TOTP_PERIOD_SECONDS));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = crypto.createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = ((digest[offset]! & 0x7f) << 24)
    | ((digest[offset + 1]! & 0xff) << 16)
    | ((digest[offset + 2]! & 0xff) << 8)
    | (digest[offset + 3]! & 0xff);
  return String(binary % (10 ** TOTP_DIGITS)).padStart(TOTP_DIGITS, "0");
}

export function matchTotpCounter(secret: string, suppliedCode: string, timestampMs = Date.now(), window = 1): bigint | null {
  if (!/^\d{6}$/u.test(suppliedCode) || !Number.isFinite(timestampMs) || timestampMs < 0 || !Number.isInteger(window) || window < 0 || window > 2) return null;
  const supplied = Buffer.from(suppliedCode, "ascii");
  let matchedCounter: bigint | null = null;

  for (let offset = -window; offset <= window; offset += 1) {
    const candidateTimestamp = timestampMs + offset * TOTP_PERIOD_SECONDS * 1000;
    if (candidateTimestamp < 0) continue;
    const candidate = Buffer.from(createTotpCode(secret, candidateTimestamp), "ascii");
    if (crypto.timingSafeEqual(supplied, candidate)) {
      matchedCounter = BigInt(Math.floor(candidateTimestamp / 1000 / TOTP_PERIOD_SECONDS));
    }
  }

  return matchedCounter;
}

export function verifyTotpCode(secret: string, suppliedCode: string, timestampMs = Date.now(), window = 1) {
  return matchTotpCounter(secret, suppliedCode, timestampMs, window) !== null;
}

export function createTotpProvisioningUri(input: { secret: string; account: string; issuer: string }) {
  const account = input.account.trim();
  const issuer = input.issuer.trim();
  if (!account || !issuer || account.length > 254 || issuer.length > 64) throw new Error("Invalid TOTP account details");
  decodeBase32(input.secret);
  const label = `${issuer}:${account}`;
  const query = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS)
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${query.toString()}`;
}
