"use client";

import { useState } from "react";

import { cn } from "@/lib/browser";
import { atbash, caesar, crackCaesar, rot13, vigenere } from "@/lib/crypto/classic";
import { format } from "@/lib/i18n/config";

import { useI18n } from "../i18n-provider";
import { Alert, Badge, Card, CopyButton, Field, Input, Output, Segmented, TextArea } from "../ui";

const CIPHERS = ["caesar", "rot13", "vigenere", "atbash"] as const;
type Cipher = (typeof CIPHERS)[number];

export function ClassicTool() {
  const { t } = useI18n();
  const copy = t.tools.classic;
  const [cipher, setCipher] = useState<Cipher>("caesar");
  const [direction, setDirection] = useState<"encrypt" | "decrypt">("encrypt");
  const [input, setInput] = useState("");
  const [shift, setShift] = useState(3);
  const [keyword, setKeyword] = useState("");

  const decrypting = direction === "decrypt";
  const selfInverse = cipher === "rot13" || cipher === "atbash";
  const output =
    cipher === "caesar"
      ? caesar(input, decrypting ? -shift : shift)
      : cipher === "rot13"
        ? rot13(input)
        : cipher === "atbash"
          ? atbash(input)
          : vigenere(input, keyword, decrypting);

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label={copy.cipher}
            value={cipher}
            onChange={setCipher}
            options={CIPHERS.map((c) => ({ value: c, label: copy.ciphers[c] }))}
          />
          {!selfInverse && (
            <Segmented
              label={t.common.input}
              value={direction}
              onChange={setDirection}
              options={[
                { value: "encrypt", label: t.common.encrypt },
                { value: "decrypt", label: t.common.decrypt },
              ]}
            />
          )}
          <span className="sm:ml-auto">
            <Badge tone="warning">{t.common.notSecure}</Badge>
          </span>
        </div>
        {cipher === "caesar" && (
          <Field
            label={copy.shift}
            htmlFor="caesar-shift"
            aside={<span className="font-mono text-sm font-semibold tabular-nums">{shift}</span>}
          >
            <input
              id="caesar-shift"
              type="range"
              min={1}
              max={25}
              value={shift}
              onChange={(e) => setShift(Number(e.target.value))}
            />
          </Field>
        )}
        {cipher === "vigenere" && (
          <Field label={copy.keyword} htmlFor="vigenere-key">
            <Input
              id="vigenere-key"
              mono
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={copy.keywordPlaceholder}
              autoComplete="off"
            />
          </Field>
        )}
        {selfInverse && <Alert variant="info">{format(copy.selfInverse, { cipher: copy.ciphers[cipher] })}</Alert>}
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label={t.common.input} htmlFor="classic-input">
            <TextArea
              id="classic-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={copy.placeholder}
              className="min-h-36"
            />
          </Field>
          <Output label={t.common.output} value={output} mono={false} className="[&>div:last-child]:min-h-36" />
        </div>
      </Card>

      <CaesarCracker />
    </div>
  );
}

function CaesarCracker() {
  const { t } = useI18n();
  const copy = t.tools.classic;
  const [ciphertext, setCiphertext] = useState("");
  const candidates = /[a-z]/i.test(ciphertext) ? crackCaesar(ciphertext) : [];

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold">{copy.bruteTitle}</h2>
        <p className="mt-1 text-sm text-muted">{copy.bruteBody}</p>
      </div>
      <TextArea
        mono
        value={ciphertext}
        onChange={(e) => setCiphertext(e.target.value)}
        placeholder="Vhudqjdq glpxodl vddw idmdu"
        aria-label={copy.bruteTitle}
        className="min-h-20"
      />
      {candidates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted">{copy.bruteEmpty}</p>
      ) : (
        <ol className="flex max-h-96 flex-col gap-1.5 overflow-y-auto pr-1">
          {candidates.map((candidate, i) => (
            <li
              key={candidate.shift}
              className={cn(
                "group flex items-start gap-3 rounded-xl border px-3.5 py-2",
                i === 0 ? "border-emerald-500/50 bg-emerald-500/5" : "border-transparent hover:bg-surface-muted/60",
              )}
            >
              <span className="w-16 shrink-0 pt-0.5 text-xs text-muted tabular-nums">
                {format(copy.shiftN, { n: candidate.shift })}
              </span>
              <span className="min-w-0 flex-1 font-mono text-[13px] break-words">{candidate.text}</span>
              {i === 0 && <Badge tone="accent">{copy.bestGuess}</Badge>}
              <CopyButton value={candidate.text} label="" className="-my-1 opacity-0 group-hover:opacity-100 focus:opacity-100" />
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
