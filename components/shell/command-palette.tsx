"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/browser";
import { format, localeNames, locales } from "@/lib/i18n/config";
import { setThemePreference, THEMES } from "@/lib/theme";
import { CATEGORY_STYLES, TOOLS } from "@/lib/tools";

import { useI18n } from "../i18n-provider";
import { Icon, type IconName } from "../icons";
import { Kbd } from "../ui";
import { localizedPath, rememberLocale } from "./app-shell";

interface Item {
  id: string;
  group: "tools" | "actions";
  title: string;
  subtitle?: string;
  keywords: string;
  icon: IconName;
  iconClass?: string;
  run: () => void;
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function score(item: Item, query: string): number {
  if (!query) return 1;
  const title = normalize(item.title);
  if (title.startsWith(query)) return 4;
  if (title.includes(query)) return 3;
  if (normalize(item.keywords).includes(query)) return 2;
  // Subsequence match ("hsg" -> "Hash Generator") as a last resort.
  let i = 0;
  for (const c of title) if (c === query[i]) i++;
  return i === query.length ? 1 : 0;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => router.push(href);
    const tools: Item[] = TOOLS.map((tool) => ({
      id: tool.slug,
      group: "tools",
      title: t.tools[tool.slug].name,
      subtitle: t.tools[tool.slug].summary,
      keywords: `${tool.slug} ${t.categories[tool.category]} ${t.tools[tool.slug].summary}`,
      icon: tool.icon,
      iconClass: CATEGORY_STYLES[tool.category],
      run: go(`/${lang}/${tool.slug}`),
    }));
    const themeIcons = { system: "monitor", light: "sun", dark: "moon" } as const;
    const actions: Item[] = [
      { id: "home", group: "actions", title: t.palette.goHome, keywords: "home beranda", icon: "home", run: go(`/${lang}`) },
      ...locales
        .filter((l) => l !== lang)
        .map<Item>((l) => ({
          id: `lang-${l}`,
          group: "actions",
          title: format(t.palette.switchLanguage, { language: localeNames[l] }),
          keywords: "language bahasa",
          icon: "globe",
          run: () => {
            rememberLocale(l);
            router.push(localizedPath(pathname, l));
          },
        })),
      ...THEMES.map<Item>((theme) => ({
        id: `theme-${theme}`,
        group: "actions",
        title: format(t.palette.setTheme, { theme: t.shell.themes[theme] }),
        keywords: "theme tema dark light gelap terang",
        icon: themeIcons[theme],
        run: () => setThemePreference(theme),
      })),
    ];
    return [...tools, ...actions];
  }, [lang, pathname, router, t]);

  const q = normalize(query.trim());
  const results = items
    .map((item) => ({ item, score: score(item, q) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => (a.item.group === b.item.group ? b.score - a.score : a.item.group === "tools" ? -1 : 1))
    .map((r) => r.item);
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function run(item: Item) {
    onClose();
    item.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + delta + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      run(results[activeIndex]);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={t.palette.title}
      onClose={() => {
        setQuery("");
        setActive(0);
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="animate-pop-in m-0 mx-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-2xl border border-border bg-surface-raised p-0 text-fg shadow-2xl shadow-black/20"
    >
      <div className="flex items-center gap-3 border-b border-border px-4" onKeyDown={onKeyDown}>
        <Icon name="search" className="size-4 shrink-0 text-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          placeholder={t.palette.placeholder}
          aria-label={t.palette.placeholder}
          aria-controls="palette-results"
          aria-activedescendant={results[activeIndex] ? `palette-${results[activeIndex].id}` : undefined}
          role="combobox"
          aria-expanded="true"
          className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted focus-visible:outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>

      <div ref={listRef} id="palette-results" role="listbox" className="max-h-[min(24rem,55vh)] overflow-y-auto p-2">
        {results.length === 0 && (
          <p className="px-3 py-10 text-center text-sm text-muted">{format(t.palette.empty, { query: query.trim() })}</p>
        )}
        {(["tools", "actions"] as const).map((group) => {
          const groupItems = results.filter((r) => r.group === group);
          if (groupItems.length === 0) return null;
          return (
            <div key={group} role="group" aria-label={t.palette[group]} className="mb-1">
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted/80 uppercase">
                {t.palette[group]}
              </p>
              {groupItems.map((item) => {
                const index = results.indexOf(item);
                const selected = index === activeIndex;
                return (
                  <div
                    key={item.id}
                    id={`palette-${item.id}`}
                    role="option"
                    aria-selected={selected}
                    onClick={() => run(item)}
                    onMouseMove={() => !selected && setActive(index)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
                      selected && "bg-surface-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg ring-1",
                        item.iconClass ?? "bg-surface-muted text-muted ring-border",
                      )}
                    >
                      <Icon name={item.icon} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      {item.subtitle && <span className="block truncate text-xs text-muted">{item.subtitle}</span>}
                    </span>
                    {selected && <Icon name="arrowRight" className="size-4 text-muted" />}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          {t.palette.navigate}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd>
          {t.palette.open}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd>
          {t.palette.close}
        </span>
      </div>
    </dialog>
  );
}
