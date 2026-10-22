import { type NextRequest, NextResponse } from "next/server";

import { defaultLocale, hasLocale, type Locale, LOCALE_COOKIE } from "@/lib/i18n/config";

/** Explicit choice (cookie) first, then the browser's Accept-Language ranking. */
function preferredLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (saved && hasLocale(saved)) return saved;

  const ranked = (request.headers.get("accept-language") ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { base: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((entry) => entry.base && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { base } of ranked) {
    if (hasLocale(base)) return base;
    // Malay is close enough that Indonesian is the better fallback.
    if (base === "ms") return "id";
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (hasLocale(pathname.split("/")[1] ?? "")) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals and anything that looks like a file (icon.svg, manifest.webmanifest, …).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
