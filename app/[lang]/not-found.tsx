"use client";

import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";

export default function NotFound() {
  const { lang, t } = useI18n();
  return (
    <div className="animate-fade-up flex flex-col items-center py-20 text-center">
      <span className="font-mono text-sm text-accent">404</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t.notFound.title}</h1>
      <p className="mt-3 max-w-md text-muted">{t.notFound.body}</p>
      <Link
        href={`/${lang}`}
        className="mt-8 inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent-hover"
      >
        <Icon name="home" className="size-4" />
        {t.notFound.back}
      </Link>
    </div>
  );
}
