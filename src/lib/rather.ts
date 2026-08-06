import type { Book } from "./books";
import {
  GENRES,
  dedupeByTitle,
  fetchDescription,
  fetchGenreCounts,
  fetchRandomBook,
  hashHue,
} from "./books";

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

type Contributions = Record<string, { genre: string; wins: number; losses: number }>;

/**
 * The whole game lives in one Alpine component. State is plain data, the
 * template in index.astro reads and mutates it through these methods/getters.
 *
 * There is no round limit — the user decides when to stop. Each of the two
 * cards has two actions: like (this book beats the other) and delete (this
 * book is not for me and never comes back). Books may reappear across the
 * quiz; only deleted books are permanently removed.
 *
 * Books are fetched lazily, one random book per slot, right when it's shown.
 * Nothing is pre-fetched on load — only the per-genre work counts, so the
 * intro can display how many books the catalogue holds.
 */
export function rather() {
  return {
    stage: "intro" as Stage,
    loading: true,
    leftBusy: false,
    rightBusy: false,
    failed: false,
    bookCount: 0,
    genreCounts: {} as Record<string, number>,

    picks: 0,
    scores: {} as Record<string, number>,
    contrib: {} as Contributions,
    picked: [] as Book[],
    leftBook: null as Book | null,
    rightBook: null as Book | null,
    banned: new Set<string>(),
    broken: {} as Record<string, boolean>,
    summaries: {} as Record<string, string>,
    pickedFlash: "",
    deleted: false,

    init() {
      // The intro renders immediately; the book count streams in behind it.
      this.loading = true;
      void this.loadCounts();
    },

    async loadCounts() {
      this.genreCounts = await fetchGenreCounts();
      this.bookCount = Object.values(this.genreCounts).reduce((a, b) => a + b, 0);
      this.loading = false;
    },

    async start() {
      this.scores = {};
      this.contrib = {};
      this.picked = [];
      this.picks = 0;
      this.broken = {};
      this.summaries = {};
      this.banned = new Set<string>();
      this.pickedFlash = "";
      this.deleted = false;
      this.failed = false;
      this.stage = "playing";
      await this.fillPair();
    },

    /** Fetch a fresh pair for the start of a game or a skip. */
    async fillPair() {
      this.leftBusy = true;
      this.rightBusy = true;
      const [a, b] = await Promise.all([this.fetchBook(), this.fetchBook()]);
      this.leftBusy = false;
      this.rightBusy = false;
      if (!a || !b) {
        this.failed = true;
        return;
      }
      if (a.key === b.key) {
        // Collision: never show the same book on both cards.
        const b2 = await this.fetchBook(a.key);
        if (b2) {
          this.leftBook = a;
          this.rightBook = b2;
          return;
        }
      }
      this.leftBook = a;
      this.rightBook = b;
    },

    /**
     * A random genre, then a random book within it. Deleted books are
     * blocked; blockKey additionally stops the other card's current book
     * from being fetched into its own replacement slot.
     */
    async fetchBook(blockKey?: string): Promise<Book | null> {
      const blocked = new Set(this.banned);
      if (blockKey) blocked.add(blockKey);
      const genre = GENRES[Math.floor(Math.random() * GENRES.length)]!;
      const workCount = this.genreCounts[genre.slug] ?? 0;
      const book = await fetchRandomBook(genre, workCount, blocked);
      if (book) this.loadSummary(book.key);
      return book;
    },

    async refillLeft(blockKey: string) {
      this.leftBusy = true;
      this.leftBook = null;
      const next = await this.fetchBook(blockKey);
      this.leftBusy = false;
      if (!next) {
        this.failed = true;
        return;
      }
      this.leftBook = next;
    },

    async refillRight(blockKey: string) {
      this.rightBusy = true;
      this.rightBook = null;
      const next = await this.fetchBook(blockKey);
      this.rightBusy = false;
      if (!next) {
        this.failed = true;
        return;
      }
      this.rightBook = next;
    },

    async loadSummary(key: string) {
      const text = await fetchDescription(key);
      if (text) this.summaries = { ...this.summaries, [key]: text };
    },

    /** I like `book` more than `other`: it wins, other leaves, slot refills. */
    like(book: Book, other: Book) {
      // Guard: clicking the staying card while its partner is still being
      // fetched would otherwise score an empty genre and burn a comparison.
      if (this.busy || other.key === "loading") return;
      this.pickedFlash = book.key;
      setTimeout(() => (this.pickedFlash = ""), 350);

      this.scores[book.genre] = (this.scores[book.genre] ?? 0) + 3;
      this.scores[other.genre] = (this.scores[other.genre] ?? 0) + 1;
      this.recordContrib(book, "win");
      this.recordContrib(other, "loss");
      this.picked = [...this.picked, book];
      this.picks += 1;
      // Committing to a book opens a fresh matchup, where a delete is
      // available again.
      this.deleted = false;

      if (book === this.leftBook) this.refillRight(other.key);
      else this.refillLeft(other.key);
    },

    /** I don't like `book`: ban it forever and subtract its past scores. */
    destroy(book: Book, other: Book) {
      // The user must pick one or the other, so only one book per matchup
      // can be deleted — you can't block both.
      if (this.busy || this.deleted || other.key === "loading") return;
      this.deleted = true;
      this.banned.add(book.key);

      const c = this.contrib[book.key];
      if (c) {
        this.scores[c.genre] = (this.scores[c.genre] ?? 0) - (c.wins * 3 + c.losses);
        if ((this.scores[c.genre] ?? 0) <= 0) delete this.scores[c.genre];
        delete this.contrib[book.key];
      }
      this.picked = this.picked.filter((b) => b.key !== book.key);

      if (book === this.leftBook) this.refillLeft(other.key);
      else this.refillRight(other.key);
    },

    recordContrib(book: Book, kind: "win" | "loss") {
      const c = this.contrib[book.key] ?? { genre: book.genre, wins: 0, losses: 0 };
      if (kind === "win") c.wins += 1;
      else c.losses += 1;
      this.contrib[book.key] = c;
    },

    onKey(e: KeyboardEvent) {
      if (this.stage !== "playing" || this.failed || this.busy) return;
      const left = this.leftBook;
      const right = this.rightBook;
      if (!left || !right || left.key === "loading" || right.key === "loading") return;
      if (e.key === "ArrowLeft" || e.key === "1") {
        e.preventDefault();
        this.like(left, right);
      } else if (e.key === "ArrowRight" || e.key === "2") {
        e.preventDefault();
        this.like(right, left);
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        this.destroy(left, right);
      } else if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        this.destroy(right, left);
      } else if (e.key === "f" || e.key === "F") {
        this.finish();
      }
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

    workUrl(key: string) {
      return `https://openlibrary.org/works/${key.split("/").pop()}`;
    },

    get left() {
      return this.leftBook ?? LOADING_BOOK;
    },
    get right() {
      return this.rightBook ?? LOADING_BOOK;
    },
    get busy() {
      return this.leftBusy || this.rightBusy;
    },

    get bookCountLabel() {
      return this.bookCount.toLocaleString("en-US");
    },

    get genreTotal() {
      return GENRES.length;
    },
    get exploredCount() {
      return new Set(this.picked.map((b) => b.genre)).size;
    },
    get exploredPct() {
      return Math.round((this.exploredCount / this.genreTotal) * 100);
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

    /** Live nudge that grows with the quiz to encourage going longer. */
    hint() {
      if (this.picks < 3) {
        return "A few picks in — the more you compare, the truer your reading taste.";
      }
      if (this.picks < 10) {
        return "Warming up nicely — 10+ picks makes your result much clearer.";
      }
      if (this.picks < 20) {
        return "Great pace — 20+ picks gives a proper deep read.";
      }
      return "Strong sample! Keep going whenever you like, or see your results now.";
    },

    confidenceLabel() {
      if (this.picks < 5) return "first impression";
      if (this.picks < 10) return "rough sketch";
      if (this.picks < 20) return "solid read";
      return "deep dive";
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
