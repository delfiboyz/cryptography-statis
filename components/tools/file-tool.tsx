"use client";

import { useState } from "react";

import { downloadBlob, readFileBytes } from "@/lib/browser";
import { decryptFile, DEFAULT_ITERATIONS, encryptFile } from "@/lib/crypto/aes";
import { type Bytes, formatBytes } from "@/lib/crypto/encoding";
import { format } from "@/lib/i18n/config";

import { useI18n } from "../i18n-provider";
import { Icon } from "../icons";
import { Alert, Button, Card, Field, FileDrop, PasswordInput, Segmented } from "../ui";
import { decryptionErrorText, IterationSelect } from "./aes-tool";

const LARGE_FILE = 200 * 1024 * 1024;

interface Result {
  name: string;
  type: string;
  data: Bytes;
  ms: number;
}

export function FileTool() {
  const { t } = useI18n();
  const copy = t.tools.file;
  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [iterations, setIterations] = useState<number>(DEFAULT_ITERATIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  function reset(nextMode = mode, nextFile = file) {
    setMode(nextMode);
    setFile(nextFile);
    setError(null);
    setResult(null);
  }

  async function run() {
    if (!file) return setError(copy.noFile);
    if (!password) return setError(t.tools.aes.passwordRequired);
    setBusy(true);
    setError(null);
    setResult(null);
    const started = performance.now();
    try {
      const data = await readFileBytes(file);
      const next =
        mode === "encrypt"
          ? {
              name: `${file.name}.enc`,
              type: "application/octet-stream",
              data: await encryptFile(data, { name: file.name, type: file.type }, password, iterations),
            }
          : await decryptFile(data, password);
      const done = { ...next, ms: Math.round(performance.now() - started) };
      setResult(done);
      downloadBlob(done.data, done.name, done.type || "application/octet-stream");
    } catch (e) {
      setError(decryptionErrorText(e, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Card className="flex flex-col gap-4">
        <Segmented
          label={t.common.input}
          value={mode}
          onChange={(next) => reset(next, null)}
          options={[
            { value: "encrypt", label: t.common.encrypt, icon: "lock" },
            { value: "decrypt", label: t.common.decrypt, icon: "unlock" },
          ]}
          className="w-full"
        />
        <FileDrop
          file={file}
          onFile={(next) => reset(mode, next)}
          title={mode === "encrypt" ? copy.dropEncrypt : copy.dropDecrypt}
          accept={mode === "decrypt" ? ".enc,application/octet-stream" : undefined}
        />
        {file && file.size > LARGE_FILE && <Alert variant="warning">{copy.largeFile}</Alert>}
        <Field label={t.common.password} htmlFor="file-password">
          <PasswordInput
            id="file-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.tools.aes.passwordPlaceholder}
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
        </Field>
        {mode === "encrypt" && <IterationSelect value={iterations} onChange={setIterations} />}
        <Button variant="primary" icon={mode === "encrypt" ? "lock" : "unlock"} loading={busy} onClick={run} className="self-start">
          {busy ? t.common.processing : copy.action[mode]}
        </Button>
      </Card>

      <Card className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}
        {result ? (
          <div className="animate-pop-in flex flex-col items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
              <Icon name={mode === "encrypt" ? "fileLock" : "checkCircle"} className="size-6" />
            </span>
            <div>
              <p className="font-medium">{mode === "encrypt" ? copy.resultEncrypted : copy.resultDecrypted}</p>
              <p className="mt-1 font-mono text-xs break-all text-muted">
                {result.name} · {formatBytes(result.data.length)}
              </p>
              <p className="mt-1 text-xs text-muted">{format(t.common.doneIn, { ms: result.ms })}</p>
            </div>
            <Button
              icon="download"
              onClick={() => downloadBlob(result.data, result.name, result.type || "application/octet-stream")}
            >
              {t.common.download}
            </Button>
          </div>
        ) : (
          !error && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted">
              <Icon name="fileLock" className="size-6" />
              {t.tools.file.summary}
            </div>
          )
        )}
        <Alert variant="info">{copy.note}</Alert>
      </Card>
    </div>
  );
}
