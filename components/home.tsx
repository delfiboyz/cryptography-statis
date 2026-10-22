"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/browser";
import { format } from "@/lib/i18n/config";
import { CATEGORIES, CATEGORY_STYLES, TOOLS } from "@/lib/tools";

import { useI18n } from "./i18n-provider";
import { Icon } from "./icons";
import { useOpenPalette } from "./shell/app-shell";
import { Button, Kbd } from "./ui";

export function SearchCta() {
  const { t } = useI18n();
  const openPalette = useOpenPalette();
  return (
    <Button onClick={openPalette} icon="search" className="h-11 px-5">
      {t.home.secondaryCta}
      <span className="ml-1 hidden items-center gap-0.5 sm:flex">
        <Kbd>
          <span className="kbd-apple">⌘</span>
          <span className="kbd-other">Ctrl</span>
        </Kbd>
        <Kbd>K</Kbd>
      </span>
    </Button>
  );
}

export function ToolGrid() {
  const { lang, t } = useI18n();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = (slug: (typeof TOOLS)[number]["slug"]) =>
    !q || `${slug} ${t.tools[slug].name} ${t.tools[slug].summary}`.toLowerCase().includes(q);
  const visible = TOOLS.filter((tool) => matches(tool.slug));

  return (
    <section aria-labelledby="all-tools">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 id="all-tools" className="text-lg font-semibold tracking-tight">
          {t.home.allTools}
        </h2>
        <div className="relative w-full sm:w-64">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.home.filter}
            aria-label={t.home.filter}
            className="h-9 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm placeholder:text-muted/70 focus:border-accent focus:ring-3 focus:ring-accent/15 focus:outline-none focus-visible:outline-none"
          />
        </div>
      </div>

      {visible.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted">
          {format(t.home.noTools, { query: query.trim() })}
        </p>
      )}

      <div className="flex flex-col gap-8">
        {CATEGORIES.map((category) => {
          const tools = visible.filter((tool) => tool.category === category);
          if (tools.length === 0) return null;
          return (
            <div key={category}>
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">{t.categories[category]}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <Link
                    key={tool.slug}
                    href={`/${lang}/${tool.slug}`}
                    className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("flex size-10 items-center justify-center rounded-xl ring-1", CATEGORY_STYLES[category])}>
                        <Icon name={tool.icon} className="size-5" />
                      </span>
                      <Icon
                        name="arrowRight"
                        className="size-4 -translate-x-1 text-muted opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{t.tools[tool.slug].name}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{t.tools[tool.slug].summary}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
