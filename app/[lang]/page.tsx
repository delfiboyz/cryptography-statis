import Link from "next/link";
import { notFound } from "next/navigation";

import { SearchCta, ToolGrid } from "@/components/home";
import { Icon } from "@/components/icons";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { TOOLS } from "@/lib/tools";

const FEATURE_ICONS = ["shield", "sparkles", "cpu"] as const;

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);

  const stats = [
    { value: String(TOOLS.length), label: t.home.stats.tools },
    { value: "0", label: t.home.stats.server },
    { value: "256", label: t.home.stats.aes },
  ];

  return (
    <div className="animate-fade-up flex flex-col gap-14 lg:gap-16">
      <section className="pt-4 lg:pt-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium text-muted backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          {t.home.badge}
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          {t.home.title}{" "}
          <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-violet-500 bg-clip-text text-transparent">
            {t.home.titleAccent}
          </span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-pretty text-muted sm:text-lg">{t.home.subtitle}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/${lang}/aes`}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-accent-fg shadow-sm shadow-emerald-900/10 transition-colors hover:bg-accent-hover"
          >
            <Icon name="lock" className="size-4" />
            {t.home.primaryCta}
          </Link>
          <SearchCta />
        </div>

        <dl className="mt-10 grid max-w-xl grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-surface/70 backdrop-blur">
          {stats.map((stat) => (
            <div key={stat.label} className="px-4 py-3.5 sm:px-5">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-2xl font-semibold tracking-tight tabular-nums">{stat.value}</dd>
              <dd className="mt-0.5 text-xs leading-snug text-muted">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {t.home.features.map((feature, i) => (
          <div key={feature.title} className="rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur">
            <Icon name={FEATURE_ICONS[i]} className="size-5 text-accent" />
            <h2 className="mt-3 font-medium">{feature.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.body}</p>
          </div>
        ))}
      </section>

      <ToolGrid />

      <section aria-labelledby="notes" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 id="notes" className="flex items-center gap-2 font-semibold">
          <Icon name="info" className="size-5 text-sky-500" />
          {t.home.notesTitle}
        </h2>
        <ul className="mt-4 grid gap-3 text-sm leading-relaxed text-muted sm:grid-cols-2">
          {t.home.notes.map((note) => (
            <li key={note} className="flex gap-2.5">
              <Icon name="check" className="mt-0.5 size-4 shrink-0 text-accent" />
              {note}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
