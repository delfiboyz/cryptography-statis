import { randomBytes, toHex } from "./encoding.ts";

/** Uniform integer in [0, max) without modulo bias (rejection sampling). */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) throw new RangeError("max must be in 1..2^32");
  const limit = 2 ** 32 - (2 ** 32 % max);
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

export function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function formatUuid(bytes: Uint8Array): string {
  const hex = toHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** RFC 9562 version 4 (random). Implemented by hand because `crypto.randomUUID` needs a secure context. */
export function uuidV4(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

/** RFC 9562 version 7: 48-bit Unix milliseconds followed by randomness, so IDs sort by creation time. */
export function uuidV7(now: number = Date.now()): string {
  const bytes = randomBytes(16);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, Math.floor(now / 2 ** 32));
  view.setUint32(2, now >>> 0);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

/** Reads the creation time back out of a v7 UUID. */
export function uuidV7Timestamp(uuid: string): Date | null {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(hex) || hex[12] !== "7") return null;
  return new Date(parseInt(hex.slice(0, 12), 16));
}

export function randomString(length: number, alphabet: string): string {
  const chars = [...alphabet];
  let out = "";
  for (let i = 0; i < length; i++) out += chars[randomInt(chars.length)];
  return out;
}
