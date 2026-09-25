export async function sendWhatsAppOptInMessage(to: string, message: string, options: { optedIn: boolean }) {
  if (!options.optedIn) return { sent: false, reason: "recipient has not opted in" } as const;
  const { WHATSAPP_ACCESS_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: phoneId } = process.env;
  if (!token || !phoneId) return { sent: false, reason: "WhatsApp Cloud API is not configured" } as const;
  const response = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(phoneId)}/messages`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body: message.slice(0, 4096) } }), signal: AbortSignal.timeout(10_000) });
  const result = await response.json() as { messages?: { id: string }[]; error?: { message: string } };
  if (!response.ok) throw new Error(`WhatsApp delivery failed: ${result.error?.message ?? response.statusText}`);
  return { sent: true, id: result.messages?.[0]?.id } as const;
}
