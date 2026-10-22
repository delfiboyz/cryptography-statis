// Classical (pre-computer) ciphers. They are included for learning only: every
// one of them can be broken by hand, as `crackCaesar` demonstrates.

function shiftLetter(char: string, shift: number): string {
  const code = char.charCodeAt(0);
  const base = code >= 65 && code <= 90 ? 65 : code >= 97 && code <= 122 ? 97 : -1;
  if (base === -1) return char;
  return String.fromCharCode(((((code - base + shift) % 26) + 26) % 26) + base);
}

export function caesar(text: string, shift: number): string {
  return text.replace(/[a-z]/gi, (c) => shiftLetter(c, shift));
}

export function rot13(text: string): string {
  return caesar(text, 13);
}

export function atbash(text: string): string {
  return text.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(25 - (c.charCodeAt(0) - base) + base);
  });
}

/** Non-letters pass through and do not consume key letters. */
export function vigenere(text: string, key: string, decrypt = false): string {
  const shifts = [...key.toLowerCase().replace(/[^a-z]/g, "")].map((c) => c.charCodeAt(0) - 97);
  if (shifts.length === 0) return text;
  let i = 0;
  return text.replace(/[a-z]/gi, (c) => {
    const shift = shifts[i++ % shifts.length];
    return shiftLetter(c, decrypt ? -shift : shift);
  });
}

// Relative letter frequencies (%) of English text, a-z.
const ENGLISH = [
  8.17, 1.49, 2.78, 4.25, 12.7, 2.23, 2.02, 6.09, 6.97, 0.15, 0.77, 4.03, 2.41, 6.75, 7.51, 1.93, 0.1, 5.99, 6.33, 9.06,
  2.76, 0.98, 2.36, 0.15, 1.97, 0.07,
];
// Relative letter frequencies (%) of Indonesian text, a-z.
const INDONESIAN = [
  19.0, 2.6, 0.7, 4.0, 8.6, 0.2, 3.6, 2.3, 8.0, 0.8, 4.0, 3.7, 3.6, 9.2, 2.9, 2.6, 0.0, 4.0, 4.0, 5.3, 4.9, 0.2, 0.5,
  0.0, 1.6, 0.1,
];

/** Pearson chi-squared distance between the text's letters and a reference distribution (lower = more alike). */
function chiSquared(text: string, reference: number[]): number {
  const counts = new Array(26).fill(0);
  let total = 0;
  for (const c of text.toLowerCase()) {
    const i = c.charCodeAt(0) - 97;
    if (i >= 0 && i < 26) {
      counts[i]++;
      total++;
    }
  }
  if (total === 0) return Infinity;
  return counts.reduce((sum, observed, i) => {
    const expected = Math.max((reference[i] / 100) * total, 0.01);
    return sum + (observed - expected) ** 2 / expected;
  }, 0);
}

export interface CaesarCandidate {
  shift: number;
  text: string;
  score: number;
}

/** Tries all 25 shifts and ranks them by how much they look like English or Indonesian. */
export function crackCaesar(ciphertext: string): CaesarCandidate[] {
  return Array.from({ length: 25 }, (_, i) => {
    const shift = i + 1;
    const text = caesar(ciphertext, -shift);
    return { shift, text, score: Math.min(chiSquared(text, ENGLISH), chiSquared(text, INDONESIAN)) };
  }).sort((a, b) => a.score - b.score);
}
