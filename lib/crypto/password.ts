import { randomInt, shuffle } from "./random.ts";

export const CHARSETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?/~",
} as const;
export type CharsetName = keyof typeof CHARSETS;

const AMBIGUOUS = new Set("Il1O0o|`'\";:,.");

export interface PasswordOptions {
  length: number;
  sets: Record<CharsetName, boolean>;
  excludeAmbiguous: boolean;
}

export function generatePassword({ length, sets, excludeAmbiguous }: PasswordOptions): string {
  const pools = (Object.keys(CHARSETS) as CharsetName[])
    .filter((name) => sets[name])
    .map((name) => [...CHARSETS[name]].filter((c) => !excludeAmbiguous || !AMBIGUOUS.has(c)));
  if (pools.length === 0) throw new Error("Select at least one character set");
  const all = pools.flat();
  // One guaranteed character from every selected set, the rest from the union, then shuffled.
  const chars = pools.slice(0, length).map((pool) => pool[randomInt(pool.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  return shuffle(chars).join("");
}

// A short list of passwords that top every breach corpus, plus regional favourites.
const COMMON_WORDS = [
  "password", "passw0rd", "qwerty", "letmein", "welcome", "admin", "login", "master", "dragon", "monkey",
  "iloveyou", "sunshine", "princess", "football", "baseball", "shadow", "superman", "trustno1", "secret",
  "abc123", "123456", "12345678", "123123", "111111", "000000", "654321", "qwertyuiop", "asdfgh", "zxcvbn",
  "sayang", "rahasia", "indonesia", "bismillah", "cinta", "katasandi", "jakarta", "bandung", "garuda", "merdeka",
].sort((a, b) => b.length - a.length);

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890", "abcdefghijklmnopqrstuvwxyz"];

export type PasswordWarning =
  | "tooShort"
  | "noLower"
  | "noUpper"
  | "noDigits"
  | "noSymbols"
  | "common"
  | "repeats"
  | "sequence";

export interface PasswordAnalysis {
  /** Estimated entropy in bits after pattern penalties. */
  entropy: number;
  /** 0 (very weak) .. 4 (very strong). */
  score: 0 | 1 | 2 | 3 | 4;
  poolSize: number;
  /** Average seconds to crack offline at 10 billion guesses per second. */
  offlineSeconds: number;
  /** Average seconds to crack against a rate-limited login (100 guesses per hour). */
  onlineSeconds: number;
  warnings: PasswordWarning[];
}

export function analyzePassword(password: string): PasswordAnalysis {
  const chars = [...password];
  const has = {
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digits: /[0-9]/.test(password),
    symbols: /[^a-zA-Z0-9]/.test(password),
  };
  const nonAscii = /[^\x00-\x7f]/.test(password);
  const poolSize =
    (has.lower ? 26 : 0) + (has.upper ? 26 : 0) + (has.digits ? 10 : 0) + (has.symbols ? 33 : 0) + (nonAscii ? 100 : 0);

  const warnings = new Set<PasswordWarning>();
  const predictable = new Array<boolean>(chars.length).fill(false);
  // One UTF-16 unit per code point so string indices line up with `chars`.
  const lower = chars
    .map((c) => {
      const l = c.toLowerCase();
      return l.length === 1 ? l : "\0";
    })
    .join("");
  let patternBits = 0;

  for (const word of COMMON_WORDS) {
    let from = lower.indexOf(word);
    while (from !== -1) {
      if (!predictable[from]) {
        for (let i = from; i < from + word.length; i++) predictable[i] = true;
        patternBits += Math.log2(COMMON_WORDS.length) + 1;
        warnings.add("common");
      }
      from = lower.indexOf(word, from + 1);
    }
  }

  for (const row of KEYBOARD_ROWS) {
    for (let len = row.length; len >= 4; len--) {
      for (let start = 0; start + len <= row.length; start++) {
        const run = row.slice(start, start + len);
        for (const candidate of [run, [...run].reverse().join("")]) {
          let at = lower.indexOf(candidate);
          while (at !== -1) {
            for (let i = at; i < at + len; i++) {
              if (!predictable[i]) warnings.add("sequence");
              predictable[i] = true;
            }
            at = lower.indexOf(candidate, at + 1);
          }
        }
      }
    }
  }

  for (let i = 1; i < chars.length; i++) {
    if (chars[i] === chars[i - 1]) {
      predictable[i] = true;
      warnings.add("repeats");
    } else if (i >= 2) {
      const d1 = chars[i].codePointAt(0)! - chars[i - 1].codePointAt(0)!;
      const d2 = chars[i - 1].codePointAt(0)! - chars[i - 2].codePointAt(0)!;
      if (Math.abs(d1) === 1 && d1 === d2) {
        predictable[i] = true;
        warnings.add("sequence");
      }
    }
  }

  const perChar = poolSize > 0 ? Math.log2(poolSize) : 0;
  const randomChars = predictable.filter((p) => !p).length;
  const predictableChars = chars.length - randomChars;
  const entropy = chars.length === 0 ? 0 : randomChars * perChar + predictableChars + patternBits;

  if (chars.length < 12) warnings.add("tooShort");
  if (!has.lower) warnings.add("noLower");
  if (!has.upper) warnings.add("noUpper");
  if (!has.digits) warnings.add("noDigits");
  if (!has.symbols) warnings.add("noSymbols");

  const score = entropy < 28 ? 0 : entropy < 40 ? 1 : entropy < 60 ? 2 : entropy < 80 ? 3 : 4;
  const averageGuesses = entropy > 0 ? 2 ** (entropy - 1) : 0;
  return {
    entropy,
    score,
    poolSize,
    offlineSeconds: averageGuesses / 1e10,
    onlineSeconds: averageGuesses / (100 / 3600),
    warnings: [...warnings],
  };
}
