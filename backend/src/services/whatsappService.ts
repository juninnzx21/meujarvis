import axios from "axios";
import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { writeSystemLog } from "./systemLogService.js";

export const whatsappService = {
  configured: Boolean(env.EVOLUTION_API_URL && env.EVOLUTION_API_KEY && env.EVOLUTION_INSTANCE),
  status() {
    return {
      configured: this.configured,
      autoReply: env.WHATSAPP_AUTO_REPLY,
      status: this.configured ? "configured" : "not_configured"
    };
  },
  isValidPhone(phone: string) {
    return /^\d{10,15}$/.test(phone);
  },
  async testConnection(userId?: string) {
    if (!this.configured) {
      await writeSystemLog({ userId, level: "warning", module: "whatsapp", action: "test_connection", message: "WhatsApp nao configurado" });
      return { status: "not_configured", message: "Evolution API nao configurada." };
    }
    const response = await axios.get(`${env.EVOLUTION_API_URL}/instance/connectionState/${env.EVOLUTION_INSTANCE}`, {
      headers: { apikey: env.EVOLUTION_API_KEY },
      timeout: 15000
    });
    await writeSystemLog({ userId, module: "whatsapp", action: "test_connection", message: "Conexao Evolution API testada", metadata: { status: response.status } });
    return { status: "success", data: response.data };
  },
  async send(phone: string, content: string, userId?: string) {
    if (!this.isValidPhone(phone)) return { status: "invalid_phone", message: "Numero deve conter apenas digitos, com DDI, entre 10 e 15 caracteres." };
    if (!this.configured) {
      await writeSystemLog({ userId, level: "warning", module: "whatsapp", action: "send", message: "WhatsApp nao configurado" });
      return { status: "not_configured", message: "Evolution API nao configurada." };
    }
    const payload = { number: phone, text: content };
    const url = `${env.EVOLUTION_API_URL}/message/sendText/${env.EVOLUTION_INSTANCE}`;
    const response = await axios.post(url, payload, {
      headers: { apikey: env.EVOLUTION_API_KEY },
      timeout: 15000
    });
    await prisma.whatsAppMessage.create({
      data: { userId, phone, content, direction: "outbound", status: "sent", rawPayload: response.data }
    });
    await writeSystemLog({ userId, module: "whatsapp", action: "send", message: "Mensagem WhatsApp enviada" });
    return { status: "success", data: response.data };
  }
};
