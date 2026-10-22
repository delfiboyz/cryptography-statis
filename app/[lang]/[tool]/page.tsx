import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/icons";
import { TOOL_COMPONENTS } from "@/components/tools";
import { cn } from "@/lib/browser";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { CATEGORY_STYLES, findTool, TOOLS } from "@/lib/tools";

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ tool: tool.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[tool]">): Promise<Metadata> {
  const { lang, tool: slug } = await params;
  const tool = findTool(slug);
  if (!tool || !hasLocale(lang)) return {};
  const t = await getDictionary(lang);
  return { title: t.tools[tool.slug].name, description: t.tools[tool.slug].description };
}

export default async function ToolPage({ params }: PageProps<"/[lang]/[tool]">) {
  const { lang, tool: slug } = await params;
  const tool = findTool(slug);
  if (!tool || !hasLocale(lang)) notFound();
  const t = await getDictionary(lang);
  const copy = t.tools[tool.slug];
  const ToolComponent = TOOL_COMPONENTS[tool.slug];

  return (
    <div className="animate-fade-up">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-muted">
        <Link href={`/${lang}`} className="hover:text-fg">
          {t.shell.home}
        </Link>
        <Icon name="chevronRight" className="size-3" />
        <span>{t.categories[tool.category]}</span>
      </nav>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1", CATEGORY_STYLES[tool.category])}
        >
          <Icon name={tool.icon} className="size-6" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{copy.name}</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent ring-1 ring-accent/25 ring-inset">
              <Icon name="shield" className="size-3" />
              {t.common.localOnly}
            </span>
          </div>
          <p className="mt-2 max-w-3xl leading-relaxed text-pretty text-muted">{copy.description}</p>
        </div>
      </header>
      <ToolComponent />
    </div>
  );
}
