export type Book = {
  key: string;
  title: string;
  author: string;
  coverUrl: string | null;
  genre: string;
  genreSlug: string;
  year: number | null;
};

export const GENRES: { slug: string; label: string }[] = [
  { slug: "fantasy", label: "Fantasy" },
  { slug: "science_fiction", label: "Science Fiction" },
  { slug: "mystery", label: "Mystery" },
  { slug: "romance", label: "Romance" },
  { slug: "historical_fiction", label: "Historical Fiction" },
  { slug: "horror", label: "Horror" },
  { slug: "thriller", label: "Thriller" },
  { slug: "biography", label: "Biography & Memoir" },
  { slug: "self-help", label: "Self-Help" },
  { slug: "poetry", label: "Poetry" },
  { slug: "philosophy", label: "Philosophy" },
  { slug: "adventure", label: "Adventure" },
  { slug: "humor", label: "Humor" },
  { slug: "young_adult", label: "Young Adult" },
  { slug: "graphic_novels", label: "Graphic Novels" },
];

/** Fresh request options per call — the timeout signal must not be shared. */
function requestOpts(): RequestInit {
  return {
    headers: {
      Accept: "application/json",
      "User-Agent": "WouldYouRatherRead/1.0 (reading-taste-quiz)",
    },
    signal: timeoutSignal(6000),
  };
}

/**
 * Abort signal that fires after `ms`. Uses AbortSignal.timeout when available,
 * but falls back to a manual timer so older browsers/webviews still work.
 */
function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

type SubjectWork = {
  key?: string;
  title?: string;
  cover_id?: number | null;
  first_publish_year?: number | null;
  authors?: { name?: string }[];
};

/**
 * How many works Open Library lists under each genre. Fetched once on load so
 * the intro can show a real book count without pulling any book data itself.
 */
export async function fetchGenreCounts(): Promise<Record<string, number>> {
  const entries = await Promise.all(
    GENRES.map(async (g) => {
      try {
        const res = await fetch(
          `https://openlibrary.org/subjects/${g.slug}.json?limit=0`,
          requestOpts(),
        );
        if (!res.ok) return [g.slug, 0] as const;
        const json = (await res.json()) as { work_count?: number };
        return [g.slug, json.work_count ?? 0] as const;
      } catch {
        return [g.slug, 0] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

/**
 * Pick one random, real book from a genre's subject page. The "database" is
 * the Open Library catalogue itself: a random offset into the genre's work
 * list is our random id, then we read that single book's entry back.
 */
export async function fetchRandomBook(
  genre: { slug: string; label: string },
  workCount: number,
  seen: Set<string>,
): Promise<Book | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const maxOffset = Math.max(0, Math.min(workCount - 1, 4000));
    const offset = Math.floor(Math.random() * (maxOffset + 1));
    try {
      const res = await fetch(
        `https://openlibrary.org/subjects/${genre.slug}.json?limit=1&offset=${offset}`,
        requestOpts(),
      );
      if (!res.ok) continue;
      const json = (await res.json()) as { works?: SubjectWork[] };
      const w = json.works?.[0];
      if (!w?.key || !w.title || !w.cover_id) continue;
      const key = w.key;
      if (seen.has(key)) continue;
      return {
        key,
        title: w.title,
        author: w.authors?.[0]?.name ?? "Unknown author",
        coverUrl: `https://covers.openlibrary.org/b/id/${w.cover_id}-L.jpg`,
        genre: genre.label,
        genreSlug: genre.slug,
        year: w.first_publish_year ?? null,
      };
    } catch {
      continue;
    }
  }
  return null;
}

/** Pull a book's blurb from its work record for the summary line on the card. */
export async function fetchDescription(key: string): Promise<string | null> {
  try {
    const id = key.split("/").pop();
    if (!id) return null;
    const res = await fetch(`https://openlibrary.org/works/${id}.json`, requestOpts());
    if (!res.ok) return null;
    const json = (await res.json()) as {
      description?: string | { value?: string } | null;
    };
    const d = json.description;
    const raw = typeof d === "string" ? d : d?.value;
    if (!raw) return null;
    return raw.replace(/\s+/g, " ").trim();
  } catch {
    return null;
  }
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i] as T, copy[j] as T] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

export function hashHue(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) % 360;
  return hash;
}

export function dedupeByTitle(books: Book[]): Book[] {
  const seen = new Set<string>();
  return books.filter((b) => {
    const key = b.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
