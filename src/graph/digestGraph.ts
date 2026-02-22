import { Annotation, StateGraph } from "@langchain/langgraph";
import type { CuratedItem, RawArticle } from "../types/state.js";

import { fetchNewsNode } from "../nodes/fetchNews.js";
import { curateNewsNode } from "../nodes/curateNews.js";
import { writeDigestNode } from "../nodes/writeDigest.js";
import { sendWhatsAppNode } from "../nodes/sendWhatsApp.js";
import { saveOutputNode } from "../nodes/saveOutput.js";

const DigestStateAnnotation = Annotation.Root({
  niche: Annotation<string>(),
  writingStyle: Annotation<string>(),
  articles: Annotation<RawArticle[]>(),
  curated: Annotation<CuratedItem[]>(),
  whatsappText: Annotation<string>(),
  linkedinDraft: Annotation<string>(),
  runId: Annotation<string>(),
  errors: Annotation<string[]>()
});

export function buildDigestGraph() {
  const graph = new StateGraph(DigestStateAnnotation)
    .addNode("fetch", fetchNewsNode)
    .addNode("curate", curateNewsNode)
    .addNode("write", writeDigestNode)
    .addNode("send_whatsapp", sendWhatsAppNode)
    .addNode("save", saveOutputNode)
    .addEdge("__start__", "fetch")
    .addEdge("fetch", "curate")
    .addEdge("curate", "write")
    .addEdge("write", "send_whatsapp")
    .addEdge("send_whatsapp", "save")
    .addEdge("save", "__end__");

  return graph.compile();
}