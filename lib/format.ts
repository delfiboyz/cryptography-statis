const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];

/** "in 3 hours", "2 days ago", localized. */
export function relativeTime(targetMs: number, nowMs: number, lang: string): string {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const diff = (targetMs - nowMs) / 1000;
  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= seconds || unit === "second") return rtf.format(Math.round(diff / seconds), unit);
  }
  return "";
}

const AGE_OF_UNIVERSE_SECONDS = 4.35e17;
const DURATION_UNITS: [Intl.NumberFormatOptions["unit"], number][] = [
  ["year", 31_536_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];

/**
 * Human-readable length of time ("3 hours", "1.2 million years").
 * Returns "instant" or "forever" for the extremes so callers can use their own wording.
 */
export function formatDuration(seconds: number, lang: string): string | "instant" | "forever" {
  if (seconds < 1) return "instant";
  if (seconds > AGE_OF_UNIVERSE_SECONDS) return "forever";
  const [unit, size] = DURATION_UNITS.find(([, s]) => seconds >= s)!;
  return new Intl.NumberFormat(lang, {
    style: "unit",
    unit,
    unitDisplay: "long",
    notation: seconds / size >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: seconds / size < 10 ? 1 : 0,
  }).format(seconds / size);
}

export function formatDateTime(ms: number, lang: string): string {
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "medium" }).format(ms);
}
