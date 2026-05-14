export type ToolSafety = "safe" | "confirmation_required" | "forbidden";

export type JarvisToolDefinition = {
  name: string;
  description: string;
  safety: ToolSafety;
  requiredFields: string[];
};

export const jarvisTools: JarvisToolDefinition[] = [
  {
    name: "memory.create",
    description: "Cria uma memoria nao sensivel para o usuario.",
    safety: "safe",
    requiredFields: ["title", "content"]
  },
  {
    name: "task.create",
    description: "Cria uma tarefa ou lembrete para o usuario.",
    safety: "safe",
    requiredFields: ["title"]
  },
  {
    name: "health.check",
    description: "Consulta status do app, banco e integracoes.",
    safety: "safe",
    requiredFields: []
  },
  {
    name: "n8n.trigger",
    description: "Aciona um webhook n8n configurado.",
    safety: "safe",
    requiredFields: ["payload"]
  },
  {
    name: "whatsapp.send",
    description: "Envia mensagem WhatsApp para um numero informado.",
    safety: "confirmation_required",
    requiredFields: ["phone", "content"]
  },
  {
    name: "home_assistant.conversation",
    description: "Envia comando natural ao Home Assistant.",
    safety: "confirmation_required",
    requiredFields: ["text"]
  }
];

export function getToolDefinition(name: string) {
  return jarvisTools.find((tool) => tool.name === name);
}

export function listToolDefinitions() {
  return jarvisTools;
}
