import type { Book } from "./books";
import {
  GENRES,
  dedupeByTitle,
  fetchDescription,
  fetchGenreCounts,
  fetchRandomBook,
  hashHue,
} from "./books";

const MAX_ROUNDS = 20;
const MIN_ROUNDS_BEFORE_FINISH = 5;

type Stage = "intro" | "playing" | "summary";

/** Stand-in card shown while the next random book is being fetched. */
const LOADING_BOOK: Book = {
  key: "loading",
  title: "Finding the next book…",
  author: "",
  coverUrl: null,
  genre: "",
  genreSlug: "",
  year: null,
};

/**
 * The whole game lives in one Alpine component. State is plain data, the
 * template in index.astro reads and mutates it through these methods/getters.
 *
 * Books are fetched lazily: one random book per slot, right when it's shown.
 * Nothing is pre-fetched on load — only the per-genre work counts, so the
 * intro can display how many books the catalogue holds.
 */
export function rather() {
  return {
    stage: "intro" as Stage,
    loading: true,
    finding: false,
    failed: false,
    bookCount: 0,
    genreCounts: {} as Record<string, number>,

    round: 0,
    scores: {} as Record<string, number>,
    picked: [] as Book[],
    champion: null as Book | null,
    challenger: null as Book | null,
    sideFlip: false,
    broken: {} as Record<string, boolean>,
    summaries: {} as Record<string, string>,
    seen: new Set<string>(),

    MAX_ROUNDS,
    MIN_ROUNDS_BEFORE_FINISH,

    async init() {
      this.genreCounts = await fetchGenreCounts();
      this.bookCount = Object.values(this.genreCounts).reduce((a, b) => a + b, 0);
      this.loading = false;
    },

    async start() {
      this.scores = {};
      this.picked = [];
      this.round = 0;
      this.broken = {};
      this.summaries = {};
      this.seen = new Set<string>();
      this.sideFlip = false;
      this.failed = false;
      this.stage = "playing";
      await this.fillPair();
    },

    /** Fetch both a champion and challenger for the start of a game. */
    async fillPair() {
      this.finding = true;
      const [champion, challenger] = await Promise.all([this.fetchBook(), this.fetchBook()]);
      this.finding = false;
      if (!champion || !challenger) {
        this.failed = true;
        return;
      }
      this.champion = champion;
      this.challenger = challenger;
    },

    /**
     * A random genre, then a random book within it. Each pick gets its
     * description fetched lazily in the background for the card summary.
     */
    async fetchBook(): Promise<Book | null> {
      const genre = GENRES[Math.floor(Math.random() * GENRES.length)]!;
      const workCount = this.genreCounts[genre.slug] ?? 0;
      const book = await fetchRandomBook(genre, workCount, this.seen);
      if (book) {
        this.seen.add(book.key);
        this.loadSummary(book.key);
      }
      return book;
    },

    async loadSummary(key: string) {
      const text = await fetchDescription(key);
      if (text) this.summaries = { ...this.summaries, [key]: text };
    },

    async choose(winner: Book, loser: Book) {
      this.scores = {
        ...this.scores,
        [winner.genre]: (this.scores[winner.genre] ?? 0) + 3,
        [loser.genre]: (this.scores[loser.genre] ?? 0) + 1,
      };
      this.picked = [...this.picked, winner];

      const nextRound = this.round + 1;
      if (nextRound >= MAX_ROUNDS) {
        this.round = nextRound;
        this.stage = "summary";
        return;
      }

      this.round = nextRound;
      this.champion = winner;
      this.challenger = null;
      this.sideFlip = !this.sideFlip;
      const next = await this.fetchBook();
      if (!next) {
        this.failed = true;
        return;
      }
      this.challenger = next;
    },

    finish() {
      this.stage = "summary";
    },

    markBroken(key: string) {
      this.broken[key] = true;
    },

    summary(book: Book) {
      return this.summaries[book.key] ?? "";
    },

    // The returning champion shouldn't always sit on the same side.
    get left() {
      return this.sideFlip ? this.challenger ?? LOADING_BOOK : this.champion ?? LOADING_BOOK;
    },
    get right() {
      return this.sideFlip ? this.champion ?? LOADING_BOOK : this.challenger ?? LOADING_BOOK;
    },

    get progress() {
      return Math.round((this.round / MAX_ROUNDS) * 100);
    },

    get bookCountLabel() {
      return this.bookCount.toLocaleString("en-US");
    },

    get ranked(): [string, number][] {
      return Object.entries(this.scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    },

    get topScore() {
      return this.ranked[0]?.[1] ?? 1;
    },

    get favourites() {
      return dedupeByTitle(this.picked).slice(-6).reverse();
    },

    gradient(genre: string) {
      const hue = hashHue(genre);
      return {
        backgroundImage: `linear-gradient(150deg, oklch(0.92 0.045 ${hue}), oklch(0.86 0.06 ${(hue + 40) % 360}))`,
      };
    },

    barWidth(score: number) {
      return `${Math.max(8, Math.round((score / this.topScore) * 100))}%`;
    },

    matchPercent(score: number) {
      return `${Math.round((score / this.topScore) * 100)}% match`;
    },
  };
}
