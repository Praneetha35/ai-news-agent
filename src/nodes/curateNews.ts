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
    .map(a => ({
      title: a.title,
      url: a.url,
      source: a.source?.name ?? "Unknown",
      publishedAt: a.publishedAt ?? null,
      description: a.description ?? null
    }));

  const prompt = `
You are an expert AI news curator that identifies what is currently
"talk of the town" in AI.

Your job:
Select the TOP 5 MOST TRENDING and IMPORTANT AI news items.

Focus on:
- Major releases from OpenAI, Anthropic, Google, Meta, Apple, NVIDIA, Microsoft
- New model launches, benchmarks, multi-agent systems, reasoning models
- Viral announcements or industry-shifting updates
- Anything developers and AI builders are actively discussing right now

Avoid:
- Generic opinion blogs
- Marketing fluff
- Low-impact articles
- Duplicates or reprints

VERY IMPORTANT:
Pick items that feel like:
"This is what everyone in AI Twitter/LinkedIn/dev circles is talking about today."

For each selected item include:
{
  title,
  url,
  source,
  publishedAt,
  why_it_matters: ONE concise practical sentence explaining why developers should care,
  score: number from 0-100 (trend + importance combined)
}

Return STRICT JSON only:
{ "items": [...] }

Articles:
${JSON.stringify(trimmed, null, 2)}
`;

  const res = await llm.invoke(prompt);
  const raw = String(res.content ?? "").trim();

  const parsed = CuratedSchema.parse(JSON.parse(raw));
  const curated: CuratedItem[] = parsed.items
    .sort((a, b) => b.score - a.score);

  return { curated };
}