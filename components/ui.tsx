"use client";

import { useId, useRef, useState } from "react";

import { cn, copyText } from "@/lib/browser";
import { formatBytes } from "@/lib/crypto/encoding";
import { format } from "@/lib/i18n/config";

import { useI18n } from "./i18n-provider";
import { Icon, type IconName } from "./icons";
import { useToast } from "./toast";

type ButtonVariant = "primary" | "secondary" | "ghost";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg shadow-sm shadow-emerald-900/10 hover:bg-accent-hover",
  secondary: "border border-border bg-surface hover:border-border-strong hover:bg-surface-muted",
  ghost: "text-muted hover:bg-surface-muted hover:text-fg",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  loading,
  className,
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: IconName;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-10 px-4 text-sm",
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : icon && <Icon name={icon} className={size === "sm" ? "size-3.5" : "size-4"} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className,
  ...props
}: React.ComponentProps<"button"> & { icon: IconName; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <Icon name={icon} className="size-[18px]" />
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}

export function Card({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-black/[0.02] sm:p-5", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex min-h-8 flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-semibold">{children}</h2>
      {aside}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  aside,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex min-h-6 items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs font-medium tracking-wide text-muted uppercase">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

const CONTROL =
  "w-full rounded-lg border border-border bg-surface-muted/60 px-3 text-sm text-fg placeholder:text-muted/70 transition-colors hover:border-border-strong focus:border-accent focus:bg-surface focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-accent/15";

export function TextArea({ className, mono, ...props }: React.ComponentProps<"textarea"> & { mono?: boolean }) {
  return (
    <textarea
      spellCheck={false}
      className={cn(CONTROL, "min-h-28 resize-y py-2.5 leading-relaxed", mono && "font-mono text-[13px] break-all", className)}
      {...props}
    />
  );
}

export function Input({ className, mono, ...props }: React.ComponentProps<"input"> & { mono?: boolean }) {
  return <input className={cn(CONTROL, "h-10", mono && "font-mono text-[13px]", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(CONTROL, "h-10 cursor-pointer appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <Icon
        name="chevronRight"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 rotate-90 text-muted"
      />
    </div>
  );
}

export function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
        className={cn("pr-11", className)}
        {...props}
      />
      <IconButton
        icon={visible ? "eyeOff" : "eye"}
        label={visible ? t.common.hide : t.common.show}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-0.5 right-0.5"
      />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: React.ReactNode; icon?: IconName }[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-surface-muted/60 p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-all",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
              active ? "bg-surface text-fg shadow-sm ring-1 ring-border" : "text-muted hover:text-fg",
            )}
          >
            {option.icon && <Icon name={option.icon} className="size-3.5" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg py-1 text-sm select-none">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className="relative h-5 w-9 shrink-0 rounded-full bg-border-strong transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
      />
      {children}
    </label>
  );
}

const ALERT_STYLES = {
  success: { icon: "checkCircle", className: "border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300" },
  error: { icon: "xCircle", className: "border-rose-500/30 bg-rose-500/8 text-rose-700 dark:text-rose-300" },
  warning: { icon: "alert", className: "border-amber-500/30 bg-amber-500/8 text-amber-800 dark:text-amber-300" },
  info: { icon: "info", className: "border-sky-500/30 bg-sky-500/8 text-sky-800 dark:text-sky-300" },
} as const;

export function Alert({
  variant,
  children,
  className,
}: {
  variant: keyof typeof ALERT_STYLES;
  children: React.ReactNode;
  className?: string;
}) {
  const style = ALERT_STYLES[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("animate-pop-in flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm", style.className, className)}
    >
      <Icon name={style.icon} className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warning" | "accent" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset",
        tone === "neutral" && "bg-surface-muted text-muted ring-border",
        tone === "warning" && "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
        tone === "accent" && "bg-accent/10 text-accent ring-accent/25",
      )}
    >
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface px-1 font-sans text-[11px] font-medium text-muted">
      {children}
    </kbd>
  );
}

export function CopyButton({ value, label, className }: { value: string; label?: string; className?: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function onCopy() {
    if (await copyText(value)) {
      setCopied(true);
      toast(t.common.copiedToast);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } else {
      toast(t.common.copyFailed, "error");
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      icon={copied ? "check" : "copy"}
      onClick={onCopy}
      disabled={!value}
      className={className}
      // An empty label renders an icon-only button that still needs an accessible name.
      aria-label={label === "" ? t.common.copy : undefined}
      title={label === "" ? t.common.copy : undefined}
    >
      {label ?? (copied ? t.common.copied : t.common.copy)}
    </Button>
  );
}

/** Read-only, copyable result. */
export function Output({
  label,
  value,
  placeholder,
  aside,
  className,
  mono = true,
}: {
  label: React.ReactNode;
  value: string;
  placeholder?: string;
  aside?: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <Field
      label={label}
      aside={
        <div className="flex items-center gap-1">
          {aside}
          <CopyButton value={value} />
        </div>
      }
      className={className}
    >
      <div
        className={cn(
          "min-h-10 rounded-lg border border-border bg-surface-muted/60 px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          mono && "font-mono text-[13px] break-all",
          !value && "text-muted/70",
        )}
      >
        {value || placeholder}
      </div>
    </Field>
  );
}

export function TextStats({ text }: { text: string }) {
  const { t } = useI18n();
  const bytes = new TextEncoder().encode(text).length;
  return (
    <span className="text-[11px] text-muted tabular-nums">
      {format(t.common.chars, { count: [...text].length })} · {format(t.common.bytes, { count: bytes })}
    </span>
  );
}

export function FileDrop({
  file,
  onFile,
  title,
  accept,
}: {
  file: File | null;
  onFile: (file: File) => void;
  title?: string;
  accept?: string;
}) {
  const { t } = useI18n();
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) onFile(dropped);
      }}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
        dragging ? "border-accent bg-accent/5" : "border-border hover:border-border-strong hover:bg-surface-muted/50",
      )}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) onFile(picked);
          e.target.value = "";
        }}
      />
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-2xl bg-surface-muted ring-1 ring-border transition-transform group-hover:-translate-y-0.5",
          dragging && "text-accent",
        )}
      >
        <Icon name={file ? "fileLock" : "upload"} className="size-5" />
      </span>
      {file ? (
        <span className="flex flex-col gap-0.5">
          <span className="max-w-full font-medium break-all">{file.name}</span>
          <span className="text-xs text-muted">
            {formatBytes(file.size)} · {t.common.replaceFile}
          </span>
        </span>
      ) : (
        <span className="flex flex-col gap-0.5">
          {title && <span className="font-medium">{title}</span>}
          <span className="text-sm text-muted">{dragging ? t.common.dropActive : t.common.dropFile}</span>
        </span>
      )}
    </label>
  );
}
