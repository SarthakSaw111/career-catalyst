import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;
let model = null;
let chatSessions = {};

const rateLimiter = {
  calls: [],
  maxPerMinute: 14,
  dailyCalls: 0,
  lastReset: new Date().toDateString(),
};

export function initGemini(apiKey) {
  if (!apiKey) return false;
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    chatSessions = {};
    return true;
  } catch (err) {
    console.error("Failed to init Gemini:", err);
    return false;
  }
}

export function isGeminiReady() {
  return model !== null;
}

function checkRateLimit() {
  const now = Date.now();
  const today = new Date().toDateString();
  if (rateLimiter.lastReset !== today) {
    rateLimiter.dailyCalls = 0;
    rateLimiter.lastReset = today;
  }
  rateLimiter.calls = rateLimiter.calls.filter((t) => now - t < 60000);
  if (rateLimiter.calls.length >= rateLimiter.maxPerMinute) {
    throw new Error("Rate limit reached. Wait a moment and try again.");
  }
  rateLimiter.calls.push(now);
  rateLimiter.dailyCalls++;
}

// Single prompt (no chat history)
export async function sendPrompt(systemPrompt, userMessage, options = {}) {
  if (!model)
    throw new Error("Gemini not initialized. Add your API key in Settings.");
  checkRateLimit();

  try {
    const fullPrompt = `${systemPrompt}\n\n---\n\nUser: ${userMessage}`;
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    });
    return result.response.text();
  } catch (err) {
    console.error("Gemini API error:", err);
    throw new Error(`AI error: ${err.message}`);
  }
}

// Multi-turn chat session
export function getChatSession(sessionId, systemPrompt) {
  if (!model)
    throw new Error("Gemini not initialized. Add your API key in Settings.");

  if (!chatSessions[sessionId]) {
    chatSessions[sessionId] = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `System Instructions: ${systemPrompt}\n\nAcknowledge understanding and wait for my first message.`,
            },
          ],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I'm ready. Go ahead." }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });
  }
  return chatSessions[sessionId];
}

export async function sendChatMessage(sessionId, systemPrompt, message) {
  checkRateLimit();
  try {
    const chat = getChatSession(sessionId, systemPrompt);
    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (err) {
    console.error("Chat error:", err);
    throw new Error(`AI error: ${err.message}`);
  }
}

export function resetChatSession(sessionId) {
  delete chatSessions[sessionId];
}

// JSON response helper
export async function sendPromptJSON(systemPrompt, userMessage, options = {}) {
  const response = await sendPrompt(
    systemPrompt +
      "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown code blocks, no explanation before or after.",
    userMessage,
    options,
  );

  // Try to extract JSON from response
  let cleaned = response.trim();
  // Remove markdown code blocks if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    console.warn("Failed to parse AI JSON, raw:", response);
    throw new Error("AI returned invalid JSON. Try again.");
  }
}
