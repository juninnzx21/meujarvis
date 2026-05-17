export type BrainMode = "quick" | "normal" | "deep";
export type BrainSource = "chat" | "voice" | "whatsapp" | "mobile" | "automation";

export type BrainIntent =
  | "general.question"
  | "system.status"
  | "task.create"
  | "task.query"
  | "memory.query"
  | "memory.create"
  | "finance.query"
  | "finance.transaction.create"
  | "finance.statement.import"
  | "document.query"
  | "document.upload"
  | "code.help"
  | "codex.prompt"
  | "deploy.help"
  | "integration.configure"
  | "whatsapp.configure"
  | "n8n.workflow"
  | "home.action"
  | "business.proposal"
  | "learning.plan"
  | "feedback.learning"
  | "unknown";

export type BrainAgentName =
  | "GeneralAssistantAgent"
  | "DeveloperAgent"
  | "DevOpsAgent"
  | "FinanceAgent"
  | "BusinessAgent"
  | "PersonalMemoryAgent"
  | "DocumentsAgent"
  | "HomeAssistantAgent"
  | "WhatsAppAgent"
  | "N8nAutomationAgent"
  | "SecurityGuardianAgent"
  | "LearningCoachAgent";

export type BrainStatus = "ready" | "degraded" | "not_configured";

export type BrainAgentDefinition = {
  name: BrainAgentName;
  description: string;
  domains: string[];
  allowedTools: string[];
  safetyRules: string[];
  systemPrompt: string;
  examples: string[];
};

export type BrainToolDefinition = {
  name: string;
  description: string;
  safety: "safe" | "confirmation_required" | "forbidden";
  category: string;
};

export type IntentClassification = {
  intent: BrainIntent;
  confidence: number;
  domain: string;
  agent: BrainAgentName;
  reason: string;
};

export type BrainSourceItem = {
  type: "memory" | "document" | "system" | "finance" | "task" | "integration" | "feedback";
  title: string;
  excerpt: string;
  score?: number;
  id?: string;
};

export type BrainToolResult = {
  tool: string;
  status: "success" | "not_configured" | "confirmation_required" | "error" | "ignored";
  data?: unknown;
  message?: string;
};

export type BrainContext = {
  memories: BrainSourceItem[];
  documents: BrainSourceItem[];
  system: BrainSourceItem[];
  tasks: BrainSourceItem[];
  finance: BrainSourceItem[];
  integrations: BrainSourceItem[];
  feedback: BrainSourceItem[];
  sources: BrainSourceItem[];
};

export type BrainAskInput = {
  userId: string;
  message: string;
  source?: BrainSource;
  mode?: BrainMode;
  allowExternalAI?: boolean;
  allowTools?: boolean;
};

export type BrainAskResponse = {
  answer: string;
  reply: string;
  agent: BrainAgentName;
  intent: BrainIntent;
  confidence: number;
  usedTools: BrainToolResult[];
  usedSources: BrainSourceItem[];
  needsConfirmation: boolean;
  draftAction: unknown | null;
  suggestedNextActions: string[];
  mode: BrainMode;
};
