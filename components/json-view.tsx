// Lightweight JSON syntax highlighting. React escapes every token, so arbitrary
// (untrusted) token contents are safe to render.

const TOKEN = /("(?:\\.|[^"\\])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

function classFor(token: string): string {
  if (token.startsWith('"')) return token.trimEnd().endsWith(":") ? "text-sky-600 dark:text-sky-300" : "text-emerald-700 dark:text-emerald-300";
  if (token === "true" || token === "false") return "text-violet-600 dark:text-violet-300";
  if (token === "null") return "text-muted";
  return "text-amber-700 dark:text-amber-300";
}

export function JsonView({ value }: { value: unknown }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const parts = typeof value === "string" ? [text] : text.split(TOKEN);
  return (
    <pre className="overflow-x-auto font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-all">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className={classFor(part)}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </pre>
  );
}
