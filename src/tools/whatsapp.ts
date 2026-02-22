export async function sendWhatsAppText(bodyText: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const toRaw = process.env.WHATSAPP_TO_PHONE;

  if (!token) throw new Error("Missing WHATSAPP_TOKEN in .env");
  if (!phoneNumberId) throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID in .env");
  if (!toRaw) throw new Error("Missing WHATSAPP_TO_PHONE in .env");

  // WhatsApp Cloud API expects digits only (country code + number, no + or spaces)
  const to = toRaw.replace(/\D/g, "");

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: bodyText }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WhatsApp send failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as { messages?: Array<{ id: string }> };
  const messageId = data.messages?.[0]?.id;
  if (messageId) console.log("   Message ID:", messageId);

  return data;
}