import type { DigestState } from "../types/state.js";
import { sendWhatsAppText } from "../tools/whatsapp.js";

export async function sendWhatsAppNode(state: DigestState): Promise<Partial<DigestState>> {
  if (!state.whatsappText?.trim()) {
    console.warn("⚠️ No WhatsApp text to send (whatsappText is empty).");
    return {};
  }
  const toRaw = process.env.WHATSAPP_TO_PHONE ?? "";
  const toDigits = toRaw.replace(/\D/g, "");
  const last4 = toDigits.slice(-4);
  console.log("📤 Sending digest to WhatsApp (to: ***" + last4 + ")...");
  await sendWhatsAppText(state.whatsappText);
  console.log("✅ Request accepted by WhatsApp API. If you don't see the message on your phone:");
  console.log("   • Recipient must have messaged your business number in the last 24 hours, OR");
  console.log("   • You must use an approved message template for first-time contact.");
  return {};
}