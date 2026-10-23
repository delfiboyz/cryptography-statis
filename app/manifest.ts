import type { MetadataRoute } from "next";

import id from "@/lib/i18n/dictionaries/id";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: id.meta.title,
    short_name: id.meta.appName,
    description: id.meta.description,
    // Relative to the manifest, so it works under a GitHub Pages base path.
    start_url: "./",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#059669",
    icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
