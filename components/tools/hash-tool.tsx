"use client";

import { useEffect, useRef, useState } from "react";

import { cn, errorMessage, readFileBytes } from "@/lib/browser";
import { type Bytes, toBase64, toHex, utf8Encode } from "@/lib/crypto/encoding";
import { digestAll, type HashAlgorithm, LEGACY_HASHES } from "@/lib/crypto/hash";
import { format } from "@/lib/i18n/config";

import { useI18n } from "../i18n-provider";
import { Alert, Badge, Card, CopyButton, Field, FileDrop, Input, Segmented, Spinner, TextArea, TextStats, Toggle } from "../ui";

type Digest = { algorithm: HashAlgorithm; value: Bytes };

export function HashTool() {
  const { t } = useI18n();
  const copy = t.tools.hash;
  const [source, setSource] = useState<"text" | "file">("text");
  const [text, setText] = useState("");
  const [textDigests, setTextDigests] = useState<Digest[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileDigests, setFileDigests] = useState<Digest[] | null>(null);
  const [hashingFile, setHashingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRequest = useRef(0);
  const [encoding, setEncoding] = useState<"hex" | "base64">("hex");
  const [uppercase, setUppercase] = useState(false);
  const [expected, setExpected] = useState("");

  useEffect(() => {
    if (!text) return;
    let cancelled = false;
    digestAll(utf8Encode(text)).then((results) => {
      if (!cancelled) setTextDigests(results);
    });
    return () => {
      cancelled = true;
    };
  }, [text]);

  async function onFile(next: File) {
    // Ignore results from a previous file if another one was dropped meanwhile.
    const request = ++fileRequest.current;
    setFile(next);
    setFileDigests(null);
    setFileError(null);
    setHashingFile(true);
    try {
      const results = await digestAll(await readFileBytes(next));
      if (request === fileRequest.current) setFileDigests(results);
    } catch (error) {
      if (request === fileRequest.current) setFileError(format(t.common.unexpectedError, { message: errorMessage(error) }));
    } finally {
      if (request === fileRequest.current) setHashingFile(false);
    }
  }

  const digests = source === "text" ? (text ? textDigests : null) : fileDigests;
  const render = (bytes: Bytes) => {
    if (encoding === "base64") return toBase64(bytes);
    return uppercase ? toHex(bytes).toUpperCase() : toHex(bytes);
  };

  const wanted = expected.trim().replace(/[\s:]/g, "");
  const matched = wanted
    ? digests?.find((d) => toHex(d.value) === wanted.toLowerCase() || toBase64(d.value) === wanted)
    : undefined;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <Card>
        <Segmented
          label={t.common.input}
          value={source}
          onChange={setSource}
          options={[
            { value: "text", label: t.common.text, icon: "binary" },
            { value: "file", label: t.common.file, icon: "upload" },
          ]}
          className="mb-4 w-full"
        />
        {source === "text" ? (
          <Field label={t.common.input} htmlFor="hash-input" aside={<TextStats text={text} />}>
            <TextArea
              id="hash-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={copy.placeholder}
              className="min-h-48"
            />
          </Field>
        ) : (
          <div className="flex flex-col gap-3">
            <FileDrop file={file} onFile={onFile} />
            {fileError && <Alert variant="error">{fileError}</Alert>}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5">
          <Field label={copy.compareLabel} htmlFor="hash-compare">
            <Input
              id="hash-compare"
              mono
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder={copy.comparePlaceholder}
            />
          </Field>
          {wanted && digests && (
            <Alert variant={matched ? "success" : "error"}>
              {matched ? format(copy.compareMatch, { algorithm: matched.algorithm }) : copy.compareNoMatch}
            </Alert>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{t.common.output}</h2>
          <div className="flex flex-wrap items-center gap-3">
            {encoding === "hex" && (
              <Toggle checked={uppercase} onChange={setUppercase}>
                <span className="text-xs text-muted">{t.common.uppercase}</span>
              </Toggle>
            )}
            <Segmented
              size="sm"
              label={t.common.format}
              value={encoding}
              onChange={setEncoding}
              options={[
                { value: "hex", label: t.common.hex },
                { value: "base64", label: t.common.base64 },
              ]}
            />
          </div>
        </div>

        {hashingFile && file ? (
          <p className="flex items-center gap-2 py-10 text-sm text-muted">
            <Spinner /> {format(copy.hashing, { name: file.name })}
          </p>
        ) : !digests ? (
          <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted">{copy.empty}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {digests.map(({ algorithm, value }) => (
              <li
                key={algorithm}
                className={cn(
                  "rounded-xl border bg-surface-muted/50 px-3.5 py-2.5 transition-colors",
                  matched?.algorithm === algorithm ? "border-emerald-500/60 ring-2 ring-emerald-500/15" : "border-border",
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    {algorithm}
                    {LEGACY_HASHES.has(algorithm) && <Badge tone="warning">{t.common.legacy}</Badge>}
                    {algorithm === "SHA-256" && <Badge tone="accent">{t.common.recommended}</Badge>}
                  </span>
                  <CopyButton value={render(value)} className="-my-1 -mr-2" />
                </div>
                <p className="font-mono text-[13px] leading-relaxed break-all">{render(value)}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs leading-relaxed text-muted">{copy.legacyNote}</p>
      </Card>
    </div>
  );
}
