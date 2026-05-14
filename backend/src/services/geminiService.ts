import axios from "axios";
import { env } from "../config/env.js";
import { writeSystemLog } from "./systemLogService.js";

type GeminiStatus = "configured" | "missing_key" | "quota_exceeded" | "network_error" | "api_error";
let runtimeStatus: GeminiStatus = env.GEMINI_API_KEY ? "configured" : "missing_key";

function classifyGeminiError(error: unknown): GeminiStatus {
  const message = error instanceof Error ? error.message : String(error);
  if (/429|quota|billing|exceeded|RESOURCE_EXHAUSTED/i.test(message)) return "quota_exceeded";
  if (/network|timeout|ECONN|ENOTFOUND|fetch failed/i.test(message)) return "network_error";
  return "api_error";
}

function toGeminiPrompt(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
  return messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
}

export const geminiService = {
  get configured() {
    return Boolean(env.GEMINI_API_KEY);
  },
  status() {
    return {
      configured: Boolean(env.GEMINI_API_KEY),
      model: env.GEMINI_MODEL,
      status: runtimeStatus
    };
  },
  async complete(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
    if (!env.GEMINI_API_KEY) {
      runtimeStatus = "missing_key";
      return null;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`;
      const response = await axios.post(
        url,
        {
          contents: [
            {
              role: "user",
              parts: [{ text: toGeminiPrompt(messages) }]
            }
          ],
          generationConfig: { temperature: 0.4 }
        },
        {
          params: { key: env.GEMINI_API_KEY },
          timeout: 20000
        }
      );
      runtimeStatus = "configured";
      const text = response.data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
      return text || null;
    } catch (error) {
      runtimeStatus = classifyGeminiError(error);
      await writeSystemLog({
        level: "warning",
        module: "ai",
        action: "gemini_fallback_failed",
        message: "Gemini indisponivel; fallback local mantido.",
        metadata: { reason: runtimeStatus }
      });
      return null;
    }
  }
};
