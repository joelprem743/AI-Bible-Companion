import { GoogleGenAI, Chat } from "@google/genai";
import type { Message, ChatMode, VerseReference } from "../types";

// GLOBALS
let ai: GoogleGenAI;
let chatInstances = new Map<ChatMode, Chat>();

// CACHE (prevents repeat API calls)
const verseCache = new Map<string, string>();

// GLOBAL COOLDOWN FOR 429
let globalCooldownUntil = 0;

// ERROR CLASS
class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyError";
  }
}

// INIT
function getAiInstance() {
  if (!ai) {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) throw new ApiKeyError("API key missing.");
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

// GLOBAL AI WRAPPER (SAFE)
async function safeGenerate(model: string, prompt: string) {
  // 1. Check cooldown
  if (Date.now() < globalCooldownUntil) {
    const secs = Math.ceil((globalCooldownUntil - Date.now()) / 1000);
    throw new Error(`AI cooling down. Try again in ${secs}s.`);
  }

  try {
    const aiInstance = getAiInstance();
    const response = await aiInstance.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: "You are a concise biblical expert. Provide direct answers without filler."
      }
    });
    return response.text;
  } catch (err: any) {
    // 2. Handle quota errors
    if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED")) {
      globalCooldownUntil = Date.now() + 60000; // 1 min cool down
      throw new Error("AI is busy. Please wait 60 seconds and try again.");
    }
    throw err;
  }
}

// CHATBOT
export const sendMessageToBot = async (message: string, history: Message[], mode: ChatMode) => {
  try {
    if (mode === "gemini-2.5-flash") {
      const text = await safeGenerate("gemini-2.5-flash", message);
      return { text, sources: [] };
    }

    const chat = getChat(mode);
    const result = await chat.sendMessage({ message });
    return { text: result.text, sources: [] };
  } catch (err: any) {
    return { text: err.message || "AI error", sources: [] };
  }
};

function getChat(mode: ChatMode): Chat {
  if (!chatInstances.has(mode)) {
    const aiInstance = getAiInstance();
    const config = {};

    const newChat = aiInstance.chats.create({
      model: mode,
      config: {
        ...config,
        systemInstruction:
          "You are an expert Bible scholar. Be precise, deep, and context-rich."
      }
    });

    chatInstances.set(mode, newChat);
  }
  return chatInstances.get(mode)!;
}

// VERSE ANALYSIS (FLASH-LITE ONLY)
export const getVerseAnalysis = async (
  verseRef: VerseReference,
  analysisType: "Cross-references" | "Historical Context" | "Interlinear"
) => {
  const cacheKey = `${verseRef.book}-${verseRef.chapter}-${verseRef.verse}-${analysisType}`;

  // CACHE HIT
  if (verseCache.has(cacheKey)) {
    return verseCache.get(cacheKey)!;
  }

  let prompt = "";
  switch (analysisType) {
    case "Cross-references":
      prompt = `Provide key cross-references for ${verseRef.book} ${verseRef.chapter}:${verseRef.verse}. Group by theme.`;
      break;
    case "Historical Context":
      prompt = `Explain the historical and cultural context of ${verseRef.book} ${verseRef.chapter}:${verseRef.verse}.`;
      break;
    case "Interlinear":
      prompt = `Provide a detailed interlinear breakdown for ${verseRef.book} ${verseRef.chapter}:${verseRef.verse}.
      
Original Text (Greek/Hebrew):
Include full verse text in original language.

English Transliteration:
Clear transliteration.

Word-by-Word Analysis:
List each key word with transliteration and a simple definition.`;
      break;
  }

  const text = await safeGenerate("gemini-2.5-flash-lite", prompt);

  verseCache.set(cacheKey, text);
  return text;
};

// KEYWORD SEARCH
export const searchBibleByKeyword = async (keyword: string): Promise<string> => {
  const prompt = `Search the Bible for verses related to "${keyword}". 
Return ONLY a list like: John 3:16, Romans 8:28.`;

  try {
    return await safeGenerate("gemini-2.5-flash-lite", prompt);
  } catch (err: any) {
    console.error("Keyword search error:", err);
    return "";
  }
};
