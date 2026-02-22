import type { DigestState } from "../types/state.js";
import { fetchFromNewsAPI } from "../tools/newsapi.js";

export async function fetchNewsNode(state: DigestState): Promise<Partial<DigestState>> {
  // Keep query simple for MVP. You can tune later.
  const query = `(AI OR "artificial intelligence" OR LLM OR "AI agent" OR "multi-agent") AND (${state.niche})`;

  const articles = await fetchFromNewsAPI(query);

  return { articles };
}