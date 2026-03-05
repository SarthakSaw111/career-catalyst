import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;
let currentModel = null;
let chatSessions = {};
let currentModelId = "gemini-2.5-flash";
let thinkingEnabled = true;
let thinkingBudget = 2048;

// ─── Token Usage Tracking ───
const tokenUsage = {
  sessionTotal: { prompt: 0, completion: 0, total: 0, thinking: 0 },
  calls: [], // last 50 calls
  listeners: new Set(),
};

function trackUsage(response) {
  const meta = response?.usageMetadata;
  if (!meta) return;
  const entry = {
    prompt: meta.promptTokenCount || 0,
    completion: meta.candidatesTokenCount || 0,
    total: meta.totalTokenCount || 0,
    thinking: meta.thoughtsTokenCount || 0,
    model: currentModelId,
    timestamp: Date.now(),
  };
  tokenUsage.sessionTotal.prompt += entry.prompt;
  tokenUsage.sessionTotal.completion += entry.completion;
  tokenUsage.sessionTotal.total += entry.total;
  tokenUsage.sessionTotal.thinking += entry.thinking;
  tokenUsage.calls.push(entry);
  if (tokenUsage.calls.length > 50) tokenUsage.calls.shift();
  // Notify listeners
  tokenUsage.listeners.forEach((fn) =>
    fn({ ...tokenUsage.sessionTotal, lastCall: entry }),
  );
}

export function getTokenUsage() {
  return { ...tokenUsage.sessionTotal, calls: [...tokenUsage.calls] };
}

export function onTokenUsageUpdate(callback) {
  tokenUsage.listeners.add(callback);
  return () => tokenUsage.listeners.delete(callback);
}

export const AVAILABLE_MODELS = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    supportsThinking: true,
    description: "Fast + smart (recommended)",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    supportsThinking: true,
    description: "Most capable, slower",
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    supportsThinking: false,
    description: "Very fast, no thinking",
  },
  {
    id: "gemini-2.5-flash-lite-preview-06-17",
    label: "Gemini 2.5 Flash Lite",
    supportsThinking: true,
    description: "Lightest, cheapest",
  },
];

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
    currentModel = genAI.getGenerativeModel({ model: currentModelId });
    chatSessions = {};
    return true;
  } catch (err) {
    console.error("Failed to init Gemini:", err);
    return false;
  }
}

export function setModel(modelId) {
  if (!genAI) return;
  currentModelId = modelId;
  currentModel = genAI.getGenerativeModel({ model: modelId });
  // Clear chat sessions when model changes
  chatSessions = {};
}

export function getModelId() {
  return currentModelId;
}

export function setThinking(enabled, budget = 2048) {
  thinkingEnabled = enabled;
  thinkingBudget = budget;
}

export function getThinkingConfig() {
  return { enabled: thinkingEnabled, budget: thinkingBudget };
}

export function isGeminiReady() {
  return currentModel !== null;
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

function buildGenerationConfig(options = {}) {
  const config = {
    temperature: options.temperature ?? 0.7,
    // maxOutputTokens: options.maxTokens ?? 2048,
  };

  // Add thinking config for models that support it
  const modelInfo = AVAILABLE_MODELS.find((m) => m.id === currentModelId);
  if (modelInfo?.supportsThinking && thinkingEnabled) {
    config.thinkingConfig = { thinkingBudget: thinkingBudget };
  } else if (modelInfo?.supportsThinking && !thinkingEnabled) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }

  return config;
}

// Single prompt (no chat history)
export async function sendPrompt(systemPrompt, userMessage, options = {}) {
  if (!currentModel)
    throw new Error("Gemini not initialized. Add your API key in Settings.");
  checkRateLimit();

  try {
    const fullPrompt = `${systemPrompt}\n\n---\n\nUser: ${userMessage}`;
    const result = await currentModel.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: buildGenerationConfig(options),
    });
    trackUsage(result.response);
    return result.response.text();
  } catch (err) {
    console.error("Gemini API error:", err);
    throw new Error(`AI error: ${err.message}`);
  }
}

// Multi-turn chat session
export function getChatSession(sessionId, systemPrompt) {
  if (!currentModel)
    throw new Error("Gemini not initialized. Add your API key in Settings.");

  if (!chatSessions[sessionId]) {
    chatSessions[sessionId] = currentModel.startChat({
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
      generationConfig: buildGenerationConfig(),
    });
  }
  return chatSessions[sessionId];
}

export async function sendChatMessage(sessionId, systemPrompt, message) {
  checkRateLimit();
  try {
    const chat = getChatSession(sessionId, systemPrompt);
    const result = await chat.sendMessage(message);
    trackUsage(result.response);
    return result.response.text();
  } catch (err) {
    console.error("Chat error:", err);
    throw new Error(`AI error: ${err.message}`);
  }
}

export function resetChatSession(sessionId) {
  delete chatSessions[sessionId];
}

// Robust JSON extraction from AI response
function extractJSON(raw) {
  let text = raw.trim();

  // Strategy 1: Remove markdown code fences
  text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```\s*$/i, "");

  try {
    return JSON.parse(text.trim());
  } catch {}

  // Strategy 2: Find first { to last }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  // Strategy 3: Find first [ to last ]
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(text.slice(firstBracket, lastBracket + 1));
    } catch {}
  }

  // Strategy 4: Try to fix common issues (trailing commas, single quotes)
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    let attempt = text.slice(firstBrace, lastBrace + 1);
    // Remove trailing commas before } or ]
    attempt = attempt.replace(/,\s*([}\]])/g, "$1");
    // Replace single quotes with double quotes (rough)
    attempt = attempt.replace(/'/g, '"');
    try {
      return JSON.parse(attempt);
    } catch {}
  }

  return null;
}

// JSON response helper with retries
export async function sendPromptJSON(systemPrompt, userMessage, options = {}) {
  const maxRetries = 2;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await sendPrompt(
        systemPrompt +
          "\n\nCRITICAL: Respond ONLY with valid JSON. No text before or after the JSON. No markdown code fences. Just the raw JSON object.",
        userMessage,
        {
          ...options,
          temperature: attempt === 0 ? (options.temperature ?? 0.7) : 0.3,
        },
      );

      const parsed = extractJSON(response);
      if (parsed !== null) return parsed;

      lastError = new Error("Could not extract valid JSON from response");
      console.warn(
        `JSON parse attempt ${attempt + 1} failed, raw:`,
        response.substring(0, 500),
      );
    } catch (err) {
      lastError = err;
      if (err.message.includes("Rate limit")) throw err;
    }
  }

  console.error("All JSON parse attempts failed:", lastError);
  throw new Error("AI returned invalid JSON after retries. Please try again.");
}
