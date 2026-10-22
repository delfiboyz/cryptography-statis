import { notFound } from "next/navigation";

// Deeper unknown paths (e.g. /id/hash/extra) would otherwise skip the [lang] layout
// and get Next's unstyled 404; route them to the localized not-found page instead.
export default function CatchAll() {
  notFound();
}
