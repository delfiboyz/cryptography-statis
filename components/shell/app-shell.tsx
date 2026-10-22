"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, use, useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/browser";
import { type Locale, LOCALE_COOKIE, format, locales } from "@/lib/i18n/config";
import { getThemePreference, setThemePreference, THEMES } from "@/lib/theme";
import { CATEGORIES, CATEGORY_STYLES, TOOLS } from "@/lib/tools";

import { useI18n } from "../i18n-provider";
import { Icon } from "../icons";
import { IconButton, Kbd } from "../ui";
import { CommandPalette } from "./command-palette";

export function localizedPath(pathname: string, lang: Locale): string {
  return pathname.replace(/^\/[^/]+(?=\/|$)/, `/${lang}`);
}

export function rememberLocale(lang: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

const PaletteContext = createContext<() => void>(() => {});

/** Opens the command palette from anywhere inside the shell. */
export function useOpenPalette() {
  return use(PaletteContext);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const openPalette = useCallback(() => setPaletteOpen(true), []);

  // Close the mobile drawer after navigating (adjusting state during render, not in an effect).
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <PaletteContext value={openPalette}>
    <div className="relative flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-accent px-3 py-2 text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t.shell.skipToContent}
      </a>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-surface/60 backdrop-blur-xl lg:block">
        <Sidebar />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="animate-pop-in absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border bg-surface shadow-2xl">
            <IconButton
              icon="x"
              label={t.shell.closeMenu}
              onClick={() => setMenuOpen(false)}
              className="absolute top-3.5 right-3"
            />
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setMenuOpen(true)} onSearch={openPalette} />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-5xl px-4 pb-8 text-xs text-muted sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-6">
            <Icon name="shield" className="size-4 text-accent" />
            {t.shell.footer}
          </div>
        </footer>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
    </PaletteContext>
  );
}

function Logo() {
  const { lang, t } = useI18n();
  return (
    <Link href={`/${lang}`} className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-600/20">
        <Icon name="logo" className="size-[18px]" />
      </span>
      {t.meta.appName}
    </Link>
  );
}

function Sidebar() {
  const { lang, t } = useI18n();
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label={t.palette.tools}>
        <NavLink href={`/${lang}`} active={pathname === `/${lang}`} icon={<Icon name="home" className="size-4" />}>
          {t.shell.home}
        </NavLink>
        {CATEGORIES.map((category) => (
          <div key={category} className="mt-5">
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-muted/80 uppercase">
              {t.categories[category]}
            </p>
            {TOOLS.filter((tool) => tool.category === category).map((tool) => {
              const href = `/${lang}/${tool.slug}`;
              return (
                <NavLink
                  key={tool.slug}
                  href={href}
                  active={pathname === href}
                  icon={
                    <span className={cn("flex size-6 items-center justify-center rounded-md ring-1", CATEGORY_STYLES[category])}>
                      <Icon name={tool.icon} className="size-3.5" />
                    </span>
                  }
                >
                  {t.tools[tool.slug].name}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-xl border border-border bg-surface-muted/60 p-3.5">
        <p className="flex items-center gap-2 text-xs font-semibold">
          <Icon name="wifiOff" className="size-4 text-accent" />
          {t.shell.privacyTitle}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{t.shell.privacyBody}</p>
      </div>
    </div>
  );
}

function NavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
        active ? "bg-surface-muted font-medium text-fg ring-1 ring-border" : "text-muted hover:bg-surface-muted/70 hover:text-fg",
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </Link>
  );
}

function Header({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4 sm:px-6 lg:px-10">
        <IconButton icon="menu" label={t.shell.openMenu} onClick={onMenu} className="-ml-1.5 lg:hidden" />
        <div className="mr-1 lg:hidden">
          <Logo />
        </div>
        <button
          type="button"
          onClick={onSearch}
          className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-border bg-surface/80 px-3 text-sm text-muted transition-colors hover:border-border-strong hover:text-fg sm:w-72 lg:ml-0"
        >
          <Icon name="search" className="size-4" />
          <span className="hidden sm:inline">{t.shell.search}</span>
          <span className="ml-auto hidden items-center gap-0.5 sm:flex">
            <Kbd>
              <span className="kbd-apple">⌘</span>
              <span className="kbd-other">Ctrl</span>
            </Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <div className="flex items-center gap-1 lg:ml-auto">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function LanguageSwitch() {
  const { lang, t } = useI18n();
  const pathname = usePathname();
  return (
    <div role="group" aria-label={t.shell.language} className="flex items-center rounded-lg p-0.5 text-xs font-semibold">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={localizedPath(pathname, locale)}
          hrefLang={locale}
          lang={locale}
          onClick={() => rememberLocale(locale)}
          aria-current={locale === lang ? "true" : undefined}
          className={cn(
            "rounded-md px-2 py-1.5 uppercase transition-colors",
            locale === lang ? "bg-surface-muted text-fg ring-1 ring-border" : "text-muted hover:text-fg",
          )}
        >
          {locale}
        </Link>
      ))}
    </div>
  );
}

function ThemeToggle() {
  const { t } = useI18n();
  const icons = { system: "monitor", light: "sun", dark: "moon" } as const;

  function cycle() {
    const current = getThemePreference();
    setThemePreference(THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-fg"
    >
      {/* Only the icon for the stored preference is displayed (see globals.css), so the
          accessible name always describes the current state without a hydration mismatch. */}
      {THEMES.map((theme) => (
        <span key={theme} data-theme-icon={theme}>
          <Icon name={icons[theme]} className="size-[18px]" />
          <span className="sr-only">{format(t.shell.themeToggle, { theme: t.shell.themes[theme] })}</span>
        </span>
      ))}
    </button>
  );
}
