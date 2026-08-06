import type { Book } from "./books";
import { buildBookPool, dedupeByTitle, hashHue, shuffle } from "./books";
import { FALLBACK_BOOKS } from "./fallback";

const MAX_ROUNDS = 20;
const MIN_ROUNDS_BEFORE_FINISH = 5;

type Stage = "intro" | "playing" | "summary";

/**
 * The whole game lives in one Alpine component. State is plain data, the
 * template in index.astro reads and mutates it through these methods/getters.
 */
export function rather() {
  return {
    stage: "intro" as Stage,
    loading: true,
    pool: [] as Book[],

    round: 0,
    scores: {} as Record<string, number>,
    picked: [] as Book[],
    champion: null as Book | null,
    challenger: null as Book | null,
    queue: [] as Book[],
    sideFlip: false,
    broken: {} as Record<string, boolean>,

    MAX_ROUNDS,
    MIN_ROUNDS_BEFORE_FINISH,

    async init() {
      const fetched = await buildBookPool();
      // Guard against an empty/unreachable catalogue so the game is always playable.
      this.pool = fetched.length >= 16 ? fetched : FALLBACK_BOOKS;
      this.loading = false;
    },

    start() {
      const fresh = shuffle(this.pool);
      this.scores = {};
      this.picked = [];
      this.round = 0;
      this.broken = {};
      this.champion = fresh[0] ?? null;
      this.challenger = fresh[1] ?? null;
      this.queue = fresh.slice(2);
      this.sideFlip = false;
      this.stage = "playing";
    },

    choose(winner: Book, loser: Book) {
      this.scores = {
        ...this.scores,
        [winner.genre]: (this.scores[winner.genre] ?? 0) + 3,
        [loser.genre]: (this.scores[loser.genre] ?? 0) + 1,
      };
      this.picked = [...this.picked, winner];

      const nextRound = this.round + 1;
      const remaining = this.queue.filter(
        (b) => b.title !== winner.title && b.title !== loser.title,
      );
      const nextChallenger = remaining[0];

      if (nextRound >= MAX_ROUNDS || !nextChallenger) {
        this.round = nextRound;
        this.stage = "summary";
        return;
      }

      this.round = nextRound;
      this.champion = winner;
      this.challenger = nextChallenger;
      this.queue = remaining.slice(1);
      this.sideFlip = !this.sideFlip;
    },

    finish() {
      this.stage = "summary";
    },

    markBroken(key: string) {
      this.broken[key] = true;
    },

    // The returning champion shouldn't always sit on the same side.
    get left() {
      return this.sideFlip ? this.challenger : this.champion;
    },
    get right() {
      return this.sideFlip ? this.champion : this.challenger;
    },

    get progress() {
      return Math.round((this.round / MAX_ROUNDS) * 100);
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
