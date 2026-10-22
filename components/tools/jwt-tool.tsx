"use client";

import { useEffect, useMemo, useState } from "react";

import { cn, errorMessage } from "@/lib/browser";
import { fromBase64, utf8Encode } from "@/lib/crypto/encoding";
import {
  type DecodedJwt,
  decodeJwt,
  HMAC_JWT_ALGORITHMS,
  type HmacJwtAlgorithm,
  isSupportedJwtAlgorithm,
  JwtError,
  jwtKeyFamily,
  signJwtHmac,
  verifyJwt,
} from "@/lib/crypto/jwt";
import { PemError } from "@/lib/crypto/keys";
import { formatDateTime, relativeTime } from "@/lib/format";
import { format } from "@/lib/i18n/config";

import { useI18n } from "../i18n-provider";
import { Icon } from "../icons";
import { JsonView } from "../json-view";
import { Alert, Badge, Button, Card, CopyButton, Field, Input, PasswordInput, Segmented, Select, TextArea, Toggle } from "../ui";

const EXPIRY_SECONDS = { none: 0, "15m": 900, "1h": 3600, "1d": 86_400, "7d": 604_800 } as const;
type Expiry = keyof typeof EXPIRY_SECONDS;

const PART_COLORS = ["text-rose-600 dark:text-rose-400", "text-violet-600 dark:text-violet-400", "text-sky-600 dark:text-sky-400"];

/** The token with header, payload and signature coloured like the panels below it. */
function ColoredToken({ token }: { token: string }) {
  return (
    <p className="font-mono text-[13px] leading-relaxed break-all">
      {token
        .trim()
        .split(".")
        .map((part, i, all) => (
          <span key={i}>
            <span className={PART_COLORS[i] ?? "text-muted"}>{part}</span>
            {i < all.length - 1 && <span className="text-muted">.</span>}
          </span>
        ))}
    </p>
  );
}

export function JwtTool() {
  const { t } = useI18n();
  const copy = t.tools.jwt;
  const [tab, setTab] = useState<"decode" | "create">("decode");
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");

  async function loadExample() {
    const now = Math.floor(Date.now() / 1000);
    const example = { sub: "1234567890", name: "Budi Santoso", role: "admin", iat: now, exp: now + 3600 };
    setSecret("your-256-bit-secret");
    setToken(await signJwtHmac("HS256", example, "your-256-bit-secret"));
  }

  return (
    <div className="flex flex-col gap-5">
      <Segmented
        label={copy.name}
        value={tab}
        onChange={setTab}
        options={[
          { value: "decode", label: copy.tabs.decode, icon: "search" },
          { value: "create", label: copy.tabs.create, icon: "pen" },
        ]}
        className="self-start"
      />
      {tab === "decode" ? (
        <Decoder token={token} setToken={setToken} secret={secret} setSecret={setSecret} onExample={loadExample} />
      ) : (
        <Creator
          secret={secret}
          setSecret={setSecret}
          onOpen={(created) => {
            setToken(created);
            setTab("decode");
          }}
        />
      )}
    </div>
  );
}

function Decoder({
  token,
  setToken,
  secret,
  setSecret,
  onExample,
}: {
  token: string;
  setToken: (value: string) => void;
  secret: string;
  setSecret: (value: string) => void;
  onExample: () => void;
}) {
  const { lang, t } = useI18n();
  const copy = t.tools.jwt;
  const [secretIsBase64, setSecretIsBase64] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [verification, setVerification] = useState<{ inputs: string; ok: boolean | null; error?: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Tick every second so relative times ("2 seconds ago") stay right for freshly created tokens.
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const parsed = useMemo<{ decoded: DecodedJwt | null; error: string | null }>(() => {
    if (!token.trim()) return { decoded: null, error: null };
    try {
      return { decoded: decodeJwt(token), error: null };
    } catch (e) {
      return { decoded: null, error: e instanceof JwtError ? copy.errors[e.code] : errorMessage(e) };
    }
  }, [token, copy.errors]);

  const decoded = parsed.decoded;
  const alg = decoded?.header.alg;
  const supported = isSupportedJwtAlgorithm(alg) ? alg : null;
  const family = supported ? jwtKeyFamily(supported) : null;
  const keyInput = family === "hmac" ? secret : publicKey;
  const inputs = JSON.stringify([token, alg, keyInput, secretIsBase64]);

  useEffect(() => {
    if (!decoded || !supported || !keyInput) return;
    let cancelled = false;
    (async () => {
      try {
        const key = family === "hmac" && secretIsBase64 ? fromBase64(keyInput) : keyInput;
        const ok = await verifyJwt(decoded, supported, key);
        if (!cancelled) setVerification({ inputs, ok });
      } catch (e) {
        const error = e instanceof PemError ? t.tools.signature.pemErrors[e.code] : errorMessage(e);
        if (!cancelled) setVerification({ inputs, ok: null, error });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [decoded, family, inputs, keyInput, secretIsBase64, supported, t]);

  const result = keyInput && verification?.inputs === inputs ? verification : null;
  const payload = decoded && typeof decoded.payload === "object" && decoded.payload !== null ? (decoded.payload as Record<string, unknown>) : null;
  const claims = (["exp", "nbf", "iat"] as const).filter((c) => typeof payload?.[c] === "number");
  const exp = typeof payload?.exp === "number" ? payload.exp * 1000 : null;
  const nbf = typeof payload?.nbf === "number" ? payload.nbf * 1000 : null;
  const status = exp !== null && exp < now ? "expired" : nbf !== null && nbf > now ? "notYet" : exp || nbf ? "active" : null;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-4">
          <Field
            label={copy.tokenLabel}
            htmlFor="jwt-token"
            aside={
              <Button size="sm" variant="ghost" icon="sparkles" onClick={onExample}>
                {t.common.loadExample}
              </Button>
            }
          >
            <TextArea
              id="jwt-token"
              mono
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={copy.tokenPlaceholder}
              className="min-h-36"
            />
          </Field>
          {parsed.error && <Alert variant="error">{parsed.error}</Alert>}
          {decoded && (
            <div className="rounded-lg border border-border bg-surface-muted/60 px-3 py-2.5">
              <ColoredToken token={token} />
            </div>
          )}
        </Card>

        {decoded && (
          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{copy.verifyTitle}</h2>
              {typeof alg === "string" && <Badge tone="accent">{alg}</Badge>}
            </div>
            {alg === "none" ? (
              <Alert variant="error">{copy.algNone}</Alert>
            ) : !supported ? (
              <Alert variant="warning">{format(copy.unsupportedAlg, { alg: String(alg) })}</Alert>
            ) : family === "hmac" ? (
              <>
                <Field label={copy.secretLabel} htmlFor="jwt-secret">
                  <PasswordInput
                    id="jwt-secret"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder={copy.secretPlaceholder}
                  />
                </Field>
                <Toggle checked={secretIsBase64} onChange={setSecretIsBase64}>
                  <span className="text-sm text-muted">{copy.secretBase64}</span>
                </Toggle>
              </>
            ) : (
              <Field label={copy.publicKeyLabel} htmlFor="jwt-pem">
                <TextArea
                  id="jwt-pem"
                  mono
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder="-----BEGIN PUBLIC KEY-----"
                  className="min-h-28 text-xs"
                />
              </Field>
            )}
            {result &&
              (result.error ? (
                <Alert variant="error">{result.error}</Alert>
              ) : (
                <Alert variant={result.ok ? "success" : "error"}>{result.ok ? copy.verifyOk : copy.verifyFail}</Alert>
              ))}
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {decoded ? (
          <>
            <JsonCard title={copy.header} value={decoded.header} accent="before:bg-rose-500" />
            <JsonCard
              title={copy.payload}
              value={decoded.payload}
              accent="before:bg-violet-500"
              aside={
                status && (
                  <Badge tone={status === "active" ? "accent" : "warning"}>
                    {copy.status[status]}
                  </Badge>
                )
              }
            >
              {claims.length > 0 && (
                <dl className="mt-4 grid gap-2 border-t border-border pt-4 text-sm">
                  {claims.map((claim) => {
                    const ms = (payload![claim] as number) * 1000;
                    return (
                      <div key={claim} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                        <dt className="flex items-center gap-1.5 text-muted">
                          <Icon name="clock" className="size-3.5" />
                          {copy.claims[claim]} <code className="text-xs">({claim})</code>
                        </dt>
                        <dd className="text-right">
                          {formatDateTime(ms, lang)}{" "}
                          <span className={cn("text-muted", claim === "exp" && ms < now && "text-rose-500")}>
                            · {relativeTime(ms, now, lang)}
                          </span>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </JsonCard>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted">
            <Icon name="ticket" className="size-7" />
            {copy.tokenPlaceholder}
          </div>
        )}
      </div>
    </div>
  );
}

function JsonCard({
  title,
  value,
  accent,
  aside,
  children,
}: {
  title: string;
  value: unknown;
  accent: string;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <Card className={cn("relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1", accent)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-1">
          {aside}
          <CopyButton value={text} />
        </div>
      </div>
      <JsonView value={value} />
      {children}
    </Card>
  );
}

function Creator({
  secret,
  setSecret,
  onOpen,
}: {
  secret: string;
  setSecret: (value: string) => void;
  onOpen: (token: string) => void;
}) {
  const { t } = useI18n();
  const copy = t.tools.jwt;
  const [alg, setAlg] = useState<HmacJwtAlgorithm>("HS256");
  const [payloadText, setPayloadText] = useState('{\n  "sub": "1234567890",\n  "name": "Budi Santoso",\n  "role": "admin"\n}');
  const [expiry, setExpiry] = useState<Expiry>("1h");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    let payload: unknown;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      setToken("");
      return setError(format(copy.invalidJson, { message: errorMessage(e) }));
    }
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const now = Math.floor(Date.now() / 1000);
      payload = {
        iat: now,
        ...payload,
        ...(EXPIRY_SECONDS[expiry] ? { exp: now + EXPIRY_SECONDS[expiry] } : {}),
      };
    }
    setToken(await signJwtHmac(alg, payload, utf8Encode(secret)));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.common.algorithm} htmlFor="jwt-alg">
            <Select id="jwt-alg" value={alg} onChange={(e) => setAlg(e.target.value as HmacJwtAlgorithm)}>
              {HMAC_JWT_ALGORITHMS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          </Field>
          <Field label={copy.expiresIn} htmlFor="jwt-exp">
            <Select id="jwt-exp" value={expiry} onChange={(e) => setExpiry(e.target.value as Expiry)}>
              {(Object.keys(EXPIRY_SECONDS) as Expiry[]).map((option) => (
                <option key={option} value={option}>
                  {copy.expiryOptions[option]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={copy.payloadLabel} htmlFor="jwt-payload">
          <TextArea
            id="jwt-payload"
            mono
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            className="min-h-40"
          />
        </Field>
        <Field label={copy.secretLabel} htmlFor="jwt-create-secret">
          <Input
            id="jwt-create-secret"
            mono
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={copy.secretPlaceholder}
            autoComplete="off"
          />
        </Field>
        <Button variant="primary" icon="pen" onClick={create} className="self-start">
          {copy.createButton}
        </Button>
        {error && <Alert variant="error">{error}</Alert>}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{copy.tokenLabel}</h2>
          <CopyButton value={token} />
        </div>
        {token ? (
          <>
            <div className="rounded-lg border border-border bg-surface-muted/60 px-3 py-2.5">
              <ColoredToken token={token} />
            </div>
            <Button icon="arrowRight" onClick={() => onOpen(token)} className="self-start">
              {copy.sendToDecoder}
            </Button>
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted">{copy.tabs.create}</p>
        )}
      </Card>
    </div>
  );
}
