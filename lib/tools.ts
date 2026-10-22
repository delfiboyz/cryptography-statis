import type { IconName } from "@/components/icons";

export const CATEGORIES = ["hashing", "encryption", "publicKey", "utilities", "learn"] as const;
export type Category = (typeof CATEGORIES)[number];

export const TOOLS = [
  { slug: "hash", category: "hashing", icon: "fingerprint" },
  { slug: "hmac", category: "hashing", icon: "stamp" },
  { slug: "aes", category: "encryption", icon: "lock" },
  { slug: "file", category: "encryption", icon: "fileLock" },
  { slug: "keys", category: "publicKey", icon: "key" },
  { slug: "signature", category: "publicKey", icon: "pen" },
  { slug: "jwt", category: "utilities", icon: "ticket" },
  { slug: "password", category: "utilities", icon: "asterisk" },
  { slug: "random", category: "utilities", icon: "dice" },
  { slug: "encoding", category: "utilities", icon: "binary" },
  { slug: "classic", category: "learn", icon: "scroll" },
] as const satisfies readonly { slug: string; category: Category; icon: IconName }[];

export type ToolSlug = (typeof TOOLS)[number]["slug"];
export type Tool = (typeof TOOLS)[number];

export function findTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

/** Tailwind classes for the coloured icon tile of each category. */
export const CATEGORY_STYLES: Record<Category, string> = {
  hashing: "bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-300",
  encryption: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-300",
  publicKey: "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-300",
  utilities: "bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-300",
  learn: "bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-300",
};
