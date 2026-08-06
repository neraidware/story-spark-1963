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

type SubjectWork = {
  key?: string;
  title?: string;
  cover_id?: number | null;
  first_publish_year?: number | null;
  authors?: { name?: string }[];
};

async function fetchSubject(slug: string, label: string): Promise<Book[]> {
  try {
    const res = await fetch(
      `https://openlibrary.org/subjects/${slug}.json?limit=24&ebooks=false`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "WouldYouRatherRead/1.0 (reading-taste-quiz)",
        },
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { works?: SubjectWork[] };
    return (json.works ?? [])
      .filter((w) => w.key && w.title && w.cover_id)
      .map((w) => ({
        key: w.key as string,
        title: w.title as string,
        author: w.authors?.[0]?.name ?? "Unknown author",
        coverUrl: `https://covers.openlibrary.org/b/id/${w.cover_id}-L.jpg`,
        genre: label,
        genreSlug: slug,
        year: w.first_publish_year ?? null,
      }));
  } catch {
    return [];
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

/**
 * Pull a few books per genre from the Open Library API, then flatten into one
 * shuffled pool. Runs in the browser, so it silently degrades to [] if the
 * API is unreachable — callers fall back to FALLBACK_BOOKS.
 */
export async function buildBookPool(): Promise<Book[]> {
  const results = await Promise.all(GENRES.map((g) => fetchSubject(g.slug, g.label)));
  const seen = new Set<string>();
  const pool: Book[] = [];

  // Take a few per genre so every genre stays in play, then flatten.
  for (const list of results) {
    for (const book of shuffle(list).slice(0, 6)) {
      const id = book.title.toLowerCase();
      if (seen.has(id)) continue;
      seen.add(id);
      pool.push(book);
    }
  }

  return shuffle(pool);
}
