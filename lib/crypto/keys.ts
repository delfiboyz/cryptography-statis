import { type Bytes, fromBase64, toBase64, toHex } from "./encoding.ts";

type Purpose = "sign" | "encrypt" | "agree";

interface KeySpec {
  purpose: Purpose;
  generate: RsaHashedKeyGenParams | EcKeyGenParams | Algorithm;
  import: RsaHashedImportParams | EcKeyImportParams | Algorithm;
  sign?: AlgorithmIdentifier | EcdsaParams | RsaPssParams;
  usages: { public: KeyUsage[]; private: KeyUsage[] };
}

const F4 = new Uint8Array([1, 0, 1]);
const SIGN_USAGES = { public: ["verify"], private: ["sign"] } satisfies KeySpec["usages"];

const rsaPss = (modulusLength: number): KeySpec => ({
  purpose: "sign",
  generate: { name: "RSA-PSS", modulusLength, publicExponent: F4, hash: "SHA-256" },
  import: { name: "RSA-PSS", hash: "SHA-256" },
  sign: { name: "RSA-PSS", saltLength: 32 },
  usages: SIGN_USAGES,
});

const rsaOaep = (modulusLength: number): KeySpec => ({
  purpose: "encrypt",
  generate: { name: "RSA-OAEP", modulusLength, publicExponent: F4, hash: "SHA-256" },
  import: { name: "RSA-OAEP", hash: "SHA-256" },
  usages: { public: ["encrypt"], private: ["decrypt"] },
});

export const KEY_SPECS = {
  Ed25519: {
    purpose: "sign",
    generate: { name: "Ed25519" },
    import: { name: "Ed25519" },
    sign: { name: "Ed25519" },
    usages: SIGN_USAGES,
  },
  "ECDSA-P256": {
    purpose: "sign",
    generate: { name: "ECDSA", namedCurve: "P-256" },
    import: { name: "ECDSA", namedCurve: "P-256" },
    sign: { name: "ECDSA", hash: "SHA-256" },
    usages: SIGN_USAGES,
  },
  "ECDSA-P384": {
    purpose: "sign",
    generate: { name: "ECDSA", namedCurve: "P-384" },
    import: { name: "ECDSA", namedCurve: "P-384" },
    sign: { name: "ECDSA", hash: "SHA-384" },
    usages: SIGN_USAGES,
  },
  "RSA-PSS-2048": rsaPss(2048),
  "RSA-PSS-3072": rsaPss(3072),
  "RSA-PSS-4096": rsaPss(4096),
  "RSA-OAEP-2048": rsaOaep(2048),
  "RSA-OAEP-4096": rsaOaep(4096),
  X25519: {
    purpose: "agree",
    generate: { name: "X25519" },
    import: { name: "X25519" },
    usages: { public: [], private: ["deriveBits"] },
  },
  "ECDH-P256": {
    purpose: "agree",
    generate: { name: "ECDH", namedCurve: "P-256" },
    import: { name: "ECDH", namedCurve: "P-256" },
    usages: { public: [], private: ["deriveBits"] },
  },
} satisfies Record<string, KeySpec>;

export type KeyAlgorithm = keyof typeof KEY_SPECS;
export const KEY_ALGORITHMS = Object.keys(KEY_SPECS) as KeyAlgorithm[];

/** Signing algorithms offered by the signature tool; RSA sizes share one import shape. */
export const SIGNATURE_ALGORITHMS = ["Ed25519", "ECDSA-P256", "ECDSA-P384", "RSA-PSS-2048"] as const;
export type SignatureAlgorithm = (typeof SIGNATURE_ALGORITHMS)[number];

export function keyPurpose(algorithm: KeyAlgorithm): Purpose {
  return KEY_SPECS[algorithm].purpose;
}

export function toPem(der: Uint8Array, label: "PUBLIC KEY" | "PRIVATE KEY"): string {
  const body = toBase64(der).match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`;
}

export class PemError extends Error {
  readonly code: "missing" | "pkcs1" | "sec1" | "wrongType";

  constructor(code: PemError["code"], message: string) {
    super(message);
    this.name = "PemError";
    this.code = code;
  }
}

export function fromPem(pem: string, expected: "PUBLIC KEY" | "PRIVATE KEY"): Bytes {
  const match = pem.match(/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/);
  if (!match) throw new PemError("missing", "No PEM block found");
  const label = match[1];
  if (label === "RSA PRIVATE KEY" || label === "RSA PUBLIC KEY") {
    throw new PemError("pkcs1", "PKCS#1 keys are not supported; convert with `openssl pkcs8 -topk8 -nocrypt`");
  }
  if (label === "EC PRIVATE KEY") {
    throw new PemError("sec1", "SEC1 keys are not supported; convert with `openssl pkcs8 -topk8 -nocrypt`");
  }
  if (label !== expected) throw new PemError("wrongType", `Expected ${expected}, found ${label}`);
  return fromBase64(match[2]);
}

export interface GeneratedKeyPair {
  algorithm: KeyAlgorithm;
  publicPem: string;
  privatePem: string;
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
  /** SHA-256 over the SubjectPublicKeyInfo, in the `SHA256:<base64>` style used by OpenSSH. */
  fingerprint: string;
  fingerprintHex: string;
}

export async function generateKeyPair(algorithm: KeyAlgorithm): Promise<GeneratedKeyPair> {
  const spec: KeySpec = KEY_SPECS[algorithm];
  const usages = [...spec.usages.public, ...spec.usages.private];
  const pair = (await crypto.subtle.generateKey(spec.generate, true, usages)) as CryptoKeyPair;
  const [spki, pkcs8, publicJwk, privateJwk] = await Promise.all([
    crypto.subtle.exportKey("spki", pair.publicKey),
    crypto.subtle.exportKey("pkcs8", pair.privateKey),
    crypto.subtle.exportKey("jwk", pair.publicKey),
    crypto.subtle.exportKey("jwk", pair.privateKey),
  ]);
  const fp = new Uint8Array(await crypto.subtle.digest("SHA-256", spki));
  return {
    algorithm,
    publicPem: toPem(new Uint8Array(spki), "PUBLIC KEY"),
    privatePem: toPem(new Uint8Array(pkcs8), "PRIVATE KEY"),
    publicJwk,
    privateJwk,
    fingerprint: `SHA256:${toBase64(fp).replace(/=+$/, "")}`,
    fingerprintHex: toHex(fp).match(/../g)!.join(":"),
  };
}

export async function importPublicKey(pem: string, algorithm: SignatureAlgorithm): Promise<CryptoKey> {
  const spec: KeySpec = KEY_SPECS[algorithm];
  return crypto.subtle.importKey("spki", fromPem(pem, "PUBLIC KEY"), spec.import, false, spec.usages.public);
}

export async function importPrivateKey(pem: string, algorithm: SignatureAlgorithm): Promise<CryptoKey> {
  const spec: KeySpec = KEY_SPECS[algorithm];
  return crypto.subtle.importKey("pkcs8", fromPem(pem, "PRIVATE KEY"), spec.import, false, spec.usages.private);
}

/** Finds the signature algorithm a PEM key belongs to by trying each import shape. */
export async function detectSignatureAlgorithm(pem: string): Promise<SignatureAlgorithm | null> {
  const isPrivate = pem.includes("PRIVATE KEY");
  for (const algorithm of SIGNATURE_ALGORITHMS) {
    try {
      await (isPrivate ? importPrivateKey(pem, algorithm) : importPublicKey(pem, algorithm));
      return algorithm;
    } catch {
      // try the next one
    }
  }
  return null;
}

export async function signMessage(algorithm: SignatureAlgorithm, privatePem: string, message: Bytes): Promise<Bytes> {
  const key = await importPrivateKey(privatePem, algorithm);
  const params: KeySpec["sign"] = KEY_SPECS[algorithm].sign;
  return new Uint8Array(await crypto.subtle.sign(params!, key, message));
}

export async function verifyMessage(
  algorithm: SignatureAlgorithm,
  publicPem: string,
  signature: Bytes,
  message: Bytes,
): Promise<boolean> {
  const key = await importPublicKey(publicPem, algorithm);
  const params: KeySpec["sign"] = KEY_SPECS[algorithm].sign;
  return crypto.subtle.verify(params!, key, signature, message);
}
