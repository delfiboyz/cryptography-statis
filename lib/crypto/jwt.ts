import {
  type Bytes,
  constantTimeEqual,
  fromBase64Url,
  toBase64Url,
  utf8Decode,
  utf8Encode,
} from "./encoding.ts";
import { type HmacAlgorithm, hmac } from "./hmac.ts";
import { fromPem } from "./keys.ts";

export interface DecodedJwt {
  header: Record<string, unknown>;
  /** Parsed JSON when the payload is JSON, otherwise the raw text. */
  payload: unknown;
  signature: Bytes;
  signingInput: Bytes;
}

export class JwtError extends Error {
  readonly code: "parts" | "header" | "payload";

  constructor(code: JwtError["code"], message: string) {
    super(message);
    this.name = "JwtError";
    this.code = code;
  }
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split(".");
  if (parts.length !== 3) throw new JwtError("parts", "A JWT has three dot-separated parts");
  let header: Record<string, unknown>;
  try {
    header = JSON.parse(utf8Decode(fromBase64Url(parts[0])));
  } catch {
    throw new JwtError("header", "Header is not valid Base64URL JSON");
  }
  let payload: unknown;
  try {
    const text = utf8Decode(fromBase64Url(parts[1]));
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  } catch {
    throw new JwtError("payload", "Payload is not valid Base64URL");
  }
  return {
    header,
    payload,
    signature: fromBase64Url(parts[2]),
    signingInput: utf8Encode(`${parts[0]}.${parts[1]}`),
  };
}

type JwtFamily = "hmac" | "pem";
type JwtSpec =
  | { family: "hmac"; hash: HmacAlgorithm }
  | {
      family: "pem";
      key: RsaHashedImportParams | EcKeyImportParams | Algorithm;
      verify: Algorithm | RsaPssParams | EcdsaParams;
    };

const JWT_ALGORITHMS = {
  HS256: { family: "hmac", hash: "SHA-256" },
  HS384: { family: "hmac", hash: "SHA-384" },
  HS512: { family: "hmac", hash: "SHA-512" },
  RS256: { family: "pem", key: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, verify: { name: "RSASSA-PKCS1-v1_5" } },
  RS384: { family: "pem", key: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-384" }, verify: { name: "RSASSA-PKCS1-v1_5" } },
  RS512: { family: "pem", key: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" }, verify: { name: "RSASSA-PKCS1-v1_5" } },
  PS256: { family: "pem", key: { name: "RSA-PSS", hash: "SHA-256" }, verify: { name: "RSA-PSS", saltLength: 32 } },
  PS384: { family: "pem", key: { name: "RSA-PSS", hash: "SHA-384" }, verify: { name: "RSA-PSS", saltLength: 48 } },
  PS512: { family: "pem", key: { name: "RSA-PSS", hash: "SHA-512" }, verify: { name: "RSA-PSS", saltLength: 64 } },
  ES256: { family: "pem", key: { name: "ECDSA", namedCurve: "P-256" }, verify: { name: "ECDSA", hash: "SHA-256" } },
  ES384: { family: "pem", key: { name: "ECDSA", namedCurve: "P-384" }, verify: { name: "ECDSA", hash: "SHA-384" } },
  ES512: { family: "pem", key: { name: "ECDSA", namedCurve: "P-521" }, verify: { name: "ECDSA", hash: "SHA-512" } },
  EdDSA: { family: "pem", key: { name: "Ed25519" }, verify: { name: "Ed25519" } },
  Ed25519: { family: "pem", key: { name: "Ed25519" }, verify: { name: "Ed25519" } },
} as const satisfies Record<string, JwtSpec>;

export type JwtAlgorithm = keyof typeof JWT_ALGORITHMS;
export const HMAC_JWT_ALGORITHMS = ["HS256", "HS384", "HS512"] as const;
export type HmacJwtAlgorithm = (typeof HMAC_JWT_ALGORITHMS)[number];

export function isSupportedJwtAlgorithm(alg: unknown): alg is JwtAlgorithm {
  return typeof alg === "string" && Object.hasOwn(JWT_ALGORITHMS, alg);
}

export function jwtKeyFamily(alg: JwtAlgorithm): JwtFamily {
  return JWT_ALGORITHMS[alg].family;
}

/**
 * Verifies the token signature. `key` is the shared secret for HS* algorithms
 * or a SPKI PEM public key for the asymmetric ones.
 */
export async function verifyJwt(decoded: DecodedJwt, alg: JwtAlgorithm, key: string | Bytes): Promise<boolean> {
  const spec = JWT_ALGORITHMS[alg];
  if (spec.family === "hmac") {
    const secret = typeof key === "string" ? utf8Encode(key) : key;
    return constantTimeEqual(await hmac(spec.hash, secret, decoded.signingInput), decoded.signature);
  }
  const der = fromPem(typeof key === "string" ? key : utf8Decode(key), "PUBLIC KEY");
  const publicKey = await crypto.subtle.importKey("spki", der, spec.key, false, ["verify"]);
  return crypto.subtle.verify(spec.verify, publicKey, decoded.signature, decoded.signingInput);
}

export async function signJwtHmac(
  alg: HmacJwtAlgorithm,
  payload: unknown,
  secret: string | Bytes,
  extraHeader: Record<string, unknown> = {},
): Promise<string> {
  const header = { alg, typ: "JWT", ...extraHeader };
  const encode = (value: unknown) => toBase64Url(utf8Encode(JSON.stringify(value)));
  const signingInput = `${encode(header)}.${encode(payload)}`;
  const secretBytes = typeof secret === "string" ? utf8Encode(secret) : secret;
  const signature = await hmac(JWT_ALGORITHMS[alg].hash, secretBytes, utf8Encode(signingInput));
  return `${signingInput}.${toBase64Url(signature)}`;
}
