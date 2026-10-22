import { type Bytes } from "./encoding.ts";
import { md5 } from "./md5.ts";

export const HASH_ALGORITHMS = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

/** Algorithms that should not be relied on for collision resistance. */
export const LEGACY_HASHES: ReadonlySet<HashAlgorithm> = new Set(["MD5", "SHA-1"]);

export async function digest(algorithm: HashAlgorithm, data: Bytes): Promise<Bytes> {
  if (algorithm === "MD5") return md5(data);
  return new Uint8Array(await crypto.subtle.digest(algorithm, data));
}

export async function digestAll(data: Bytes, algorithms: readonly HashAlgorithm[] = HASH_ALGORITHMS) {
  const results = await Promise.all(algorithms.map((a) => digest(a, data)));
  return algorithms.map((algorithm, i) => ({ algorithm, value: results[i] }));
}

/** Guesses which algorithm produced a hex digest from its length. */
export function detectHashAlgorithm(hex: string): HashAlgorithm | null {
  const clean = hex.trim().replace(/[\s:]/g, "");
  if (!/^[0-9a-f]+$/i.test(clean)) return null;
  const byLength: Record<number, HashAlgorithm> = { 32: "MD5", 40: "SHA-1", 64: "SHA-256", 96: "SHA-384", 128: "SHA-512" };
  return byLength[clean.length] ?? null;
}
