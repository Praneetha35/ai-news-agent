import type { RawArticle } from "../types/state.js";

export async function fetchFromNewsAPI(query: string): Promise<RawArticle[]> {
  const key = process.env.NEWS_API_KEY;
  if (!key) throw new Error("Missing NEWS_API_KEY in .env");

  const q = encodeURIComponent(query);
  const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=30`;

  const res = await fetch(url, { headers: { "X-Api-Key": key } });
  if (!res.ok) {
    throw new Error(`NewsAPI error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return (data.articles ?? []) as RawArticle[];
}