# Genre Explorer — "Would You Rather Read?"

A "what would you rather?" page that helps brand-new readers figure out which
books and genres they'd actually enjoy. Pick between two books up to 30 times,
then get a summary of the genres and topics your gut kept reaching for.

Built to stay simple: no React, no SPA framework, no server.

## The flow

Open page → click **Start the game** → pick between two books → your pick is
matched against the next challenger → repeat up to 20 rounds → see a summary of
your most-liked genres and recommended books.

## Stack

- **[Astro](https://astro.build)** — static site templating, produces plain HTML.
- **[Tailwind CSS](https://tailwindcss.com)** v4 — styling, via the `@tailwindcss/vite` plugin.
- **[Alpine.js](https://alpinejs.dev)** — all client-side interactivity (the game logic lives in `src/lib/rather.ts`).
- **TypeScript** — data layer and game logic.
- Book data is fetched at runtime from the [Open Library API](https://openlibrary.org/developers/api)
  (CORS-enabled); a hand-picked fallback catalogue in `src/lib/fallback.ts` keeps
  the game playable offline or when the API is unreachable.

## Development

You need [Bun](https://bun.sh) (or Node.js 20+).

```sh
bun install
bun run dev      # http://localhost:4321
bun run build    # static output in dist/
bun run preview  # serve the production build locally
```

## Deploying

`.github/workflows/deploy.yml` builds the site and publishes it to **GitHub Pages**
on every push to `main`.

1. Go to **Settings → Pages** for this repository.
2. Under **Build and deployment → Source**, pick **GitHub Actions**.
3. Push to `main` — the workflow will build and deploy the site.

The workflow runs `bun install` and `bun run build`; Astro's `base` path is
derived automatically from the repo name so assets resolve under
`/<repo>/`, matching how GitHub Pages serves project sites.

---

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dc7e7dbf-3bd0-4daa-b7eb-d3646c4cef2e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.
