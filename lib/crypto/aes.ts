// Password-based authenticated encryption: PBKDF2-HMAC-SHA256 -> AES-256-GCM.
//
// Container layout (all integers big-endian):
//   magic "CRY" (3) | version (1) | kind (1) | iterations (4) | salt (16) | iv (12) | ciphertext + GCM tag
// The whole 37-byte header is authenticated as GCM additional data, so tampering
// with the iteration count, salt or kind makes decryption fail.

import { type Bytes, concatBytes, randomBytes, utf8Decode, utf8Encode } from "./encoding.ts";

const MAGIC = [0x43, 0x52, 0x59];
const VERSION = 1;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const HEADER_LENGTH = MAGIC.length + 1 + 1 + 4 + SALT_LENGTH + IV_LENGTH;
const TAG_LENGTH = 16;

/** OWASP (2023) recommendation for PBKDF2-HMAC-SHA256. */
export const DEFAULT_ITERATIONS = 600_000;
export const ITERATION_PRESETS = [210_000, 600_000, 1_000_000, 2_000_000] as const;
// Upper bound for untrusted input so a crafted header cannot hang the tab.
const MAX_ITERATIONS = 10_000_000;

export const PayloadKind = { Text: 1, File: 2 } as const;
export type PayloadKind = (typeof PayloadKind)[keyof typeof PayloadKind];

export class DecryptionError extends Error {
  readonly reason: "format" | "auth" | "kind";

  constructor(reason: DecryptionError["reason"], message: string) {
    super(message);
    this.name = "DecryptionError";
    this.reason = reason;
  }
}

async function deriveKey(password: string, salt: Bytes, iterations: number, usage: KeyUsage) {
  const material = await crypto.subtle.importKey("raw", utf8Encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

export interface EncryptOptions {
  iterations?: number;
  kind?: PayloadKind;
}

export async function encryptBytes(plaintext: Bytes, password: string, options: EncryptOptions = {}): Promise<Bytes> {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const header = new Uint8Array(HEADER_LENGTH);
  const view = new DataView(header.buffer);
  header.set(MAGIC, 0);
  header[3] = VERSION;
  header[4] = options.kind ?? PayloadKind.Text;
  view.setUint32(5, iterations);
  header.set(salt, 9);
  header.set(iv, 9 + SALT_LENGTH);

  const key = await deriveKey(password, salt, iterations, "encrypt");
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: header }, key, plaintext);
  return concatBytes(header, new Uint8Array(ciphertext));
}

export interface ParsedHeader {
  version: number;
  kind: number;
  iterations: number;
  salt: Bytes;
  iv: Bytes;
}

export function parseHeader(payload: Uint8Array): ParsedHeader {
  if (payload.length < HEADER_LENGTH + TAG_LENGTH || MAGIC.some((b, i) => payload[i] !== b)) {
    throw new DecryptionError("format", "Not a payload produced by this app");
  }
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const version = payload[3];
  const iterations = view.getUint32(5);
  if (version !== VERSION) throw new DecryptionError("format", `Unsupported version ${version}`);
  if (iterations < 1 || iterations > MAX_ITERATIONS) throw new DecryptionError("format", "Invalid iteration count");
  return {
    version,
    kind: payload[4],
    iterations,
    salt: payload.slice(9, 9 + SALT_LENGTH),
    iv: payload.slice(9 + SALT_LENGTH, HEADER_LENGTH),
  };
}

export async function decryptBytes(payload: Bytes, password: string, expectedKind?: PayloadKind): Promise<Bytes> {
  const header = parseHeader(payload);
  if (expectedKind !== undefined && header.kind !== expectedKind) {
    throw new DecryptionError("kind", "Payload was encrypted by a different tool");
  }
  const key = await deriveKey(password, header.salt, header.iterations, "decrypt");
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: header.iv, additionalData: payload.slice(0, HEADER_LENGTH) },
      key,
      payload.slice(HEADER_LENGTH),
    );
    return new Uint8Array(plaintext);
  } catch {
    throw new DecryptionError("auth", "Wrong password or the data was modified");
  }
}

// Files carry their original name and MIME type inside the encrypted body:
//   metadata length (4) | metadata JSON | file bytes
interface FileMetadata {
  name: string;
  type: string;
}

export async function encryptFile(
  data: Bytes,
  meta: FileMetadata,
  password: string,
  iterations?: number,
): Promise<Bytes> {
  const metaBytes = utf8Encode(JSON.stringify(meta));
  const prefix = new Uint8Array(4);
  new DataView(prefix.buffer).setUint32(0, metaBytes.length);
  return encryptBytes(concatBytes(prefix, metaBytes, data), password, { iterations, kind: PayloadKind.File });
}

export async function decryptFile(payload: Bytes, password: string): Promise<FileMetadata & { data: Bytes }> {
  const plain = await decryptBytes(payload, password, PayloadKind.File);
  const metaLength = new DataView(plain.buffer).getUint32(0);
  const meta = JSON.parse(utf8Decode(plain.subarray(4, 4 + metaLength))) as FileMetadata;
  return { name: meta.name, type: meta.type, data: plain.slice(4 + metaLength) };
}

export async function encryptText(text: string, password: string, iterations?: number): Promise<Bytes> {
  return encryptBytes(utf8Encode(text), password, { iterations, kind: PayloadKind.Text });
}

export async function decryptText(payload: Bytes, password: string): Promise<string> {
  return utf8Decode(await decryptBytes(payload, password, PayloadKind.Text));
}
