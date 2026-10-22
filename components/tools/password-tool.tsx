"use client";

import { useState } from "react";

import { cn } from "@/lib/browser";
import { analyzePassword, CHARSETS, type CharsetName, generatePassword, type PasswordOptions } from "@/lib/crypto/password";
import { formatDuration } from "@/lib/format";
import { format } from "@/lib/i18n/config";

import { ClientOnly } from "../client-only";
import { useI18n } from "../i18n-provider";
import { Icon } from "../icons";
import { Alert, Button, Card, CopyButton, Field, PasswordInput, Segmented, Toggle } from "../ui";

const STRENGTH_COLORS = ["bg-rose-500", "bg-orange-500", "bg-amber-400", "bg-emerald-500", "bg-emerald-600"];
const STRENGTH_TEXT = [
  "text-rose-600 dark:text-rose-400",
  "text-orange-600 dark:text-orange-400",
  "text-amber-600 dark:text-amber-300",
  "text-emerald-600 dark:text-emerald-400",
  "text-emerald-700 dark:text-emerald-300",
];

const DEFAULT_OPTIONS: PasswordOptions = {
  length: 20,
  sets: { lower: true, upper: true, digits: true, symbols: true },
  excludeAmbiguous: false,
};

export function PasswordTool() {
  const { t } = useI18n();
  const copy = t.tools.password;
  const [tab, setTab] = useState<"generate" | "check">("generate");

  return (
    <div className="flex flex-col gap-5">
      <Segmented
        label={copy.name}
        value={tab}
        onChange={setTab}
        options={[
          { value: "generate", label: copy.tabs.generate, icon: "sparkles" },
          { value: "check", label: copy.tabs.check, icon: "shield" },
        ]}
        className="self-start"
      />
      {tab === "generate" ? (
        // Generated on the client only: the server must never produce or see a password.
        <ClientOnly fallback={<Card className="h-80 animate-pulse" />}>
          <Generator />
        </ClientOnly>
      ) : (
        <Checker />
      )}
    </div>
  );
}

function Generator() {
  const { t } = useI18n();
  const copy = t.tools.password;
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [password, setPassword] = useState(() => generatePassword(DEFAULT_OPTIONS));
  const noSets = !Object.values(options.sets).some(Boolean);

  function update(next: PasswordOptions) {
    setOptions(next);
    if (Object.values(next.sets).some(Boolean)) setPassword(generatePassword(next));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Card className="flex flex-col gap-5">
        <div className="rounded-xl border border-border bg-surface-muted/60 p-4">
          <p className="min-h-14 font-mono text-xl leading-relaxed break-all select-all sm:text-2xl" aria-live="polite">
            {password}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <StrengthMeter password={password} compact />
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" icon="refresh" onClick={() => update(options)} disabled={noSets}>
                {t.common.regenerate}
              </Button>
              <CopyButton value={password} />
            </div>
          </div>
        </div>
        <Field
          label={copy.length}
          htmlFor="pw-length"
          aside={<span className="font-mono text-sm font-semibold tabular-nums">{options.length}</span>}
        >
          <input
            id="pw-length"
            type="range"
            min={6}
            max={64}
            value={options.length}
            onChange={(e) => update({ ...options, length: Number(e.target.value) })}
            className="w-full"
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-2">
        {(Object.keys(CHARSETS) as CharsetName[]).map((set) => (
          <Toggle
            key={set}
            checked={options.sets[set]}
            onChange={(checked) => update({ ...options, sets: { ...options.sets, [set]: checked } })}
          >
            {copy.sets[set]}
          </Toggle>
        ))}
        <div className="my-2 border-t border-border" />
        <Toggle checked={options.excludeAmbiguous} onChange={(checked) => update({ ...options, excludeAmbiguous: checked })}>
          {copy.excludeAmbiguous}
        </Toggle>
        {noSets && <Alert variant="warning" className="mt-2">{copy.needSet}</Alert>}
      </Card>
    </div>
  );
}

function StrengthMeter({ password, compact }: { password: string; compact?: boolean }) {
  const { t } = useI18n();
  const copy = t.tools.password;
  const analysis = analyzePassword(password);
  const active = password.length > 0;
  return (
    <div className={cn("flex items-center gap-3", !compact && "w-full")}>
      <div className={cn("flex gap-1", compact ? "w-28" : "flex-1")} aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              active && i <= analysis.score ? STRENGTH_COLORS[analysis.score] : "bg-border",
            )}
          />
        ))}
      </div>
      {active && (
        <span className="text-xs whitespace-nowrap">
          <span className={cn("font-semibold", STRENGTH_TEXT[analysis.score])}>{copy.strength[analysis.score]}</span>
          <span className="text-muted"> · {format(copy.entropy, { bits: Math.round(analysis.entropy) })}</span>
        </span>
      )}
    </div>
  );
}

function Checker() {
  const { lang, t } = useI18n();
  const copy = t.tools.password;
  const [password, setPassword] = useState("");
  const analysis = analyzePassword(password);

  const duration = (seconds: number) => {
    const value = formatDuration(seconds, lang);
    return value === "instant" ? copy.instant : value === "forever" ? copy.forever : value;
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="flex flex-col gap-4">
        <Field label={t.common.password} htmlFor="pw-check">
          <PasswordInput
            id="pw-check"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={copy.checkPlaceholder}
            className="h-12 text-base"
          />
        </Field>
        <StrengthMeter password={password} />
        {password && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              { label: copy.crackOffline, value: duration(analysis.offlineSeconds), icon: "cpu" as const },
              { label: copy.crackOnline, value: duration(analysis.onlineSeconds), icon: "globe" as const },
            ].map((row) => (
              <div key={row.label} className="rounded-xl border border-border bg-surface-muted/50 p-3.5">
                <dt className="flex items-center gap-1.5 text-xs text-muted">
                  <Icon name={row.icon} className="size-3.5" />
                  {row.label}
                </dt>
                <dd className="mt-1 font-semibold">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="text-xs leading-relaxed text-muted">{copy.estimateNote}</p>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">{copy.warningsTitle}</h2>
        {!password ? (
          <p className="text-sm text-muted">{copy.checkPlaceholder}</p>
        ) : analysis.warnings.length === 0 ? (
          <Alert variant="success">{copy.noWarnings}</Alert>
        ) : (
          <ul className="flex flex-col gap-2">
            {analysis.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2.5 text-sm">
                <Icon name="alert" className="mt-0.5 size-4 shrink-0 text-amber-500" />
                {copy.warnings[warning]}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
