import OpenAI from "openai";
import { env } from "../config/env.js";
import { geminiService } from "./geminiService.js";
import { writeSystemLog } from "./systemLogService.js";

type OpenAiStatus = "configured" | "missing_key" | "quota_exceeded" | "network_error" | "api_error";
type OpenAiClient = Pick<OpenAI, "chat" | "audio">;
let client: OpenAiClient | null = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
let runtimeStatus: OpenAiStatus = client ? "configured" : "missing_key";
let lastErrorMessage = "";
const fallbackReply = "Estou operando em modo seguro local porque a OpenAI nao respondeu agora. As funcoes internas de tarefas, memorias, status e automacoes seguras continuam disponiveis.";

function classifyOpenAiError(error: unknown): OpenAiStatus {
  const message = error instanceof Error ? error.message : String(error);
  if (/429|quota|billing|exceeded/i.test(message)) return "quota_exceeded";
  if (/network|timeout|ECONN|ENOTFOUND|fetch failed/i.test(message)) return "network_error";
  return "api_error";
}

export const openAiService = {
  get configured() {
    return Boolean(client);
  },
  status() {
    return {
      configured: Boolean(client),
      model: env.OPENAI_MODEL,
      status: runtimeStatus,
      lastError: lastErrorMessage ? "[REDACTED_DETAIL]" : "",
      fallbackProvider: geminiService.configured ? "gemini" : "local",
      gemini: geminiService.status()
    };
  },
  setClientForTests(mockClient: OpenAiClient | null) {
    if (env.NODE_ENV === "production") return;
    client = mockClient;
    runtimeStatus = mockClient ? "configured" : "missing_key";
    lastErrorMessage = "";
  },
  async transcribeAudio(input: { buffer: Buffer; filename?: string; mimeType?: string }) {
    if (!client) {
      runtimeStatus = "missing_key";
      return { status: "missing_key", text: "", message: "OpenAI nao configurada para transcricao de audio." };
    }
    try {
      const arrayBuffer = input.buffer.buffer.slice(input.buffer.byteOffset, input.buffer.byteOffset + input.buffer.byteLength) as ArrayBuffer;
      const file = new File([arrayBuffer], input.filename || "whatsapp-audio.ogg", {
        type: input.mimeType || "audio/ogg"
      });
      const transcription = await client.audio.transcriptions.create({
        file,
        model: "whisper-1",
        language: "pt"
      });
      runtimeStatus = "configured";
      lastErrorMessage = "";
      return { status: "success", text: transcription.text?.trim() || "" };
    } catch (error) {
      runtimeStatus = classifyOpenAiError(error);
      lastErrorMessage = error instanceof Error ? error.message : String(error);
      await writeSystemLog({
        level: "warning",
        module: "ai",
        action: "audio_transcription_failed",
        message: "Falha ao transcrever audio do WhatsApp.",
        metadata: { reason: runtimeStatus }
      });
      return { status: runtimeStatus, text: "", message: "Nao consegui transcrever o audio agora." };
    }
  },
  async complete(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
    if (!client) {
      runtimeStatus = "missing_key";
      const geminiReply = await geminiService.complete(messages);
      if (geminiReply) return geminiReply;
      return "Estou operando em modo local porque a chave da OpenAI nao esta configurada e o Gemini nao respondeu agora. Posso registrar tarefas, memorias e consultar status usando as regras internas.";
    }
    try {
      const completion = await client.chat.completions.create({
        model: env.OPENAI_MODEL,
        temperature: 0.4,
        messages
      });
      runtimeStatus = "configured";
      lastErrorMessage = "";
      return completion.choices[0]?.message?.content?.trim() || "Nao consegui gerar uma resposta agora.";
    } catch (error) {
      runtimeStatus = classifyOpenAiError(error);
      lastErrorMessage = error instanceof Error ? error.message : String(error);
      await writeSystemLog({
        level: "warning",
        module: "ai",
        action: "openai_fallback",
        message: geminiService.configured ? "OpenAI indisponivel; tentando fallback Gemini." : "OpenAI indisponivel; fallback local ativado.",
        metadata: { reason: runtimeStatus, fallbackProvider: geminiService.configured ? "gemini" : "local" }
      });
      const geminiReply = await geminiService.complete(messages);
      if (geminiReply) return geminiReply;
      return fallbackReply;
    }
  }
};
