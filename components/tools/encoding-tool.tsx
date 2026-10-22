"use client";

import { useState } from "react";

import { errorMessage } from "@/lib/browser";
import {
  type Bytes,
  fromBase64,
  fromBinary,
  fromHex,
  toBase64,
  toBase64Url,
  toBinary,
  toHex,
  utf8Decode,
  utf8Encode,
} from "@/lib/crypto/encoding";
import { format } from "@/lib/i18n/config";

import { useI18n } from "../i18n-provider";
import { Alert, Card, Field, IconButton, Output, Segmented, TextArea, TextStats } from "../ui";

const SCHEMES = ["base64", "base64url", "hex", "binary", "url"] as const;
type Scheme = (typeof SCHEMES)[number];

const ENCODERS: Record<Exclude<Scheme, "url">, { encode: (b: Bytes) => string; decode: (s: string) => Bytes }> = {
  base64: { encode: toBase64, decode: fromBase64 },
  base64url: { encode: toBase64Url, decode: fromBase64 },
  hex: { encode: (b) => toHex(b), decode: fromHex },
  binary: { encode: toBinary, decode: fromBinary },
};

type Result = { output: string; error?: string; notUtf8?: boolean };

function convert(input: string, scheme: Scheme, direction: "encode" | "decode"): Result {
  if (!input) return { output: "" };
  try {
    if (scheme === "url") {
      return { output: direction === "encode" ? encodeURIComponent(input) : decodeURIComponent(input.replace(/\+/g, " ")) };
    }
    const codec = ENCODERS[scheme];
    if (direction === "encode") return { output: codec.encode(utf8Encode(input)) };
    const bytes = codec.decode(input);
    try {
      return { output: utf8Decode(bytes) };
    } catch {
      // Binary data (an image, a key…) is still useful to see, just not as text.
      return { output: toHex(bytes), notUtf8: true };
    }
  } catch (error) {
    return { output: "", error: errorMessage(error) };
  }
}

export function EncodingTool() {
  const { t } = useI18n();
  const copy = t.tools.encoding;
  const [scheme, setScheme] = useState<Scheme>("base64");
  const [direction, setDirection] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  const result = convert(input, scheme, direction);

  function swap() {
    if (result.error || result.notUtf8) return;
    setInput(result.output);
    setDirection(direction === "encode" ? "decode" : "encode");
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center gap-3">
        <Segmented
          label={copy.scheme}
          value={scheme}
          onChange={setScheme}
          options={SCHEMES.map((s) => ({ value: s, label: copy.schemes[s] }))}
          className="max-w-full"
        />
        <Segmented
          label={t.common.input}
          value={direction}
          onChange={setDirection}
          options={[
            { value: "encode", label: t.common.encode },
            { value: "decode", label: t.common.decode },
          ]}
          className="sm:ml-auto"
        />
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Card>
          <Field label={t.common.input} htmlFor="enc-input" aside={<TextStats text={input} />}>
            <TextArea
              id="enc-input"
              mono={direction === "decode"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={direction === "encode" ? copy.encodePlaceholder : copy.decodePlaceholder}
              className="min-h-56"
            />
          </Field>
        </Card>
        <IconButton
          icon="swap"
          label={t.common.swap}
          onClick={swap}
          disabled={!result.output || !!result.error || result.notUtf8}
          className="mx-auto rotate-90 border border-border bg-surface lg:mt-24 lg:rotate-0"
        />
        <Card className="flex flex-col gap-3">
          <Output
            label={t.common.output}
            value={result.output}
            placeholder={copy.empty}
            mono={direction === "encode" || !!result.notUtf8}
            className="[&>div:last-child]:min-h-56"
          />
          {result.error && (
            <Alert variant="error">{format(copy.invalid, { scheme: copy.schemes[scheme], message: result.error })}</Alert>
          )}
          {result.notUtf8 && <Alert variant="info">{copy.notUtf8}</Alert>}
        </Card>
      </div>
    </div>
  );
}
