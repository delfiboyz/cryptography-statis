import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DecryptionError, decryptFile, decryptText, encryptFile, encryptText, parseHeader } from "./aes.ts";
import { atbash, caesar, crackCaesar, rot13, vigenere } from "./classic.ts";
import {
  fromBase64,
  fromBinary,
  fromHex,
  toBase64,
  toBase64Url,
  toBinary,
  toHex,
  utf8Decode,
  utf8Encode,
} from "./encoding.ts";
import { detectHashAlgorithm, digest } from "./hash.ts";
import { hmac } from "./hmac.ts";
import { decodeJwt, signJwtHmac, verifyJwt } from "./jwt.ts";
import { detectSignatureAlgorithm, generateKeyPair, signMessage, verifyMessage } from "./keys.ts";
import { analyzePassword, generatePassword } from "./password.ts";
import { randomInt, uuidV4, uuidV7, uuidV7Timestamp } from "./random.ts";

const hex = async (p: Promise<Uint8Array> | Uint8Array) => toHex(await p);

describe("encoding", () => {
  it("round-trips Base64 against RFC 4648 vectors", () => {
    const vectors: [string, string][] = [
      ["", ""],
      ["f", "Zg=="],
      ["fo", "Zm8="],
      ["foo", "Zm9v"],
      ["foob", "Zm9vYg=="],
      ["fooba", "Zm9vYmE="],
      ["foobar", "Zm9vYmFy"],
    ];
    for (const [plain, encoded] of vectors) {
      assert.equal(toBase64(utf8Encode(plain)), encoded);
      assert.equal(utf8Decode(fromBase64(encoded)), plain);
    }
  });

  it("handles URL-safe Base64 and unpadded input", () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xfe]);
    assert.equal(toBase64(bytes), "+//+");
    assert.equal(toBase64Url(bytes), "-__-");
    assert.deepEqual(fromBase64("-__-"), bytes);
    assert.equal(utf8Decode(fromBase64("Zm8")), "fo");
  });

  it("rejects malformed input", () => {
    assert.throws(() => fromBase64("Zm9v!"));
    assert.throws(() => fromHex("abc"));
    assert.throws(() => fromHex("zz"));
    assert.throws(() => fromBinary("0101"));
    assert.throws(() => utf8Decode(new Uint8Array([0xff])));
  });

  it("converts hex and binary, including emoji", () => {
    const bytes = utf8Encode("Hi 👋");
    assert.equal(toHex(bytes), "486920f09f918b");
    assert.deepEqual(fromHex("0x48:69:20:f0:9f:91:8b"), bytes);
    assert.deepEqual(fromBinary(toBinary(bytes)), bytes);
  });
});

describe("hash", () => {
  it("matches known MD5 vectors", async () => {
    assert.equal(await hex(digest("MD5", utf8Encode(""))), "d41d8cd98f00b204e9800998ecf8427e");
    assert.equal(await hex(digest("MD5", utf8Encode("abc"))), "900150983cd24fb0d6963f7d28e17f72");
    assert.equal(
      await hex(digest("MD5", utf8Encode("The quick brown fox jumps over the lazy dog"))),
      "9e107d9d372bb6826bd81d3542a419d6",
    );
    // Crosses the 56-byte padding boundary.
    assert.equal(await hex(digest("MD5", utf8Encode("a".repeat(56)))), "3b0c8ac703f828b04c6c197006d17218");
  });

  it("matches known SHA vectors", async () => {
    assert.equal(await hex(digest("SHA-1", utf8Encode("abc"))), "a9993e364706816aba3e25717850c26c9cd0d89d");
    assert.equal(
      await hex(digest("SHA-256", utf8Encode("abc"))),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("detects algorithms from digest length", () => {
    assert.equal(detectHashAlgorithm("d41d8cd98f00b204e9800998ecf8427e"), "MD5");
    assert.equal(detectHashAlgorithm("a".repeat(64)), "SHA-256");
    assert.equal(detectHashAlgorithm("xyz"), null);
  });
});

describe("hmac", () => {
  it("matches RFC 4231 test case 2", async () => {
    assert.equal(
      await hex(hmac("SHA-256", utf8Encode("Jefe"), utf8Encode("what do ya want for nothing?"))),
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });

  it("accepts an empty key", async () => {
    assert.equal(
      await hex(hmac("SHA-256", new Uint8Array(0), new Uint8Array(0))),
      "b613679a0814d9ec772f95d778c35fc5ff1697c493715653c6c712144292c5ad",
    );
  });
});

describe("aes", () => {
  it("round-trips text and rejects a wrong password", async () => {
    const payload = await encryptText("rahasia negara 🇮🇩", "correct horse", 1000);
    assert.equal(parseHeader(payload).iterations, 1000);
    assert.equal(await decryptText(payload, "correct horse"), "rahasia negara 🇮🇩");
    await assert.rejects(decryptText(payload, "wrong"), (e) => e instanceof DecryptionError && e.reason === "auth");
  });

  it("detects tampering with the authenticated header", async () => {
    const payload = await encryptText("hello", "pw", 1000);
    payload[20] ^= 1; // flip a salt bit
    await assert.rejects(decryptText(payload, "pw"), DecryptionError);
  });

  it("round-trips files with metadata and keeps text/file payloads apart", async () => {
    const data = new Uint8Array([1, 2, 3, 250]);
    const payload = await encryptFile(data, { name: "laporan.pdf", type: "application/pdf" }, "pw", 1000);
    const result = await decryptFile(payload, "pw");
    assert.equal(result.name, "laporan.pdf");
    assert.equal(result.type, "application/pdf");
    assert.deepEqual(result.data, data);
    await assert.rejects(decryptText(payload, "pw"), (e) => e instanceof DecryptionError && e.reason === "kind");
  });

  it("rejects data that is not a payload", async () => {
    await assert.rejects(decryptText(utf8Encode("not encrypted at all, sorry!!!!!!!!!!!!!!!!!!!!!"), "pw"), {
      reason: "format",
    });
  });
});

describe("password", () => {
  it("generates passwords with every selected set", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword({
        length: 8,
        sets: { lower: true, upper: true, digits: true, symbols: true },
        excludeAmbiguous: true,
      });
      assert.equal(pw.length, 8);
      assert.match(pw, /[a-z]/);
      assert.match(pw, /[A-Z]/);
      assert.match(pw, /[0-9]/);
      assert.match(pw, /[^a-zA-Z0-9]/);
      assert.doesNotMatch(pw, /[Il1O0o]/);
    }
  });

  it("scores weak and strong passwords sensibly", () => {
    const weak = analyzePassword("password123");
    assert.equal(weak.score, 0);
    assert.ok(weak.warnings.includes("common"));
    assert.ok(analyzePassword("aaaaaaaaaaaa").warnings.includes("repeats"));
    assert.ok(analyzePassword("qwertyasdf").warnings.includes("sequence"));
    assert.equal(analyzePassword("v7#Qm9!xT2$wLp4&Zr8").score, 4);
    assert.equal(analyzePassword("").entropy, 0);
  });
});

describe("random", () => {
  it("produces RFC 9562 UUIDs", () => {
    assert.match(uuidV4(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const now = Date.UTC(2026, 9, 22, 12, 0, 0);
    const v7 = uuidV7(now);
    assert.match(v7, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(uuidV7Timestamp(v7)?.getTime(), now);
    assert.ok(uuidV7(now) < uuidV7(now + 1));
  });

  it("keeps randomInt in range", () => {
    for (let i = 0; i < 1000; i++) {
      const n = randomInt(7);
      assert.ok(n >= 0 && n < 7);
    }
  });
});

describe("classic ciphers", () => {
  it("encrypts and decrypts", () => {
    assert.equal(caesar("Hello, World!", 3), "Khoor, Zruog!");
    assert.equal(caesar("Khoor, Zruog!", -3), "Hello, World!");
    assert.equal(rot13(rot13("Kriptografi")), "Kriptografi");
    assert.equal(atbash("abc XYZ"), "zyx CBA");
    assert.equal(vigenere("ATTACK AT DAWN", "LEMON"), "LXFOPV EF RNHR");
    assert.equal(vigenere("LXFOPV EF RNHR", "LEMON", true), "ATTACK AT DAWN");
  });

  it("cracks a Caesar shift", () => {
    const secret = caesar("Serangan dimulai saat fajar menyingsing di pelabuhan", 11);
    assert.equal(crackCaesar(secret)[0].shift, 11);
  });
});

describe("public-key", () => {
  for (const algorithm of ["Ed25519", "ECDSA-P256", "RSA-PSS-2048"] as const) {
    it(`signs and verifies with ${algorithm}`, async () => {
      const pair = await generateKeyPair(algorithm);
      assert.match(pair.publicPem, /^-----BEGIN PUBLIC KEY-----\n/);
      assert.match(pair.fingerprint, /^SHA256:/);
      assert.equal(await detectSignatureAlgorithm(pair.privatePem), algorithm);
      const msg = utf8Encode("pesan penting");
      const sig = await signMessage(algorithm, pair.privatePem, msg);
      assert.equal(await verifyMessage(algorithm, pair.publicPem, sig, msg), true);
      assert.equal(await verifyMessage(algorithm, pair.publicPem, sig, utf8Encode("pesan palsu")), false);
    });
  }
});

describe("jwt", () => {
  it("signs, decodes and verifies HS256", async () => {
    const token = await signJwtHmac("HS256", { sub: "123", name: "Budi" }, "s3cr3t");
    const decoded = decodeJwt(token);
    assert.deepEqual(decoded.header, { alg: "HS256", typ: "JWT" });
    assert.deepEqual(decoded.payload, { sub: "123", name: "Budi" });
    assert.equal(await verifyJwt(decoded, "HS256", "s3cr3t"), true);
    assert.equal(await verifyJwt(decoded, "HS256", "wrong"), false);
  });

  it("verifies the jwt.io example token", async () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    assert.equal(await verifyJwt(decodeJwt(token), "HS256", "your-256-bit-secret"), true);
  });

  it("rejects malformed tokens", () => {
    assert.throws(() => decodeJwt("abc"), { code: "parts" });
    assert.throws(() => decodeJwt("e30.e30"), { code: "parts" });
    assert.throws(() => decodeJwt("bm9wZQ.e30.x"), { code: "header" });
  });
});
