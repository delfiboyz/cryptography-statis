"use client";

import { useState } from "react";

import { randomBytes, toBase64, toBase64Url, toHex } from "@/lib/crypto/encoding";
import { randomString, uuidV4, uuidV7, uuidV7Timestamp } from "@/lib/crypto/random";
import { formatDateTime } from "@/lib/format";
import { format } from "@/lib/i18n/config";

import { ClientOnly } from "../client-only";
import { useI18n } from "../i18n-provider";
import { Alert, Button, Card, CopyButton, Field, Select, Toggle } from "../ui";

const TYPES = ["uuid4", "uuid7", "hex", "base64", "base64url", "alnum"] as const;
type RandomType = (typeof TYPES)[number];

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

interface Options {
  type: RandomType;
  count: number;
  length: number;
  uppercase: boolean;
}

const isUuid = (type: RandomType) => type === "uuid4" || type === "uuid7";

function generate({ type, count, length, uppercase }: Options): string[] {
  return Array.from({ length: count }, () => {
    let value: string;
    if (type === "uuid4") value = uuidV4();
    else if (type === "uuid7") value = uuidV7();
    else if (type === "hex") value = toHex(randomBytes(length));
    else if (type === "base64") value = toBase64(randomBytes(length));
    else if (type === "base64url") value = toBase64Url(randomBytes(length));
    else value = randomString(length, ALNUM);
    return uppercase && (isUuid(type) || type === "hex") ? value.toUpperCase() : value;
  });
}

function bitsOf({ type, length }: Options): number {
  if (type === "uuid4") return 122;
  if (type === "uuid7") return 74;
  if (type === "alnum") return Math.floor(length * Math.log2(ALNUM.length));
  return length * 8;
}

export function RandomTool() {
  return (
    <ClientOnly fallback={<Card className="h-96 animate-pulse" />}>
      <RandomGenerator />
    </ClientOnly>
  );
}

function RandomGenerator() {
  const { lang, t } = useI18n();
  const copy = t.tools.random;
  const [options, setOptions] = useState<Options>({ type: "uuid7", count: 5, length: 32, uppercase: false });
  const [values, setValues] = useState(() => generate(options));

  function update(next: Options) {
    setOptions(next);
    setValues(generate(next));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <Card className="flex flex-col gap-4 self-start">
        <Field label={copy.type} htmlFor="rnd-type">
          <Select id="rnd-type" value={options.type} onChange={(e) => update({ ...options, type: e.target.value as RandomType })}>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {copy.types[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={copy.count}
          htmlFor="rnd-count"
          aside={<span className="font-mono text-sm font-semibold tabular-nums">{options.count}</span>}
        >
          <input
            id="rnd-count"
            type="range"
            min={1}
            max={50}
            value={options.count}
            onChange={(e) => update({ ...options, count: Number(e.target.value) })}
          />
        </Field>
        {!isUuid(options.type) && (
          <Field
            label={options.type === "alnum" ? copy.lengthChars : copy.lengthBytes}
            htmlFor="rnd-length"
            aside={<span className="font-mono text-sm font-semibold tabular-nums">{options.length}</span>}
          >
            <input
              id="rnd-length"
              type="range"
              min={4}
              max={128}
              value={options.length}
              onChange={(e) => update({ ...options, length: Number(e.target.value) })}
            />
          </Field>
        )}
        {(isUuid(options.type) || options.type === "hex") && (
          <Toggle checked={options.uppercase} onChange={(uppercase) => update({ ...options, uppercase })}>
            {t.common.uppercase}
          </Toggle>
        )}
        <p className="text-xs text-muted">{format(copy.bits, { bits: bitsOf(options) })}</p>
        {options.type === "uuid7" && <Alert variant="info">{copy.uuid7Note}</Alert>}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t.common.output}</h2>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" icon="refresh" onClick={() => update(options)}>
              {t.common.regenerate}
            </Button>
            <CopyButton value={values.join("\n")} label={copy.copyAll} />
          </div>
        </div>
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface-muted/50">
          {values.map((value, i) => {
            const created = options.type === "uuid7" ? uuidV7Timestamp(value) : null;
            return (
              <li key={`${i}-${value}`} className="group flex items-center gap-3 px-3.5 py-2">
                <span className="w-5 shrink-0 text-right font-mono text-[11px] text-muted/70 tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[13px] break-all">{value}</span>
                  {created && (
                    <span className="block text-[11px] text-muted">
                      {format(copy.created, { time: formatDateTime(created.getTime(), lang) })}
                    </span>
                  )}
                </span>
                <CopyButton value={value} label="" className="opacity-60 group-hover:opacity-100" />
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
