import axios from "axios";
import { env } from "../config/env.js";
import { isSensitiveHomeAction, sensitiveHomeDomains } from "../middlewares/security.js";
import { writeSystemLog } from "./systemLogService.js";

const headers = () => ({ Authorization: `Bearer ${env.HOME_ASSISTANT_TOKEN}`, "Content-Type": "application/json" });

export const homeAssistantService = {
  configured: Boolean(env.HOME_ASSISTANT_URL && env.HOME_ASSISTANT_TOKEN),
  status() {
    return { configured: this.configured, status: this.configured ? "configured" : "not_configured" };
  },
  requiresConfirmation(domain?: string) {
    return Boolean(domain && sensitiveHomeDomains.includes(domain));
  },
  async testConnection(userId?: string) {
    if (!this.configured) return { status: "not_configured", message: "Home Assistant nao configurado." };
    const response = await axios.get(`${env.HOME_ASSISTANT_URL}/api/`, { headers: headers(), timeout: 15000 });
    await writeSystemLog({ userId, module: "home-assistant", action: "test_connection", message: "Conexao Home Assistant testada", metadata: { status: response.status } });
    return { status: "success", data: response.data };
  },
  async entities() {
    if (!this.configured) return { status: "not_configured", entities: [] };
    const response = await axios.get(`${env.HOME_ASSISTANT_URL}/api/states`, { headers: headers(), timeout: 15000 });
    const entities = Array.isArray(response.data) ? response.data : [];
    const grouped = entities.reduce<Record<string, unknown[]>>((acc, entity: any) => {
      const domain = String(entity.entity_id ?? "").split(".")[0] || "other";
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(entity);
      return acc;
    }, {});
    return { status: "success", entities, grouped };
  },
  async callService(domain: string, service: string, data: Record<string, unknown>, userId?: string, confirmed = false) {
    if (!this.configured) return { status: "not_configured", message: "Home Assistant nao configurado." };
    if ((this.requiresConfirmation(domain) || isSensitiveHomeAction({ domain, service, data })) && !confirmed) {
      await writeSystemLog({ userId, level: "security", module: "home-assistant", action: "confirmation_required", message: "Acao sensivel bloqueada sem confirmacao" });
      return { status: "confirmation_required", message: "Essa acao e sensivel e exige confirmacao explicita." };
    }
    const response = await axios.post(`${env.HOME_ASSISTANT_URL}/api/services/${domain}/${service}`, data, { headers: headers(), timeout: 15000 });
    await writeSystemLog({ userId, module: "home-assistant", action: "call_service", message: `${domain}.${service} executado` });
    return { status: "success", data: response.data };
  },
  async setLight(entityId: string, action: "turn_on" | "turn_off", userId?: string) {
    if (!/^light\.[a-zA-Z0-9_]+$/.test(entityId)) return { status: "invalid_entity", message: "Use uma entidade light valida." };
    return this.callService("light", action, { entity_id: entityId }, userId, true);
  },
  async conversation(text: string) {
    if (!this.configured) return { status: "not_configured", message: "Home Assistant nao configurado." };
    const response = await axios.post(`${env.HOME_ASSISTANT_URL}/api/conversation/process`, { text }, { headers: headers(), timeout: 15000 });
    return { status: "success", data: response.data };
  }
};
