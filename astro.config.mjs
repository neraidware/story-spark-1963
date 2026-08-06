import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// GitHub Actions always sets GITHUB_REPOSITORY. GitHub Pages serves a *user*
// site (owner == repo, e.g. alice/alice.github.io) at the root, and every
// *project* site under `/<repo>/` — Astro's `base` must match that path or
// every asset 404s. Override with ASTRO_BASE if you host elsewhere.
const owner = process.env.GITHUB_REPOSITORY?.split("/")[0];
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = process.env.ASTRO_BASE ?? (repo && repo !== owner ? `/${repo}/` : "/");

export default defineConfig({
  base,
  vite: {
    plugins: [tailwindcss()],
  },
});
