import axios from "axios";
import { prisma } from "../prisma/client.js";
import { redactSensitive } from "../utils/redact.js";
import { getHealth } from "./healthService.js";
import { assertNoSecretInResponse, integrationConfigService, publicIntegrationUrls, type IntegrationProvider } from "./integrationConfigService.js";
import { n8nService } from "./n8nService.js";
import { writeSystemLog } from "./systemLogService.js";
import { evolutionManagerService } from "../modules/whatsapp/evolutionManagerService.js";

export const setupProviders = [
  "api_public",
  "openai",
  "gemini",
  "n8n",
  "whatsapp",
  "evolution",
  "home_assistant",
  "finance",
  "documents",
  "monitoring",
  "backup",
  "mobile_pwa",
  "security"
] as const;

export type SetupProvider = typeof setupProviders[number];

type SetupStatus = "configured" | "not_configured" | "degraded" | "error" | "manual_action_required";

type SetupProviderState = {
  provider: SetupProvider;
  title: string;
  description: string;
  status: SetupStatus;
  configured: boolean;
  maskedFields: Record<string, unknown>;
  publicUrls: Record<string, string>;
  actions: string[];
  manualSteps: string[];
  lastTestAt: string | null;
  lastError: string | null;
  docsPath?: string;
  routePath?: string;
};

function now() {
  return new Date().toISOString();
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return String(redactSensitive(message));
}

function statusFrom(value: unknown): SetupStatus {
  const status = typeof value === "object" && value ? String((value as { status?: unknown }).status || "") : String(value || "");
  if (["configured", "success", "ok"].includes(status)) return "configured";
  if (["degraded", "partial"].includes(status)) return "degraded";
  if (["manual_action_required", "manual_import_required"].includes(status)) return "manual_action_required";
  if (["error", "api_error", "network_error", "invalid_key", "quota_exceeded", "model_not_found"].includes(status)) return "error";
  return "not_configured";
}

function providerBase(provider: SetupProvider, title: string, description: string): SetupProviderState {
  return {
    provider,
    title,
    description,
    status: "not_configured",
    configured: false,
    maskedFields: {},
    publicUrls: {},
    actions: ["test"],
    manualSteps: [],
    lastTestAt: null,
    lastError: null
  };
}

async function latestLog(userId: string, modules: string[]) {
  return prisma.systemLog.findFirst({
    where: { OR: [{ userId }, { userId: null }], module: { in: modules } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, level: true, message: true, metadata: true }
  });
}

async function healthCheck(url: string) {
  try {
    const response = await axios.get(url, { timeout: 15000, validateStatus: () => true });
    return { status: response.status >= 200 && response.status < 300 ? "configured" : "error", httpStatus: response.status };
  } catch (error) {
    return { status: "error", error: safeError(error) };
  }
}

async function buildProvider(userId: string, provider: SetupProvider, statusData: Awaited<ReturnType<typeof integrationConfigService.status>>): Promise<SetupProviderState> {
  const providers = statusData.providers as Record<string, any>;
  const urls = statusData.urls;
  if (provider === "api_public") {
    return {
      ...providerBase(provider, "API publica", "URLs oficiais, health checks e webhooks publicos do JARVIS."),
      status: "configured",
      configured: true,
      publicUrls: {
        frontend: urls.frontendPublicUrl,
        api: urls.apiPublicUrl,
        health: `${urls.apiPublicUrl}/health`,
        publicHealth: urls.publicHealthUrl,
        fullHealth: urls.fullHealthUrl,
        whatsappWebhook: urls.whatsappWebhookUrl
      },
      actions: ["save", "test", "copy_urls", "open_frontend"],
      manualSteps: ["Nao use /api no dominio jarvis como contrato publico; a API oficial e apijarvis."],
      docsPath: "DEPLOYMENT_PRODUCTION.md",
      routePath: "/status"
    };
  }
  if (provider === "openai" || provider === "gemini") {
    const data = providers[provider] || {};
    return {
      ...providerBase(provider, provider === "openai" ? "OpenAI" : "Gemini", "Diagnostico de IA, modelo e fallback sem expor chave."),
      status: statusFrom(data),
      configured: Boolean(data.configured),
      maskedFields: { model: data.model || "", keyConfigured: Boolean(data.configured) },
      actions: ["test"],
      manualSteps: ["Chaves de IA devem ficar em .env/secret manager da VPS; o painel mostra somente status e diagnostico."],
      lastError: data.lastError || null,
      docsPath: "INTEGRATIONS_SETUP.md"
    };
  }
  if (provider === "n8n") {
    const data = providers.n8n || {};
    return {
      ...providerBase(provider, "n8n", "Automacoes, workflows importaveis, webhooks e monitoramento."),
      status: statusFrom(data),
      configured: Boolean(data.configured),
      maskedFields: {
        enabled: Boolean(data.enabled),
        webhookConfigured: Boolean(data.webhookConfigured),
        apiKeyConfigured: Boolean(data.apiKeyConfigured),
        webhookSecretConfigured: Boolean(data.webhookSecretConfigured)
      },
      publicUrls: { n8n: urls.n8nPublicUrl },
      actions: ["save", "test", "bootstrap", "import_workflows", "open_n8n", "copy_caddy"],
      manualSteps: [
        "O que faz: conecta o JARVIS ao n8n para disparar workflows quando houver alerta, tarefa, backup, rotina, financeiro ou WhatsApp.",
        "Como configurar: informe a URL publica do n8n, API key/token e webhook secret quando existirem; depois clique em Salvar e Testar.",
        "Workflows: use Configurar auto para importar os workflows padrao; se a API do n8n nao permitir, importe os JSONs de n8n/workflows pelo editor.",
        "Producao: Caddy deve apontar n8njarvis.juninnzxtec.com.br para 127.0.0.1:15678.",
        "Como validar: o status deve sair de not_configured e o teste do workflow health-monitor deve responder sem expor segredo."
      ],
      docsPath: "N8N_LOCAL_PRODUCTION.md",
      routePath: "/n8n"
    };
  }
  if (provider === "whatsapp" || provider === "evolution") {
    const data = providers.whatsapp || {};
    const evolutionState = provider === "evolution" ? await evolutionManagerService.getSafeStatus(userId) : null;
    const state = evolutionState?.connectionState || data.connectionState || "unknown";
    return {
      ...providerBase(provider, provider === "whatsapp" ? "WhatsApp" : "Evolution API", "Conexao WhatsApp por QR, webhook e comandos seguros com wake phrase."),
      status: statusFrom(evolutionState?.status || data),
      configured: Boolean(data.configured),
      maskedFields: {
        apiUrlConfigured: Boolean(data.apiUrlConfigured),
        apiKeyConfigured: Boolean(data.apiKeyConfigured),
        instanceConfigured: Boolean(data.instanceConfigured),
        instance: data.instance || "",
        connectionState: state,
        autoReply: Boolean(data.autoReply),
        wakePhraseRequired: true,
        wakePhrase: "ei jarvis"
      },
      publicUrls: { webhook: urls.whatsappWebhookUrl },
      actions: ["save", "test", "create_instance", "generate_qr", "poll_status", "configure_webhook", "mock_message", "mock_ofx_csv"],
      manualSteps: [
        "O que faz: conecta seu numero ao JARVIS para receber mensagens, arquivos e comandos seguros pelo WhatsApp.",
        "Como configurar: preencha Evolution API URL, instancia e API key; clique em Salvar, Testar e depois gere o QR Code para escanear.",
        "Webhook: clique em Configurar auto; se retornar manual_action_required, cole a URL oficial no manager da Evolution.",
        "Teste real obrigatorio: envie no WhatsApp exatamente 'ei jarvis status do sistema'.",
        "Seguranca: sem 'ei jarvis' o JARVIS nao deve executar nada; fromMe e grupos sao ignorados por padrao.",
        "Extratos: OFX/CSV enviado por WhatsApp cria previa em /finance/import/:id/review e nunca importa direto."
      ],
      docsPath: "WHATSAPP_PRODUCTION_SETUP.md",
      routePath: "/whatsapp"
    };
  }
  if (provider === "home_assistant") {
    const data = providers.home_assistant || {};
    return {
      ...providerBase(provider, "Home Assistant", "Controle seguro de casa inteligente com confirmacao para acoes sensiveis."),
      status: statusFrom(data),
      configured: Boolean(data.configured),
      maskedFields: { urlConfigured: Boolean(data.urlConfigured), tokenConfigured: Boolean(data.tokenConfigured) },
      actions: ["save", "test", "list_entities", "safe_light_test"],
      manualSteps: [
        "O que faz: permite controlar e consultar dispositivos da casa pelo JARVIS com limites de seguranca.",
        "Como configurar: gere um Long-Lived Access Token no Home Assistant, informe a URL e salve o token pelo painel.",
        "Como validar: clique em Testar e depois listar entidades; luzes e switches simples podem ser testados com confirmacao.",
        "Seguranca: lock, alarm, cover, garagem e portao exigem confirmacao explicita; token nunca volta ao frontend."
      ],
      docsPath: "INTEGRATIONS_SETUP.md",
      routePath: "/smart-home"
    };
  }
  if (provider === "finance") {
    const data = providers.finance || {};
    return {
      ...providerBase(provider, "Financeiro", "Contas, categorias, regras, importacao OFX/CSV e revisao obrigatoria."),
      status: data.requireImportReview ? "configured" : "degraded",
      configured: true,
      maskedFields: {
        defaultAccountName: data.defaultAccountName || "PJ DO INTER",
        pendingImports: data.pendingImports ?? 0,
        pendingReviewRows: data.pendingReviewRows ?? 0,
        requireImportReview: true,
        externalAiCategorization: false
      },
      actions: ["test", "create_default_categories", "open_pending_imports", "test_ofx_mock"],
      manualSteps: [
        "O que faz: organiza contas, categorias, entradas, saidas, regras e importacao de extratos.",
        "Como configurar: defina a conta padrao, categoria fallback e mantenha revisao obrigatoria ligada.",
        "Como validar OFX/CSV: envie ou suba um arquivo seguro e confira se ele cria uma previa em /finance/import/:id/review.",
        "Regra obrigatoria: nunca importe extrato direto; aprove as linhas na tela de revisao antes de gravar transacoes.",
        "Privacidade: extratos financeiros nao sao enviados para IA externa por padrao."
      ],
      docsPath: "FINANCE_IMPORT_GUIDE.md",
      routePath: "/finance"
    };
  }
  if (provider === "documents") {
    const count = await prisma.document.count({ where: { userId } });
    return {
      ...providerBase(provider, "Documentos / RAG", "Upload seguro, busca textual e estrutura preparada para embeddings."),
      status: "configured",
      configured: true,
      maskedFields: { documents: count, storageIgnored: true, externalAiForSensitiveDocs: false, embeddings: "fallback_textual" },
      actions: ["test_upload_fake", "test_search", "open_documents"],
      manualSteps: ["Embeddings externos/pgvector exigem configuracao explicita e consentimento para documentos sensiveis."],
      docsPath: "DOCUMENTS_RAG_GUIDE.md",
      routePath: "/documents"
    };
  }
  if (provider === "monitoring") {
    return {
      ...providerBase(provider, "Monitoramento", "Health publico, health full, n8n monitor e alertas externos."),
      status: "configured",
      configured: true,
      publicUrls: { publicHealth: urls.publicHealthUrl, fullHealth: urls.fullHealthUrl },
      actions: ["test", "copy_health_urls", "bootstrap_n8n_health_monitor"],
      manualSteps: [
        "O que faz: acompanha app, banco, scheduler e integracoes para descobrir falhas cedo.",
        "Como configurar: use /api/health/public em Uptime Kuma, Better Stack ou Healthchecks.",
        "Como validar: health/public deve retornar apenas app, database, scheduler e timestamp, sem detalhes sensiveis.",
        "Scheduler: erros antigos no historico devem ser revisados em Logs filtrando modulo scheduler e acao *_error."
      ],
      docsPath: "MONITORING_SETUP.md",
      routePath: "/status"
    };
  }
  if (provider === "backup") {
    const log = await latestLog(userId, ["backup"]);
    return {
      ...providerBase(provider, "Backup / offsite", "Backup local, checklist offsite e politica de retencao."),
      status: "configured",
      configured: true,
      maskedFields: { localConfigured: true, offsiteConfigured: false, lastBackupAt: log?.createdAt ?? null },
      actions: ["run_local_backup_manual", "copy_retention_policy"],
      manualSteps: [
        "O que faz: protege o banco e arquivos operacionais contra perda local.",
        "Como configurar local: use backup-jarvis.ps1 e confira se o arquivo foi criado em backups/.",
        "Como configurar offsite: escolha rclone, S3 compativel, Google Drive ou outra VPS com backup criptografado.",
        "Retencao sugerida: diario por 7 dias, semanal por 4 semanas e mensal por 6 meses.",
        "Seguranca: restore exige confirmacao RESTORE e nunca deve rodar em producao sem backup validado."
      ],
      docsPath: "OFFSITE_BACKUP_PLAN.md"
    };
  }
  if (provider === "mobile_pwa") {
    return {
      ...providerBase(provider, "Mobile / PWA", "PWA instalavel, atalhos e assistente mobile sem escuta continua."),
      status: "configured",
      configured: true,
      publicUrls: { mobileAssistant: `${urls.frontendPublicUrl}/mobile-assistant` },
      actions: ["open_mobile_assistant", "copy_install_steps"],
      manualSteps: ["No Android, abrir no Chrome e tocar em Instalar app/Adicionar a tela inicial."],
      docsPath: "MOBILE_PWA_GUIDE.md",
      routePath: "/mobile-assistant"
    };
  }
  const gitIgnoreChecks = [".env", "backend/.env", "backups/", "backend/storage/imports/", "backend/storage/documents/", "n8n/data/"];
  return {
    ...providerBase(provider, "Seguranca / hardening", "Checks de segredos, storage ignorado, redaction e confirmacoes sensiveis."),
    status: "configured",
    configured: true,
    maskedFields: { gitIgnoreChecks, whatsappWakePhrase: "ei jarvis", requireImportReview: true },
    actions: ["copy_security_checklist", "run_secret_scan_manual"],
    manualSteps: [
      "O que faz: reduz risco de vazamento, invasao e automacoes perigosas.",
      "Rotacao: troque senhas e tokens que ja foram compartilhados fora de vault/gerenciador.",
      "SSH: use chave SSH, desabilite login por senha quando estiver seguro e revise firewall.",
      "Portas: mantenha Postgres, n8n e backend presos em 127.0.0.1; Caddy deve ser a entrada publica.",
      "Git: .env, backups, imports, documents, n8n/data, node_modules e dist devem continuar ignorados."
    ],
    docsPath: "SECURITY_CHECKLIST.md"
  };
}

export const integrationSetupService = {
  async list(userId: string) {
    const statusData = await integrationConfigService.status(userId);
    const steps = await Promise.all(setupProviders.map((provider) => buildProvider(userId, provider, statusData)));
    return assertNoSecretInResponse({ steps });
  },
  async get(userId: string, provider: SetupProvider) {
    const statusData = await integrationConfigService.status(userId);
    return buildProvider(userId, provider, statusData);
  },
  async summary(userId: string) {
    const { steps } = await this.list(userId);
    const counts = steps.reduce<Record<string, number>>((acc, step) => {
      acc[step.status] = (acc[step.status] || 0) + 1;
      return acc;
    }, {});
    return { status: counts.error ? "error" : counts.not_configured || counts.manual_action_required ? "degraded" : "configured", counts, providers: steps };
  },
  async save(userId: string, provider: SetupProvider, input: Record<string, unknown>) {
    if (["api_public", "n8n", "whatsapp", "evolution", "home_assistant", "finance", "monitoring", "backup"].includes(provider)) {
      const target = provider === "evolution" ? "whatsapp" : provider;
      await integrationConfigService.saveProvider(userId, target as IntegrationProvider, input);
      await writeSystemLog({ userId, module: "integrations", action: "setup_save", message: "Configuracao salva pelo assistente universal", metadata: { provider } });
      return this.get(userId, provider);
    }
    return { ...(await this.get(userId, provider)), status: "manual_action_required", manualSteps: ["Esta etapa e validada pelo JARVIS, mas nao possui credencial editavel no painel."] };
  },
  async test(userId: string, provider: SetupProvider) {
    if (provider === "api_public") return healthCheck(publicIntegrationUrls.publicHealthUrl);
    if (provider === "monitoring") {
      const health = await getHealth(false);
      return { status: health.app === "ok" && health.database === "ok" ? "configured" : "error", app: health.app, database: health.database, scheduler: health.scheduler.running ? "ok" : "error", timestamp: health.timestamp };
    }
    if (provider === "documents") return { status: "configured", message: "Modulo de documentos disponivel com fallback textual seguro." };
    if (provider === "backup") return { status: "manual_action_required", message: "Execute backup local pelo script backup-jarvis.ps1 ou pela rotina operacional." };
    if (provider === "mobile_pwa") return { status: "configured", manifest: "/manifest.webmanifest", serviceWorker: "/sw.js" };
    if (provider === "security") return { status: "configured", message: "Checklist de seguranca disponivel; rode varredura local antes de commits." };
    if (provider === "evolution") return evolutionManagerService.testConnection(userId);
    return integrationConfigService.testProvider(userId, provider as IntegrationProvider);
  },
  async bootstrap(userId: string, provider: SetupProvider) {
    if (provider === "evolution" || provider === "whatsapp") return evolutionManagerService.configureWebhook(userId, undefined);
    if (provider === "n8n") return n8nService.importAllWorkflows(userId);
    if (provider === "monitoring") return n8nService.testWorkflowName("jarvis-health-monitor", userId);
    return { status: "manual_action_required", message: "Bootstrap automatico nao disponivel para essa etapa.", manualSteps: (await this.get(userId, provider)).manualSteps };
  },
  async configureWebhook(userId: string, provider: SetupProvider) {
    if (provider === "evolution" || provider === "whatsapp") return evolutionManagerService.configureWebhook(userId, undefined);
    if (provider === "n8n") return n8nService.bootstrapWorkflows();
    return { status: "manual_action_required", message: "Essa integracao nao possui webhook automatico.", manualSteps: (await this.get(userId, provider)).manualSteps };
  },
  async resetSafe(userId: string, provider: SetupProvider, confirm?: string) {
    if (confirm !== "RESET_SAFE") return { status: "confirmation_required", message: "Envie confirm=RESET_SAFE para limpar apenas configuracoes seguras desta integracao." };
    if (provider === "n8n") return n8nService.clearConfig(userId);
    if (provider === "whatsapp" || provider === "evolution") return prisma.setting.deleteMany({ where: { userId, key: { startsWith: "whatsapp_" } } }).then(() => ({ status: "success" }));
    return { status: "manual_action_required", message: "Reset seguro nao disponivel para essa etapa." };
  },
  async wizard(userId: string) {
    const { steps } = await this.list(userId);
    return { steps, status: await integrationConfigService.status(userId) };
  }
};
