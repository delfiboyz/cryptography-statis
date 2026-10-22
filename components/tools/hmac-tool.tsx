"use client";

import { useEffect, useMemo, useState } from "react";

import { errorMessage } from "@/lib/browser";
import {
  type Bytes,
  constantTimeEqual,
  decodeText,
  fromBase64,
  fromHex,
  type TextFormat,
  toBase64,
  toHex,
  utf8Encode,
} from "@/lib/crypto/encoding";
import { HMAC_ALGORITHMS, type HmacAlgorithm, hmac } from "@/lib/crypto/hmac";

import { useI18n } from "../i18n-provider";
import { Alert, Badge, Card, Field, Input, Output, Segmented, Select, TextArea, TextStats } from "../ui";

/** Accepts a MAC pasted as hex (with optional separators) or as Base64. */
function parseMac(input: string): Bytes | null {
  const clean = input.trim();
  try {
    return /^(0x)?[0-9a-f\s:]+$/i.test(clean) ? fromHex(clean) : fromBase64(clean);
  } catch {
    return null;
  }
}

export function HmacTool() {
  const { t } = useI18n();
  const copy = t.tools.hmac;
  const [algorithm, setAlgorithm] = useState<HmacAlgorithm>("SHA-256");
  const [key, setKey] = useState("");
  const [keyFormat, setKeyFormat] = useState<TextFormat>("utf8");
  const [message, setMessage] = useState("");
  const [outputFormat, setOutputFormat] = useState<"hex" | "base64">("hex");
  const [expected, setExpected] = useState("");
  const [result, setResult] = useState<{ inputs: string; mac: Bytes } | null>(null);

  const keyBytes = useMemo(() => {
    try {
      return { bytes: decodeText(key, keyFormat), error: null };
    } catch (error) {
      return { bytes: null, error: errorMessage(error) };
    }
  }, [key, keyFormat]);

  const ready = key !== "" && keyBytes.bytes !== null;
  const inputs = JSON.stringify([algorithm, key, keyFormat, message]);

  useEffect(() => {
    if (!ready || !keyBytes.bytes) return;
    let cancelled = false;
    hmac(algorithm, keyBytes.bytes, utf8Encode(message)).then((mac) => {
      if (!cancelled) setResult({ inputs, mac });
    });
    return () => {
      cancelled = true;
    };
  }, [algorithm, inputs, keyBytes.bytes, message, ready]);

  // Only show a MAC that belongs to the current inputs.
  const mac = ready && result?.inputs === inputs ? result.mac : null;
  const expectedBytes = expected.trim() ? parseMac(expected) : null;
  const verified = mac && expectedBytes ? constantTimeEqual(mac, expectedBytes) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="flex flex-col gap-4">
        <Field label={t.common.algorithm} htmlFor="hmac-alg">
          <Select id="hmac-alg" value={algorithm} onChange={(e) => setAlgorithm(e.target.value as HmacAlgorithm)}>
            {HMAC_ALGORITHMS.map((a) => (
              <option key={a} value={a}>
                HMAC-{a}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={copy.keyLabel}
          htmlFor="hmac-key"
          aside={
            <Segmented
              size="sm"
              label={copy.keyFormat}
              value={keyFormat}
              onChange={setKeyFormat}
              options={[
                { value: "utf8", label: t.common.text },
                { value: "hex", label: t.common.hex },
                { value: "base64", label: t.common.base64 },
              ]}
            />
          }
        >
          <Input
            id="hmac-key"
            mono={keyFormat !== "utf8"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={copy.keyPlaceholder}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        {keyBytes.error && key && <Alert variant="error">{keyBytes.error}</Alert>}
        <Field label={t.common.message} htmlFor="hmac-msg" aside={<TextStats text={message} />}>
          <TextArea
            id="hmac-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={copy.messagePlaceholder}
            className="min-h-36"
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <Output
          label={
            <span className="flex items-center gap-2">
              HMAC-{algorithm}
              {algorithm === "SHA-1" && <Badge tone="warning">{t.common.legacy}</Badge>}
            </span>
          }
          value={mac ? (outputFormat === "hex" ? toHex(mac) : toBase64(mac)) : ""}
          placeholder={copy.empty}
          aside={
            <Segmented
              size="sm"
              label={t.common.format}
              value={outputFormat}
              onChange={setOutputFormat}
              options={[
                { value: "hex", label: t.common.hex },
                { value: "base64", label: t.common.base64 },
              ]}
            />
          }
        />
        <Field label={copy.verifyLabel} htmlFor="hmac-verify">
          <Input
            id="hmac-verify"
            mono
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            placeholder={copy.verifyPlaceholder}
          />
        </Field>
        {verified !== null && (
          <Alert variant={verified ? "success" : "error"}>{verified ? copy.verifyOk : copy.verifyFail}</Alert>
        )}
        {expected.trim() && !expectedBytes && <Alert variant="error">{copy.verifyFail}</Alert>}
      </Card>
    </div>
  );
}
