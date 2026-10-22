"use client";

import { useState } from "react";

import { errorMessage } from "@/lib/browser";
import { DecryptionError, decryptText, DEFAULT_ITERATIONS, encryptText, ITERATION_PRESETS } from "@/lib/crypto/aes";
import { type Bytes, fromBase64, toBase64 } from "@/lib/crypto/encoding";
import { analyzePassword } from "@/lib/crypto/password";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { format } from "@/lib/i18n/config";

import { useI18n } from "../i18n-provider";
import { Alert, Button, Card, Field, Kbd, Output, PasswordInput, Segmented, Select, TextArea, TextStats } from "../ui";

export function decryptionErrorText(error: unknown, t: Dictionary): string {
  const copy = t.tools.aes;
  if (error instanceof DecryptionError) {
    return { auth: copy.errorAuth, format: copy.errorFormat, kind: copy.errorKind }[error.reason];
  }
  if (error instanceof TypeError && /utf|decode/i.test(error.message)) return copy.errorUtf8;
  return format(t.common.unexpectedError, { message: errorMessage(error) });
}

export function IterationSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { lang, t } = useI18n();
  const nf = new Intl.NumberFormat(lang);
  return (
    <Field label={t.tools.aes.iterations} htmlFor="pbkdf2-iterations" hint={t.tools.aes.iterationsHint}>
      <Select id="pbkdf2-iterations" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {ITERATION_PRESETS.map((n) => (
          <option key={n} value={n}>
            {nf.format(n)}
            {n === DEFAULT_ITERATIONS ? ` — ${t.common.recommended}` : ""}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function AesTool() {
  const { t } = useI18n();
  const copy = t.tools.aes;
  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [iterations, setIterations] = useState<number>(DEFAULT_ITERATIONS);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const weak = mode === "encrypt" && password !== "" && analyzePassword(password).score < 2;

  function switchMode(next: "encrypt" | "decrypt") {
    setMode(next);
    setOutput("");
    setError(null);
    setElapsed(null);
  }

  async function run() {
    if (!password) {
      setError(copy.passwordRequired);
      return;
    }
    setBusy(true);
    setError(null);
    setOutput("");
    const started = performance.now();
    try {
      if (mode === "encrypt") {
        setOutput(toBase64(await encryptText(input, password, iterations)));
      } else {
        let payload: Bytes;
        try {
          payload = fromBase64(input);
        } catch {
          setError(copy.errorBase64);
          return;
        }
        setOutput(await decryptText(payload, password));
      }
      setElapsed(Math.round(performance.now() - started));
    } catch (e) {
      setError(decryptionErrorText(e, t));
    } finally {
      setBusy(false);
    }
  }

  /** Feeds the result back as input in the other mode, e.g. to check a round-trip. */
  function swap() {
    setInput(output);
    switchMode(mode === "encrypt" ? "decrypt" : "encrypt");
  }

  return (
    <form
      className="grid gap-5 lg:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          run();
        }
      }}
    >
      <Card className="flex flex-col gap-4">
        <Segmented
          label={t.common.input}
          value={mode}
          onChange={switchMode}
          options={[
            { value: "encrypt", label: t.common.encrypt, icon: "lock" },
            { value: "decrypt", label: t.common.decrypt, icon: "unlock" },
          ]}
          className="w-full"
        />
        <Field
          label={mode === "encrypt" ? copy.plaintext : copy.ciphertext}
          htmlFor="aes-input"
          aside={<TextStats text={input} />}
        >
          <TextArea
            id="aes-input"
            mono={mode === "decrypt"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encrypt" ? copy.plaintextPlaceholder : copy.ciphertextPlaceholder}
            className="min-h-40"
          />
        </Field>
        <Field label={t.common.password} htmlFor="aes-password">
          <PasswordInput
            id="aes-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={copy.passwordPlaceholder}
          />
        </Field>
        {weak && <Alert variant="warning">{copy.weakPassword}</Alert>}
        {mode === "encrypt" && <IterationSelect value={iterations} onChange={setIterations} />}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" icon={mode === "encrypt" ? "lock" : "unlock"} loading={busy}>
            {busy ? t.common.processing : mode === "encrypt" ? t.common.encrypt : t.common.decrypt}
          </Button>
          <span className="hidden items-center gap-1 text-xs text-muted sm:flex">
            <Kbd>
              <span className="kbd-apple">⌘</span>
              <span className="kbd-other">Ctrl</span>
            </Kbd>
            <Kbd>↵</Kbd>
          </span>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <Output
          label={mode === "encrypt" ? copy.ciphertext : copy.plaintext}
          value={output}
          mono={mode === "encrypt"}
          aside={
            output && (
              <Button size="sm" variant="ghost" icon="swap" onClick={swap} title={t.common.swap}>
                {mode === "encrypt" ? t.common.decrypt : t.common.encrypt}
              </Button>
            )
          }
        />
        {error && <Alert variant="error">{error}</Alert>}
        {elapsed !== null && !error && (
          <Alert variant="success">{format(t.common.doneIn, { ms: elapsed })}</Alert>
        )}
        <details className="group rounded-xl border border-border bg-surface-muted/50 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium marker:text-muted">{copy.formatTitle}</summary>
          <p className="mt-2 leading-relaxed text-muted">{copy.formatBody}</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-surface p-3 font-mono text-[11px] leading-relaxed text-muted ring-1 ring-border">
            {"CRY · version · kind · iterations · salt[16] · iv[12] · ciphertext · tag[16]"}
          </pre>
        </details>
      </Card>
    </form>
  );
}
