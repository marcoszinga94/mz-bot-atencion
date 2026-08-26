import { getConfig } from "./config";
import type { ChatMessage } from "./types";

const API_URL = "https://opencode.ai/zen/v1/chat/completions";

export async function complete(messages: ChatMessage[]): Promise<string> {
  const config = getConfig();

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.zenApiKey}`,
    },
    body: JSON.stringify({
      model: config.zenModel,
      messages,
      temperature: 0.4,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    throw new Error(`Zen API respondió ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };

  return data.choices[0].message.content;
}