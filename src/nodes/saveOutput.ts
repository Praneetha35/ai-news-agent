import type { DigestState } from "../types/state.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export async function saveOutputNode(state: DigestState): Promise<Partial<DigestState>> {
  mkdirSync("output", { recursive: true });
  const file = join("output", `digest-${state.runId}.json`);

  writeFileSync(
    file,
    JSON.stringify(
      {
        runId: state.runId,
        niche: state.niche,
        writingStyle: state.writingStyle,
        curated: state.curated,
        whatsappText: state.whatsappText,
        linkedinDraft: state.linkedinDraft,
        errors: state.errors
      },
      null,
      2
    ),
    "utf-8"
  );

  return {};
}