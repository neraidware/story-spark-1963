import { createServerFn } from "@tanstack/react-start";
import { buildBookPool } from "./books.server";

export const getBookPool = createServerFn({ method: "GET" }).handler(async () => {
  const books = await buildBookPool();
  return { books };
});
