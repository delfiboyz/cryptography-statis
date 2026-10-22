"use client";

import { createContext, use, useCallback, useMemo, useRef, useState } from "react";

import { Icon } from "./icons";

type Variant = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  variant: Variant;
}

const ToastContext = createContext<((message: string, variant?: Variant) => void) | null>(null);

const VARIANT_ICON = { success: "checkCircle", error: "xCircle", info: "info" } as const;
const VARIANT_COLOR = {
  success: "text-emerald-500",
  error: "text-rose-500",
  info: "text-sky-500",
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, variant: Variant = "success") => {
    const id = nextId.current++;
    // Keep at most three on screen; the newest replaces the oldest.
    setToasts((current) => [...current.slice(-2), { id, message, variant }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 2600);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="animate-toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm font-medium shadow-lg shadow-black/5 dark:shadow-black/40"
          >
            <Icon name={VARIANT_ICON[toast.variant]} className={`size-4 ${VARIANT_COLOR[toast.variant]}`} />
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const ctx = use(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
