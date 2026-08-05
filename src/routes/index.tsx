import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FALLBACK_BOOKS } from "@/lib/books-fallback";
import { getBookPool } from "@/lib/books.functions";
import type { Book } from "@/lib/books.server";

const MAX_ROUNDS = 20;
const MIN_ROUNDS_BEFORE_FINISH = 5;

const poolQueryOptions = queryOptions({
  queryKey: ["book-pool"],
  queryFn: () => getBookPool(),
  staleTime: 1000 * 60 * 30,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(poolQueryOptions),
  component: RatherPage,
  errorComponent: ({ error }) => (
    <Shell>
      <div className="card-soft mx-auto max-w-md p-8 text-center">
        <h2 className="text-xl font-semibold">We couldn't load the books</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="text-center text-muted-foreground">Nothing here.</p>
    </Shell>
  ),
  head: () => ({
    meta: [
      { title: "Would You Rather Read? — Find Your Book Taste" },
      {
        name: "description",
        content:
          "Pick between two books, 20 times, and discover which genres and topics you'd actually enjoy reading. Built for brand-new readers.",
      },
      { property: "og:title", content: "Would You Rather Read? — Find Your Book Taste" },
      {
        property: "og:description",
        content:
          "A quick two-book game that turns your gut reactions into a reading taste profile with genre recommendations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="surface-glow min-h-screen px-4 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </main>
  );
}

type Stage = "intro" | "playing" | "summary";

function RatherPage() {
  const { data } = useSuspenseQuery(poolQueryOptions);
  // Guard against an empty/unreachable catalogue response so the game is always playable.
  const pool = data.books.length >= 16 ? data.books : FALLBACK_BOOKS;

  const [stage, setStage] = useState<Stage>("intro");
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<Book[]>([]);
  const [champion, setChampion] = useState<Book | null>(null);
  const [challenger, setChallenger] = useState<Book | null>(null);
  const [queue, setQueue] = useState<Book[]>([]);
  const [sideFlip, setSideFlip] = useState(false);

  function start() {
    const fresh = shuffle(pool);
    setScores({});
    setPicked([]);
    setRound(0);
    setChampion(fresh[0] ?? null);
    setChallenger(fresh[1] ?? null);
    setQueue(fresh.slice(2));
    setSideFlip(false);
    setStage("playing");
  }

  function choose(winner: Book, loser: Book) {
    setScores((prev) => ({
      ...prev,
      [winner.genre]: (prev[winner.genre] ?? 0) + 3,
      [loser.genre]: (prev[loser.genre] ?? 0) + 1,
    }));
    setPicked((prev) => [...prev, winner]);

    const nextRound = round + 1;
    const remaining = queue.filter(
      (b) => b.title !== winner.title && b.title !== loser.title,
    );
    const nextChallenger = remaining[0];

    if (nextRound >= MAX_ROUNDS || !nextChallenger) {
      setRound(nextRound);
      setStage("summary");
      return;
    }

    setRound(nextRound);
    setChampion(winner);
    setChallenger(nextChallenger);
    setQueue(remaining.slice(1));
    setSideFlip((f) => !f);
  }

  // Keep the returning champion from always sitting on the same side.
  const left = sideFlip ? challenger : champion;
  const right = sideFlip ? champion : challenger;

  if (stage === "intro") {
    return (
      <Shell>
        <Intro totalBooks={pool.length} onStart={start} />
      </Shell>
    );
  }

  if (stage === "summary") {
    return (
      <Shell>
        <Summary scores={scores} picked={picked} rounds={round} onRestart={start} />
      </Shell>
    );
  }

  if (!left || !right) {
    return (
      <Shell>
        <div className="card-soft p-8 text-center">
          <p className="text-muted-foreground">Not enough books to play right now.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Game
        round={round}
        left={left}
        right={right}

        onPick={choose}
        onFinish={() => setStage("summary")}
      />
    </Shell>
  );
}

function Intro({ totalBooks, onStart }: { totalBooks: number; onStart: () => void }) {
  return (
    <section className="fade-rise mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full bg-highlight px-4 py-1.5 text-xs font-semibold tracking-wide text-highlight-foreground uppercase">
        For brand-new readers
      </span>
      <h1 className="mt-6 text-4xl leading-tight font-bold sm:text-6xl">
        Would you rather <span className="text-primary">read this</span>
        <br />
        or <span className="text-accent-foreground">that</span>?
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
        Two books at a time. Pick the one that pulls you in — no wrong answers, no reading
        required. After up to {MAX_ROUNDS} quick choices we'll show you the genres and topics
        your gut keeps reaching for.
      </p>
      <button
        onClick={onStart}
        className="mt-9 inline-flex items-center justify-center rounded-full bg-primary px-9 py-4 text-base font-semibold text-primary-foreground shadow-soft transition hover:brightness-105 active:scale-[0.98]"
      >
        Start the game
      </button>
      <p className="mt-4 text-xs text-muted-foreground">
        {totalBooks} real books, pulled from the Open Library catalogue.
      </p>
    </section>
  );
}

function Game({
  round,
  left,
  right,
  onPick,
  onFinish,
}: {
  round: number;
  left: Book;
  right: Book;
  onPick: (winner: Book, loser: Book) => void;
  onFinish: () => void;
}) {
  const progress = Math.round((round / MAX_ROUNDS) * 100);

  return (
    <section>
      <header className="mx-auto max-w-xl text-center">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Round {round + 1} of {MAX_ROUNDS}
        </p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Which would you rather read?</h1>
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6">
        <BookChoice key={`l-${left.key}-${round}`} book={left} onPick={() => onPick(left, right)} />
        <BookChoice
          key={`r-${right.key}-${round}`}
          book={right}
          onPick={() => onPick(right, left)}
        />
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={onFinish}
          disabled={round < MIN_ROUNDS_BEFORE_FINISH}
          className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
        >
          {round < MIN_ROUNDS_BEFORE_FINISH
            ? `A few more picks (${MIN_ROUNDS_BEFORE_FINISH - round} to go)`
            : "I'm happy — show my results"}
        </button>
      </div>
    </section>
  );
}

function BookChoice({ book, onPick }: { book: Book; onPick: () => void }) {
  const [broken, setBroken] = useState(false);
  const hue = hashHue(book.genre);

  return (

    <button
      onClick={onPick}
      className="pick-card fade-rise group flex flex-col overflow-hidden text-left"
    >
      <div className="aspect-3/4 w-full overflow-hidden bg-muted">
        {book.coverUrl && !broken ? (
          <img
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full flex-col justify-between p-6"
            style={{
              backgroundImage: `linear-gradient(150deg, oklch(0.92 0.045 ${hue}), oklch(0.86 0.06 ${(hue + 40) % 360}))`,
            }}
          >
            <span className="text-[0.68rem] font-semibold tracking-widest text-highlight-foreground uppercase">
              {book.genre}
            </span>
            <span className="font-display text-2xl leading-tight font-semibold text-foreground/85">
              {book.title}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-5">
        <span className="w-fit rounded-full bg-highlight px-3 py-1 text-[0.68rem] font-semibold tracking-wide text-highlight-foreground uppercase">
          {book.genre}
        </span>
        <h2 className="mt-2 text-lg leading-snug font-semibold">{book.title}</h2>
        <p className="text-sm text-muted-foreground">
          {book.author}
          {book.year ? ` · ${book.year}` : ""}
        </p>
      </div>
    </button>
  );
}

function Summary({
  scores,
  picked,
  rounds,
  onRestart,
}: {
  scores: Record<string, number>;
  picked: Book[];
  rounds: number;
  onRestart: () => void;
}) {
  const ranked = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const top = ranked[0]?.[1] ?? 1;
  const favourites = dedupeByTitle(picked).slice(-6).reverse();

  return (
    <section className="fade-rise">
      <header className="mx-auto max-w-2xl text-center">
        <span className="inline-flex rounded-full bg-accent px-4 py-1.5 text-xs font-semibold tracking-wide text-accent-foreground uppercase">
          {rounds} picks in
        </span>
        <h1 className="mt-5 text-3xl font-bold sm:text-4xl">Your reading taste, roughly</h1>
        <p className="mt-3 text-muted-foreground">
          Start with{" "}
          <strong className="text-foreground">{ranked[0]?.[0] ?? "anything you like"}</strong> — it
          came out on top of your choices.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        <div className="card-soft p-6 lg:col-span-3">
          <h2 className="text-lg font-semibold">Genres you leaned into</h2>
          <ul className="mt-5 space-y-4">
            {ranked.map(([genre, score], index) => (
              <li key={genre}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">
                    {index + 1}. {genre}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round((score / top) * 100)}% match
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(8, Math.round((score / top) * 100))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-soft p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Books to try first</h2>
          <ul className="mt-4 space-y-3">
            {favourites.map((book) => (
              <li key={book.key} className="flex gap-3">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={`Cover of ${book.title}`}
                    loading="lazy"
                    className="h-16 w-11 flex-none rounded-md object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{book.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{book.author}</p>
                  <p className="mt-0.5 text-xs text-primary">{book.genre}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 text-center">
        <button
          onClick={onRestart}
          className="rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:brightness-105 active:scale-[0.98]"
        >
          Play again
        </button>
      </div>
    </section>
  );
}

function dedupeByTitle(books: Book[]): Book[] {
  const seen = new Set<string>();
  return books.filter((b) => {
    const key = b.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

function hashHue(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) % 360;
  return hash;
}
