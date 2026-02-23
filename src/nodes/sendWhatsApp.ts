import type { DigestState } from "../types/state.js";
import { sendWhatsAppText } from "../tools/whatsapp.js";

export async function sendWhatsAppNode(state: DigestState): Promise<Partial<DigestState>> {
  const posts = state.linkedinPosts?.filter((p) => p?.trim()) ?? [];
  const textToSend = posts.length > 0 ? posts.join("\n\n---\n\n") : state.whatsappText ?? "";

  if (!textToSend?.trim()) {
    console.warn(" No content to send (linkedinPosts and whatsappText are empty).");
    return {};
  }
  const toRaw = process.env.WHATSAPP_TO_PHONE ?? "";
  const toDigits = toRaw.replace(/\D/g, "");
  const last4 = toDigits.slice(-4);
  console.log(" Sending LinkedIn posts to WhatsApp (to: ***" + last4 + ")...");
  await sendWhatsAppText(textToSend);
  console.log(" Request accepted by WhatsApp API. If you don't see the message on your phone:");
  console.log("   • Recipient must have messaged your business number in the last 24 hours, OR");
  console.log("   • You must use an approved message template for first-time contact.");
  return {};
}