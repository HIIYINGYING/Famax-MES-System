import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

function openRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");
  return createOpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1", headers: { "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000", "X-Title": "FAMAX MES" } });
}

export async function askMesAssistant(prompt: string) {
  if (!prompt.trim()) throw new Error("A non-empty prompt is required.");
  const provider = openRouter();
  const response = await generateText({ model: provider(process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini"), system: "You are the FAMAX manufacturing operations assistant. Give concise, practical guidance. Never claim to have changed production records.", prompt: prompt.slice(0, 8000), maxOutputTokens: 700 });
  return response.text;
}
