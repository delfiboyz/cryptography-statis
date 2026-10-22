"use client";

import { useState } from "react";

import { downloadBlob, errorMessage } from "@/lib/browser";
import { type GeneratedKeyPair, generateKeyPair, KEY_ALGORITHMS, type KeyAlgorithm, keyPurpose } from "@/lib/crypto/keys";
import { format } from "@/lib/i18n/config";

import { useI18n } from "../i18n-provider";
import { Alert, Button, Card, CopyButton, Field, Output, Segmented, Select } from "../ui";

const PURPOSES = ["sign", "encrypt", "agree"] as const;

export function KeysTool() {
  const { t } = useI18n();
  const copy = t.tools.keys;
  const [algorithm, setAlgorithm] = useState<KeyAlgorithm>("Ed25519");
  const [exportFormat, setExportFormat] = useState<"pem" | "jwk">("pem");
  const [pair, setPair] = useState<GeneratedKeyPair | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    const started = performance.now();
    try {
      setPair(await generateKeyPair(algorithm));
      setElapsed(Math.round(performance.now() - started));
    } catch (e) {
      setPair(null);
      // Browsers throw NotSupportedError for algorithms they have not shipped yet (e.g. X25519).
      const unsupported = e instanceof DOMException && e.name === "NotSupportedError";
      setError(unsupported ? format(t.common.unsupported, { name: algorithm }) : errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const slug = algorithm.toLowerCase();
  const publicText = pair ? (exportFormat === "pem" ? pair.publicPem : JSON.stringify(pair.publicJwk, null, 2)) : "";
  const privateText = pair ? (exportFormat === "pem" ? pair.privatePem : JSON.stringify(pair.privateJwk, null, 2)) : "";
  const extension = exportFormat === "pem" ? "pem" : "jwk.json";

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <Field label={t.common.algorithm} htmlFor="key-alg" hint={copy.hints[algorithm]}>
            <Select id="key-alg" value={algorithm} onChange={(e) => setAlgorithm(e.target.value as KeyAlgorithm)}>
              {PURPOSES.map((purpose) => (
                <optgroup key={purpose} label={copy.purposes[purpose]}>
                  {KEY_ALGORITHMS.filter((a) => keyPurpose(a) === purpose).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Button variant="primary" icon="key" loading={busy} onClick={generate} className="md:mb-6">
            {busy ? copy.generating : copy.generate}
          </Button>
        </div>
        {error && <Alert variant="error" className="mt-4">{error}</Alert>}
      </Card>

      {pair ? (
        <Card className="animate-pop-in flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              <span className="font-semibold text-fg">{pair.algorithm}</span> · {format(copy.generatedIn, { ms: elapsed })}
            </p>
            <Segmented
              size="sm"
              label={t.common.format}
              value={exportFormat}
              onChange={setExportFormat}
              options={[
                { value: "pem", label: "PEM" },
                { value: "jwk", label: "JWK" },
              ]}
            />
          </div>

          <Field
            label={copy.fingerprint}
            aside={<CopyButton value={pair.fingerprint} />}
          >
            <p className="rounded-lg border border-border bg-surface-muted/60 px-3 py-2.5 font-mono text-[13px] break-all">
              {pair.fingerprint}
              <span className="mt-1 block text-[11px] text-muted">{pair.fingerprintHex}</span>
            </p>
          </Field>

          <div className="grid gap-5 lg:grid-cols-2">
            <Output
              label={copy.publicKey}
              value={publicText}
              aside={
                <Button
                  size="sm"
                  variant="ghost"
                  icon="download"
                  onClick={() => downloadBlob(publicText, `${slug}-public.${extension}`, "text/plain")}
                >
                  {t.common.download}
                </Button>
              }
            />
            <Output
              label={copy.privateKey}
              value={privateText}
              aside={
                <Button
                  size="sm"
                  variant="ghost"
                  icon="download"
                  onClick={() => downloadBlob(privateText, `${slug}-private.${extension}`, "text/plain")}
                >
                  {t.common.download}
                </Button>
              }
            />
          </div>
          <Alert variant="warning">{copy.privateWarning}</Alert>
        </Card>
      ) : (
        !error && (
          <p className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted">{copy.empty}</p>
        )
      )}
    </div>
  );
}
