import type { DigestState, SkimmedItem } from "../types/state.js";
import { ChatOpenAI } from "@langchain/openai";

const JINA_BASE = "https://r.jina.ai/";

async function fetchArticleContent(url: string): Promise<string> {
  try {
    const res = await fetch(JINA_BASE + encodeURI(url), {
      headers: { "X-Return-Format": "markdown", "X-Timeout": "10000" }
    });
    if (!res.ok) return "";
    const text = await res.text();
    return text.slice(0, 6000);
  } catch {
    return "";
  }
}

export async function skimArticlesNode(state: DigestState): Promise<Partial<DigestState>> {
  const curated = state.curated;
  if (!curated?.length) return { skimmedArticles: [] };

  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4.1-mini",
    temperature: 0.2
  });

  const skimmedArticles: SkimmedItem[] = [];

  for (const item of curated) {
    const content = await fetchArticleContent(item.url);
    let keyPoints: string;

    if (!content?.trim() || content.length < 100) {
      keyPoints = `Headline only (content unavailable). Context: ${item.why_it_matters}`;
    } else {
      const res = await llm.invoke(`
  You are helping me write in my LinkedIn style: reflective engineer, systems thinker, short punchy lines, "past vs future" framing, big-picture takeaways.

  Important:
  - Do NOT copy or paraphrase any text from the article directly.
  - Do NOT reuse specific sentences/phrases.
  - Instead, extract underlying ideas and write them as "builder notes" in my voice.

  From the article below, produce 3-5 bullets that are:
  - concrete and specific (numbers, named products/papers/companies, policy changes, etc. if present)
  - framed as implications for builders/engineers ("what this signals", "what changes now")
  - written like notes that I could turn into a narrative post later

  Format rules:
  - 3-5 bullet lines only
  - each bullet 1-2 sentences
  - no intro, no headings, no quotes
  - avoid generic summary language like "this article discusses..."

  Article:
  ${content.slice(0, 4000)}
  `);
      keyPoints = String(res.content ?? "").trim() || item.why_it_matters;
    }

    skimmedArticles.push({
      title: item.title,
      url: item.url,
      keyPoints
    });
  }

  return { skimmedArticles };
}
