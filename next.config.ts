import type { NextConfig } from "next";

// Static export for GitHub Pages. Project sites live under /<repo>, which the
// deploy workflow passes in as PAGES_BASE_PATH (empty for local builds).
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // Emit /id/hash/index.html so every URL resolves on a plain static host.
  trailingSlash: true,
  poweredByHeader: false,
  // Pin the root: a stray lockfile in a parent directory would otherwise be picked up.
  turbopack: { root: __dirname },
};

export default nextConfig;
