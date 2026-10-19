import { getAiProviderConfig } from "./aiProviderConfigService.js";
import { getNvidiaZeroSpendStatus, recordNvidiaZeroSpendBlock } from "./nvidiaBillingPolicyService.js";

export const NVIDIA_CHAT_COMPLETIONS_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
export const NVIDIA_CHAT_MODELS = [
  "deepseek-ai/deepseek-v4-flash",
  "deepseek-ai/deepseek-v4-flash-0731",
  "deepseek-ai/deepseek-v4-pro",
  "google/codegemma-7b",
  "google/gemma-7b",
  "meta/llama2-70b",
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.1-70b-instruct",
  "meta/llama-3.2-1b-instruct",
  "meta/llama-3.2-3b-instruct",
  "meta/llama-3.3-70b-instruct",
  "microsoft/phi-4-mini-instruct",
  "microsoft/phi-4-mini-flash-reasoning",
  "minimaxai/minimax-m2.5",
  "minimaxai/minimax-m2.7",
  "mistralai/mistral-nemotron",
  "mistralai/mixtral-8x7b-instruct",
  "mistralai/mixtral-8x22b-instruct",
  "moonshotai/kimi-k2-instruct",
  "moonshotai/kimi-k2-thinking",
  "moonshotai/kimi-k3",
  "nvidia/llama-3.3-nemotron-super-49b-v1.5",
  "nvidia/nemotron-3.5-lightning-30b-a3b",
  "nvidia/nemotron-3-nano-30b-a3b",
  "nvidia/nemotron-3-super-120b-a12b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3-next-80b-a3b-instruct",
  "qwen/qwen3-next-80b-a3b-thinking",
  "qwen/qwen2.5-coder-32b-instruct",
  "qwen/qwq-32b",
  "sarvamai/sarvam-m",
  "stepfun-ai/step-3.5-flash",
  "stockmark/stockmark-2-100b-instruct",
  "thinking-machines/inkling",
  "upstage/solar-10.7b-instruct",
  "z-ai/glm4.7",
  "z-ai/glm5.1",
  "z-ai/glm5.2",
  "z-ai/glm-5.3",
  "z-ai/glm-5.3-flash"
] as const;
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export const nvidiaAiService = {
  async statusForUser(userId: string) {
    const config = await getAiProviderConfig("nvidia", userId, { allowEnvironmentFallback: false });
    const billing = await getNvidiaZeroSpendStatus(userId);
    return { configured: config.configured, keyConfigured: config.configured, source: config.source, model: config.model, status: config.configured ? billing.status : "not_configured", billing, endpoint: NVIDIA_CHAT_COMPLETIONS_URL, capabilities: { streaming: false, tools: false, conversationHistory: true }, inferenceEnabled: false };
  },
  async listModelsForUser(userId: string) {
    const config = await getAiProviderConfig("nvidia", userId, { allowEnvironmentFallback: false });
    return { status: config.configured ? "success" : "not_configured", models: [...NVIDIA_CHAT_MODELS], inferenceEnabled: false, message: config.configured ? "Catálogo estático curado da documentação NVIDIA; nenhuma chamada foi feita. Inferência bloqueada pela política NVIDIA_ZERO_SPEND até comprovar quota, preço e entitlement sem cobrança." : "Configure a chave NVIDIA no painel. A inferência permanecerá bloqueada até comprovação de cobrança zero." };
  },
  async testConnection(userId: string) {
    const config = await getAiProviderConfig("nvidia", userId, { allowEnvironmentFallback: false });
    if (!config.apiKey) return { status: "not_configured", message: "Configure a API key NVIDIA no painel." };
    await recordNvidiaZeroSpendBlock(userId, "llm", config.model);
    return { status: "billing_unverified_blocked", message: "Teste não enviado: orçamento autorizado é R$ 0,00 e não há prova confiável de quota, preço e entitlement sem cobrança.", inferenceEnabled: false };
  },
  async complete(messages: ChatMessage[], userId?: string, options: { maxTokens?: number } = {}) {
    void messages;
    void options;
    const config = await getAiProviderConfig("nvidia", userId, { allowEnvironmentFallback: false });
    if (config.apiKey && config.model) await recordNvidiaZeroSpendBlock(userId, "llm", config.model);
    return null;
  }
};
