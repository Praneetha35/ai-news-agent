import type { DigestState } from "../types/state.js";
import { ChatOpenAI } from "@langchain/openai";

function formatWhatsAppFallback(state: DigestState): string {
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const lines: string[] = [];
  lines.push(`AI Digest — ${date}`);
  lines.push("");

  state.curated.forEach((it, idx) => {
    lines.push(`${idx + 1}) ${it.title}`);
    lines.push(`   • Why: ${it.why_it_matters}`);
    lines.push(`   • Link: ${it.url}`);
    lines.push("");
  });

  lines.push(`Reply "more" + number for a deeper breakdown.`);
  return lines.join("\n");
}

export async function writeDigestNode(state: DigestState): Promise<Partial<DigestState>> {
  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4.1",
    temperature: 0.7 
  });

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  const skimmed = state.skimmedArticles?.length
    ? state.skimmedArticles
    : state.curated.map(c => ({ title: c.title, url: c.url, keyPoints: c.why_it_matters }));

  const prompt = `
Write in my narrative style (NOT copying any specific post).

Style guidance:
- Reflective, thoughtful engineering voice
- Short flowing paragraphs (natural pacing)
- Focus on meaning + implications, not hype
- Conversational, human, not corporate
- Do NOT force a rigid template
- Do NOT copy or closely paraphrase any lines from the skimmed text; you can use facts, but rephrase everything in your own words.

My writing style notes:
${state.writingStyle}

I want TWO outputs:

A) WhatsApp digest:
- very scannable
- numbered 1-5
- each item: 1 line headline + 1 line "why" + link
- keep it short, no essays
- include header with date: ${date}

B) TWO LinkedIn posts (exactly 2):
- Use the SKIMMED content below (keyPoints) as your source of substance.
- Each post should include real specifics (names, numbers, key changes) when available.
- Draft like a human sharing what they learned: conversational, narrative tone.
- Vary them: different angles, different pacing/structure.
- Each 7-10 lines.
- 1-2 links max per post.
- No hashtag spam (0-2 hashtags if they feel natural).

Skimmed articles:
${JSON.stringify(skimmed, null, 2)}

Return in this exact format (no extra text):

===WHATSAPP===
<text>

===LINKEDIN_POST_1===
<complete post text>

===LINKEDIN_POST_2===
<complete post text>
`;

  const res = await llm.invoke(prompt);
  const text = String(res.content ?? "").trim();

  const waMatch = text.split("===WHATSAPP===")[1]?.split("===LINKEDIN_POST_1===")[0]?.trim();
  const li1Match = text.split("===LINKEDIN_POST_1===")[1]?.split("===LINKEDIN_POST_2===")[0]?.trim();
  const li2Match = text.split("===LINKEDIN_POST_2===")[1]?.trim();

  const linkedinPosts: string[] = [];
  if (li1Match) linkedinPosts.push(li1Match);
  if (li2Match) linkedinPosts.push(li2Match);

  return {
    whatsappText: waMatch && waMatch.length > 30 ? waMatch : formatWhatsAppFallback(state),
    linkedinPosts
  };
}