import type { DigestState, CuratedItem } from "../types/state.js";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const CuratedSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      url: z.string().url(),
      source: z.string(),
      publishedAt: z.string().nullable().optional(),
      why_it_matters: z.string(),
      score: z.number().min(0).max(100)
    })
  )
});

export async function curateNewsNode(state: DigestState): Promise<Partial<DigestState>> {
  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4.1-mini",
    temperature: 0.3
  });

  const trimmed = state.articles
    .filter(a => a?.title && a?.url)
    .slice(0, 30)
    .map(a => ({
      title: a.title,
      url: a.url,
      source: a.source?.name ?? "Unknown",
      publishedAt: a.publishedAt ?? null,
      description: a.description ?? null
    }));

  const prompt = `
You are a strict AI news curator.

Goal: pick the BEST 5 items for a daily digest focused on:
${state.niche}

Rules:
- Prefer: product releases, research papers, benchmarks, major infra updates, safety/regulation, major funding.
- Avoid: fluff, vague opinion-only, duplicates, reprints, clickbait.
- Output JSON with shape: { "items": [ ... ] }
- Each item: { title, url, source, publishedAt, why_it_matters (1 sentence), score (0-100) }
- Make "why_it_matters" practical, not hype.

Articles:
${JSON.stringify(trimmed, null, 2)}
`;

  const res = await llm.invoke(prompt);
  const raw = String(res.content ?? "").trim();

  // Try to parse. If model returns text, this will throw.
  const parsed = CuratedSchema.parse(JSON.parse(raw));
  const curated: CuratedItem[] = parsed.items
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return { curated };
}