import type { DigestState } from "../types/state.js";
import { ChatOpenAI } from "@langchain/openai";

function formatWhatsAppFallback(state: DigestState): string {
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const lines: string[] = [];
  lines.push(`🧠 AI Digest — ${date}`);
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
    temperature: 0.6
  });

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  const prompt = `
You write in MY voice.

My writing style:
${state.writingStyle}

I want TWO outputs:

A) WhatsApp digest:
- very scannable
- numbered 1-5
- each item: 1 line headline + 1 line "why" + link
- keep it short, no essays
- include header with date: ${date}

B) LinkedIn draft:
- 6–10 short lines
- strong hook (first line)
- 3 bullets with themes
- one personal take
- end with a question
- include only 1-2 links max

Use these curated items:
${JSON.stringify(state.curated, null, 2)}

Return in this exact format:

===WHATSAPP===
<text>

===LINKEDIN===
<text>
`;

  const res = await llm.invoke(prompt);
  const text = String(res.content ?? "");

  const waMatch = text.split("===WHATSAPP===")[1]?.split("===LINKEDIN===")[0]?.trim();
  const liMatch = text.split("===LINKEDIN===")[1]?.trim();

  return {
    whatsappText: waMatch && waMatch.length > 30 ? waMatch : formatWhatsAppFallback(state),
    linkedinDraft: liMatch ?? ""
  };
}