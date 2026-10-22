// Byte <-> text conversions shared by every tool. All helpers return
// `Uint8Array<ArrayBuffer>` so results can be passed straight to Web Crypto.

export type Bytes = Uint8Array<ArrayBuffer>;

const encoder = new TextEncoder();

export function utf8Encode(text: string): Bytes {
  return encoder.encode(text);
}

export function utf8Decode(bytes: Uint8Array): string {
  // `fatal` turns invalid UTF-8 into an error instead of silent U+FFFD output.
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function fromHex(input: string): Bytes {
  const clean = input.replace(/^0x/i, "").replace(/[\s:-]/g, "");
  if (clean.length % 2 !== 0) throw new Error("Hex input must have an even number of digits");
  if (!/^[0-9a-f]*$/i.test(clean)) throw new Error("Hex input contains non-hex characters");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_LOOKUP = new Map([...B64].map((c, i) => [c, i]));

export function toBase64(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + "==";
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + "=";
  }
  return out;
}

/** Accepts standard and URL-safe alphabets, with or without padding or whitespace. */
export function fromBase64(input: string): Bytes {
  const clean = input.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  if (clean.length % 4 === 1) throw new Error("Invalid Base64 length");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let o = 0;
  for (const c of clean) {
    const v = B64_LOOKUP.get(c);
    if (v === undefined) throw new Error(`Invalid Base64 character "${c}"`);
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buffer >> bits) & 0xff;
    }
  }
  return out;
}

export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const fromBase64Url = fromBase64;

export function toBinary(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(2).padStart(8, "0")).join(" ");
}

export function fromBinary(input: string): Bytes {
  const clean = input.replace(/\s/g, "");
  if (!/^[01]*$/.test(clean)) throw new Error("Binary input may only contain 0 and 1");
  if (clean.length % 8 !== 0) throw new Error("Binary input must be a multiple of 8 bits");
  const out = new Uint8Array(clean.length / 8);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
  return out;
}

export function concatBytes(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Cryptographically secure random bytes (getRandomValues is capped at 64 KiB per call). */
export function randomBytes(length: number): Bytes {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i += 65536) crypto.getRandomValues(out.subarray(i, i + 65536));
  return out;
}

/** Compares in time independent of where the first difference is. */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export type TextFormat = "utf8" | "hex" | "base64";

export function decodeText(input: string, format: TextFormat): Bytes {
  if (format === "hex") return fromHex(input);
  if (format === "base64") return fromBase64(input);
  return utf8Encode(input);
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB"];
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[unit]}`;
}
