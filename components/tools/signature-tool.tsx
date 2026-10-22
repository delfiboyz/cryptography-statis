"use client";

import { useRef, useState } from "react";

import { errorMessage } from "@/lib/browser";
import { fromBase64, toBase64, utf8Encode } from "@/lib/crypto/encoding";
import {
  detectSignatureAlgorithm,
  generateKeyPair,
  PemError,
  SIGNATURE_ALGORITHMS,
  type SignatureAlgorithm,
  signMessage,
  verifyMessage,
} from "@/lib/crypto/keys";
import { format } from "@/lib/i18n/config";

import { useI18n } from "../i18n-provider";
import { Alert, Button, Card, CopyButton, Field, Select, TextArea, TextStats } from "../ui";

const LABELS: Record<SignatureAlgorithm, string> = {
  Ed25519: "Ed25519",
  "ECDSA-P256": "ECDSA P-256 (SHA-256)",
  "ECDSA-P384": "ECDSA P-384 (SHA-384)",
  "RSA-PSS-2048": "RSA-PSS (SHA-256)",
};

type Status = { variant: "success" | "error" | "info"; text: string } | null;

export function SignatureTool() {
  const { t } = useI18n();
  const copy = t.tools.signature;
  const [algorithm, setAlgorithm] = useState<SignatureAlgorithm>("Ed25519");
  const [privatePem, setPrivatePem] = useState("");
  const [publicPem, setPublicPem] = useState("");
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState<"generate" | "sign" | "verify" | null>(null);
  const detectRequest = useRef(0);

  function describe(error: unknown): string {
    if (error instanceof PemError) return copy.pemErrors[error.code];
    if (error instanceof DOMException && error.name === "NotSupportedError") {
      return format(t.common.unsupported, { name: algorithm });
    }
    if (error instanceof DOMException) return copy.importFailed;
    return format(t.common.unexpectedError, { message: errorMessage(error) });
  }

  /** Switches the algorithm automatically when a pasted key clearly belongs to another one. */
  async function onKeyChange(pem: string, setter: (value: string) => void) {
    setter(pem);
    if (!pem.includes("-----BEGIN")) return;
    const request = ++detectRequest.current;
    const detected = await detectSignatureAlgorithm(pem);
    if (request !== detectRequest.current || !detected || detected === algorithm) return;
    setAlgorithm(detected);
    setStatus({ variant: "info", text: format(copy.detected, { algorithm: LABELS[detected] }) });
  }

  async function act(kind: "generate" | "sign" | "verify") {
    setBusy(kind);
    setStatus(null);
    try {
      if (kind === "generate") {
        const pair = await generateKeyPair(algorithm);
        setPrivatePem(pair.privatePem);
        setPublicPem(pair.publicPem);
        setSignature("");
      } else if (kind === "sign") {
        if (!privatePem.trim()) return setStatus({ variant: "error", text: copy.needPrivate });
        setSignature(toBase64(await signMessage(algorithm, privatePem, utf8Encode(message))));
      } else {
        if (!publicPem.trim() || !signature.trim()) return setStatus({ variant: "error", text: copy.needPublic });
        let sig;
        try {
          sig = fromBase64(signature);
        } catch {
          return setStatus({ variant: "error", text: copy.verifyFail });
        }
        const ok = await verifyMessage(algorithm, publicPem, sig, utf8Encode(message));
        setStatus(ok ? { variant: "success", text: copy.verifyOk } : { variant: "error", text: copy.verifyFail });
      }
    } catch (error) {
      setStatus({ variant: "error", text: describe(error) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Field label={t.common.algorithm} htmlFor="sig-alg" className="flex-1">
            <Select
              id="sig-alg"
              value={algorithm}
              onChange={(e) => {
                setAlgorithm(e.target.value as SignatureAlgorithm);
                setStatus(null);
              }}
            >
              {SIGNATURE_ALGORITHMS.map((a) => (
                <option key={a} value={a}>
                  {LABELS[a]}
                </option>
              ))}
            </Select>
          </Field>
          <Button icon="key" loading={busy === "generate"} onClick={() => act("generate")}>
            {copy.generatePair}
          </Button>
        </div>
        {algorithm.startsWith("ECDSA") && <p className="mt-3 text-xs text-muted">{copy.ecdsaNote}</p>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <Field label={copy.privateKey} htmlFor="sig-private" aside={<CopyButton value={privatePem} />}>
            <TextArea
              id="sig-private"
              mono
              value={privatePem}
              onChange={(e) => onKeyChange(e.target.value, setPrivatePem)}
              placeholder="-----BEGIN PRIVATE KEY-----"
              className="min-h-32 text-xs"
            />
          </Field>
          <Field label={copy.publicKey} htmlFor="sig-public" aside={<CopyButton value={publicPem} />}>
            <TextArea
              id="sig-public"
              mono
              value={publicPem}
              onChange={(e) => onKeyChange(e.target.value, setPublicPem)}
              placeholder="-----BEGIN PUBLIC KEY-----"
              className="min-h-28 text-xs"
            />
          </Field>
        </Card>

        <Card className="flex flex-col gap-4">
          <Field label={t.common.message} htmlFor="sig-message" aside={<TextStats text={message} />}>
            <TextArea
              id="sig-message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setStatus(null);
              }}
              placeholder={copy.messagePlaceholder}
            />
          </Field>
          <Field label={copy.signatureLabel} htmlFor="sig-value" aside={<CopyButton value={signature} />}>
            <TextArea
              id="sig-value"
              mono
              value={signature}
              onChange={(e) => {
                setSignature(e.target.value);
                setStatus(null);
              }}
              placeholder={copy.signaturePlaceholder}
              className="min-h-20"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon="pen" loading={busy === "sign"} onClick={() => act("sign")}>
              {copy.sign}
            </Button>
            <Button icon="checkCircle" loading={busy === "verify"} onClick={() => act("verify")}>
              {copy.verify}
            </Button>
          </div>
          {status && <Alert variant={status.variant}>{status.text}</Alert>}
        </Card>
      </div>
    </div>
  );
}
