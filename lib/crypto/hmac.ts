import { type Bytes } from "./encoding.ts";

export const HMAC_ALGORITHMS = ["SHA-256", "SHA-384", "SHA-512", "SHA-1"] as const;
export type HmacAlgorithm = (typeof HMAC_ALGORITHMS)[number];

export async function hmac(algorithm: HmacAlgorithm, key: Bytes, message: Bytes): Promise<Bytes> {
  // An empty raw key is rejected by Web Crypto; RFC 2104 pads it with zeros anyway.
  const keyBytes = key.length === 0 ? new Uint8Array(1) : key;
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: algorithm }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, message));
}
