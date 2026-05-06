const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini";

function buildSystemPrompt() {
  return [
    "You are an American Express-style premium concierge assistant.",
    "Be concise, practical, and action-oriented.",
    "Focus on: travel planning, reward points redemption, premium dining, lounge/airport services.",
    "Never claim actions are completed unless explicitly confirmed.",
    "If details are missing, ask one short clarifying question."
  ].join(" ");
}

export function isOpenRouterEnabled() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function generateConciergeReply({ topic, userName = "Customer" }) {
  if (!isOpenRouterEnabled()) return null;

  const body = {
    model: DEFAULT_MODEL,
    temperature: 0.4,
    max_tokens: 180,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: `User: ${userName}\nRequest: ${String(topic || "").trim() || "Help me with premium concierge services."}`
      }
    ]
  };

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
      "X-Title": process.env.OPENROUTER_APP_NAME || "CORE-X Concierge"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`OpenRouter request failed: ${raw || response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

