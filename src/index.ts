import "dotenv/config";
import { buildDigestGraph } from "./graph/digestGraph.js";
import type { DigestState } from "./types/state.js";

function makeRunId() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}`;
}

async function main() {
  const niche = process.env.DIGEST_NICHE ?? "AI news";
  const writingStyle =
    process.env.WRITING_STYLE ??
    "direct, practical, slightly witty, no corporate tone, short punchy lines";

  const graph = buildDigestGraph();

  const init: DigestState = {
    niche,
    writingStyle,
    articles: [],
    curated: [],
    skimmedArticles: [],
    whatsappText: "",
    linkedinPosts: [],
    runId: makeRunId(),
    errors: []
  };

  const finalState = await graph.invoke(init);

  console.log("\n WhatsApp text:\n");
  console.log(finalState.whatsappText);

  console.log("\n LinkedIn post 1:\n");
  console.log(finalState.linkedinPosts?.[0] ?? "(none)");
  console.log("\n LinkedIn post 2:\n");
  console.log(finalState.linkedinPosts?.[1] ?? "(none)");

  console.log(`\nSaved: output/digest-${finalState.runId}.json\n`);
}

main().catch((e) => {
  console.error("Run failed:", e);
  process.exit(1);
});