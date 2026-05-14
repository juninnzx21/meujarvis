import axios from "axios";
import { env } from "../config/env.js";
import { writeSystemLog } from "./systemLogService.js";
import { redactSensitive } from "../utils/redact.js";

export const n8nService = {
  configured: Boolean(env.N8N_WEBHOOK_URL),
  status() {
    return { configured: this.configured, status: this.configured ? "configured" : "not_configured", webhookConfigured: Boolean(env.N8N_WEBHOOK_URL) };
  },
  async trigger(payload: unknown, userId?: string) {
    if (!this.configured) {
      await writeSystemLog({ userId, level: "warning", module: "n8n", action: "trigger", message: "n8n nao configurado" });
      return { status: "not_configured", message: "N8N_WEBHOOK_URL nao configurado." };
    }
    try {
      const response = await axios.post(env.N8N_WEBHOOK_URL, payload, {
        headers: env.N8N_API_KEY ? { Authorization: `Bearer ${env.N8N_API_KEY}` } : undefined,
        timeout: 15000
      });
      await writeSystemLog({ userId, module: "n8n", action: "trigger", message: "Webhook n8n acionado", metadata: { request: redactSensitive(payload), response: { status: response.status, data: redactSensitive(response.data) } } as never });
      return { status: "success", data: response.data };
    } catch (error) {
      await writeSystemLog({ userId, level: "error", module: "n8n", action: "trigger", message: "Erro ao acionar n8n" });
      throw error;
    }
  },
  async test(userId?: string) {
    return this.trigger({ source: "jarvis", type: "safe_test", timestamp: new Date().toISOString() }, userId);
  }
};
