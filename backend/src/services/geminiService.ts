import axios from "axios";
import { env } from "../config/env.js";
import { writeSystemLog } from "./systemLogService.js";

type GeminiStatus = "configured" | "missing_key" | "invalid_key" | "quota_exceeded" | "model_not_found" | "network_error" | "api_error";
let runtimeStatus: GeminiStatus = env.GEMINI_API_KEY ? "configured" : "missing_key";

function classifyGeminiError(error: unknown): GeminiStatus {
  const axiosLike = error as { response?: { status?: number; data?: unknown }; code?: string; message?: string };
  const message = error instanceof Error ? error.message : String(error);
  const responseData = typeof axiosLike.response?.data === "string" ? axiosLike.response.data : JSON.stringify(axiosLike.response?.data ?? {});
  const combined = `${axiosLike.response?.status ?? ""} ${axiosLike.code ?? ""} ${message} ${responseData}`;
  if (/401|403|API_KEY_INVALID|invalid.?api.?key|permission.?denied|unauthorized|forbidden/i.test(combined)) return "invalid_key";
  if (/429|quota|billing|exceeded|RESOURCE_EXHAUSTED/i.test(combined)) return "quota_exceeded";
  if (/404|model.?not.?found|not found|invalid.?model/i.test(combined)) return "model_not_found";
  if (/network|timeout|ECONN|ENOTFOUND|fetch failed/i.test(combined)) return "network_error";
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
