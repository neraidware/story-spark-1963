import type { Book } from "./books.server";

type Seed = [title: string, author: string, year: number];

const SEED: Record<string, Seed[]> = {
  Fantasy: [
    ["The Hobbit", "J.R.R. Tolkien", 1937],
    ["A Wizard of Earthsea", "Ursula K. Le Guin", 1968],
    ["The Name of the Wind", "Patrick Rothfuss", 2007],
    ["Howl's Moving Castle", "Diana Wynne Jones", 1986],
  ],
  "Science Fiction": [
    ["The Left Hand of Darkness", "Ursula K. Le Guin", 1969],
    ["Project Hail Mary", "Andy Weir", 2021],
    ["Klara and the Sun", "Kazuo Ishiguro", 2021],
    ["Fahrenheit 451", "Ray Bradbury", 1953],
  ],
  Mystery: [
    ["And Then There Were None", "Agatha Christie", 1939],
    ["The Thursday Murder Club", "Richard Osman", 2020],
    ["The Big Sleep", "Raymond Chandler", 1939],
    ["Magpie Murders", "Anthony Horowitz", 2016],
  ],
  Romance: [
    ["Pride and Prejudice", "Jane Austen", 1813],
    ["Beach Read", "Emily Henry", 2020],
    ["Red, White & Royal Blue", "Casey McQuiston", 2019],
    ["Normal People", "Sally Rooney", 2018],
  ],
  "Historical Fiction": [
    ["The Book Thief", "Markus Zusak", 2005],
    ["Pachinko", "Min Jin Lee", 2017],
    ["Wolf Hall", "Hilary Mantel", 2009],
    ["The Song of Achilles", "Madeline Miller", 2011],
  ],
  Horror: [
    ["The Haunting of Hill House", "Shirley Jackson", 1959],
    ["Mexican Gothic", "Silvia Moreno-Garcia", 2020],
    ["Pet Sematary", "Stephen King", 1983],
    ["Frankenstein", "Mary Shelley", 1818],
  ],
  Thriller: [
    ["Gone Girl", "Gillian Flynn", 2012],
    ["The Silent Patient", "Alex Michaelides", 2019],
    ["Rebecca", "Daphne du Maurier", 1938],
    ["The Girl with the Dragon Tattoo", "Stieg Larsson", 2005],
  ],
  "Biography & Memoir": [
    ["Educated", "Tara Westover", 2018],
    ["Just Kids", "Patti Smith", 2010],
    ["Becoming", "Michelle Obama", 2018],
    ["When Breath Becomes Air", "Paul Kalanithi", 2016],
  ],
  "Self-Help": [
    ["Atomic Habits", "James Clear", 2018],
    ["Four Thousand Weeks", "Oliver Burkeman", 2021],
    ["The Artist's Way", "Julia Cameron", 1992],
    ["Quiet", "Susan Cain", 2012],
  ],
  Poetry: [
    ["Devotions", "Mary Oliver", 2017],
    ["Milk and Honey", "Rupi Kaur", 2014],
    ["Citizen", "Claudia Rankine", 2014],
    ["Leaves of Grass", "Walt Whitman", 1855],
  ],
  Philosophy: [
    ["Meditations", "Marcus Aurelius", 180],
    ["The Myth of Sisyphus", "Albert Camus", 1942],
    ["Sapiens", "Yuval Noah Harari", 2011],
    ["The Consolations of Philosophy", "Alain de Botton", 2000],
  ],
  Adventure: [
    ["Into Thin Air", "Jon Krakauer", 1997],
    ["Treasure Island", "Robert Louis Stevenson", 1883],
    ["Life of Pi", "Yann Martel", 2001],
    ["The Count of Monte Cristo", "Alexandre Dumas", 1844],
  ],
  Humor: [
    ["Good Omens", "Terry Pratchett & Neil Gaiman", 1990],
    ["The Hitchhiker's Guide to the Galaxy", "Douglas Adams", 1979],
    ["Me Talk Pretty One Day", "David Sedaris", 2000],
    ["Bossypants", "Tina Fey", 2011],
  ],
  "Young Adult": [
    ["The Hunger Games", "Suzanne Collins", 2008],
    ["The Perks of Being a Wallflower", "Stephen Chbosky", 1999],
    ["Six of Crows", "Leigh Bardugo", 2015],
    ["The Hate U Give", "Angie Thomas", 2017],
  ],
  "Graphic Novels": [
    ["Persepolis", "Marjane Satrapi", 2000],
    ["Maus", "Art Spiegelman", 1986],
    ["Saga, Volume 1", "Brian K. Vaughan", 2012],
    ["Nimona", "ND Stevenson", 2015],
  ],
};

const SLUGS: Record<string, string> = {
  Fantasy: "fantasy",
  "Science Fiction": "science_fiction",
  Mystery: "mystery",
  Romance: "romance",
  "Historical Fiction": "historical_fiction",
  Horror: "horror",
  Thriller: "thriller",
  "Biography & Memoir": "biography",
  "Self-Help": "self-help",
  Poetry: "poetry",
  Philosophy: "philosophy",
  Adventure: "adventure",
  Humor: "humor",
  "Young Adult": "young_adult",
  "Graphic Novels": "graphic_novels",
};

export const FALLBACK_BOOKS: Book[] = Object.entries(SEED).flatMap(([genre, books]) =>
  books.map(([title, author, year]) => ({
    key: `fallback:${title}`,
    title,
    author,
    coverUrl: null,
    genre,
    genreSlug: SLUGS[genre] ?? "fiction",
    year,
  })),
);
