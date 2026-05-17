# Arquitetura

## Visao geral

O sistema e dividido em frontend React/Vite e backend Express/TypeScript. O backend expoe API REST em `/api`, usa Prisma para persistencia em PostgreSQL e centraliza integracoes em servicos isolados.

## Mobile/PWA

O frontend tambem opera como PWA instalavel:

- `public/manifest.webmanifest`: nome, tema, orientacao portrait, icones e shortcuts.
- `public/sw.js`: service worker manual para cache seguro de assets estaticos.
- `public/offline.html`: fallback offline simples.
- `src/pwa/registerServiceWorker.ts`: registro progressivo do service worker fora do modo dev.
- `src/components/PwaInstallPrompt.tsx`: prompt de instalacao quando o navegador permite.
- `src/pages/MobileAssistant/MobileAssistantPage.tsx`: experiencia mobile focada em voz, texto rapido e atalhos.

O service worker nao cacheia `/api/*`, requisicoes com Authorization, cookies ou metodos diferentes de GET. O microfone e acionado somente por interacao explicita do usuario.

## Backend

- `src/app.ts`: Express, middlewares globais, rotas e erro global.
- `src/modules/*`: rotas por dominio.
- `src/services/*`: orquestracao, integracoes externas, memoria, health, logs e tool registry.
- `src/prisma/client.ts`: Prisma Client compartilhado.
- `src/middlewares/*`: auth JWT, validacao Zod, rate limit, seguranca e erros.

## Frontend

- `src/pages/*`: telas principais.
- `src/layouts`: layout autenticado com sidebar/header.
- `src/components`: componentes reutilizaveis.
- `src/services/api.ts`: cliente Axios.
- `src/contexts`: estado de autenticacao.

## Fluxo de chat

1. Frontend envia `POST /api/chat/send` com `content`.
2. Backend cria ou reutiliza uma conversa.
3. Mensagem do usuario e salva.
4. `AiOrchestratorService` detecta intencao por regras.
5. Acoes seguras podem executar diretamente.
6. Acoes sensiveis retornam confirmacao exigida.
7. Resposta do assistente e salva.

Tambem existe `/api/chat/stream`, que retorna eventos SSE com fallback de streaming. A estrutura esta pronta para streaming token a token futuro.

## Orquestracao de IA e tools

`intentDetectorService` classifica intencoes como chat normal, memoria, tarefa, health, n8n, WhatsApp e Home Assistant. `toolRegistryService` descreve tools com nivel de seguranca (`safe`, `confirmation_required`, `forbidden`) para evoluir para function calling real sem abrir brecha para acoes perigosas.

## OpenAI

`openAiService` usa OpenAI quando `OPENAI_API_KEY` existe. Se a API falhar por quota, rede ou credencial, o backend registra log e retorna fallback local seguro, sem derrubar chat ou voz.
O health full expoe somente status operacional e modelo, nunca a chave.

## Gemini fallback

`geminiService` e acionado automaticamente quando OpenAI esta sem chave ou falha. A ordem e: OpenAI, Gemini, fallback local seguro. O frontend recebe apenas status e modelo, nunca a API key.

## Memoria

`memorySearchService` faz busca relevante por termos normalizados e tags. Pgvector esta planejado para memoria semantica futura sem ser dependencia obrigatoria da versao atual.

## Voz

A pagina Voz usa Web Speech API quando disponivel, envia transcricao para `POST /api/voice/process`, le resposta com `SpeechSynthesis`, mostra historico local e aviso de privacidade. Nao existe escuta continua. Wake word "Ei Jarvis" fica apenas planejada.

## Integracoes

- n8n: `N8nService` envia payload para `N8N_WEBHOOK_URL`; sem URL retorna `not_configured`.
- n8n teste: `POST /api/n8n/test` envia payload seguro e grava logs redigidos.
- WhatsApp: `WhatsAppService` usa Evolution API, exige confirmacao para envio, valida telefone e nao faz disparo em massa.
- WhatsApp webhook: auto reply ignora mensagens do proprio JARVIS e grupos para reduzir risco de loop.
- Evolution manager: `modules/whatsapp/evolutionManagerService.ts` gerencia conexao pelo painel, normaliza QR Code/pairing code, normaliza estado de conexao, tenta endpoints alternativos da Evolution e retorna `manual_action_required` quando a versao nao suportar automacao.
- WhatsApp QR flow: `/api/whatsapp/evolution/*` expoe rotas admin protegidas para status, instancia, QR, polling de conexao, logout/restart e configuracao de webhook sem retornar API key real.
- Controle Financeiro: `FinanceIntegrationService` guarda URL/token por usuario em `Setting`, retorna token apenas mascarado, testa `/api/v1/me`, consulta `/api/v1/summary/month` e cria lancamentos em `/api/v1/transactions`.
- Controle Financeiro via WhatsApp: antes do orquestrador geral, o webhook tenta interpretar mensagens financeiras com entrada/saida e valor; se reconhecer, registra no sistema externo ou pede complemento sem expor segredo.
- Home Assistant: `HomeAssistantService` lista entidades agrupadas, chama servicos e conversa via `conversation.process`; dominios sensiveis exigem confirmacao.
- Home Assistant sensivel: `lock`, `alarm_control_panel`, `cover`, garagem, portao, abrir/destravar e termos similares exigem confirmacao.

## Seguranca

- JWT protege rotas privadas.
- Senhas usam bcrypt.
- Zod valida entradas.
- Helmet, CORS e rate limit protegem a API.
- Logger redige senha, hash, token, authorization, cookies e API keys.
- `writeSystemLog` tambem redige metadata antes de persistir no banco.
- Middleware global nao vaza stack em producao.
- Shell arbitrario, acoes destrutivas, spam e dispositivos criticos sem confirmacao sao bloqueados.

## Banco de dados

Modelos Prisma: User, Conversation, Message, Memory, Task, Automation, AutomationLog, SystemLog, Setting e WhatsAppMessage.

## Testes

- Backend: Vitest + Supertest cobre auth, health, chat, memoria, tarefas, automacoes, logs e fallbacks.
- Frontend: Vitest + Testing Library cobre componentes e base visual reutilizavel.

## Operacao local

Scripts PowerShell na raiz controlam ciclo local:

- `start-jarvis.ps1`: sobe PostgreSQL, aplica migrations deploy e inicia backend/frontend.
- `stop-jarvis.ps1`: encerra processos Node do projeto.
- `status-jarvis.ps1`: mostra containers, portas, health e frontend.
- `backup-jarvis.ps1`: gera `pg_dump` no diretorio `backups`.
- `restore-jarvis.ps1`: restaura backup apos confirmacao manual `RESTORE`.
- `validate-jarvis.ps1`: roda auditoria local completa.

## Observabilidade

`GET /api/health/full` retorna uptime, status do banco, status OpenAI/Gemini/n8n/WhatsApp/Home Assistant, contagem de logs e ultimas falhas. A tela `/status` consome esses dados sem expor segredos.

## Base de conhecimento pessoal

A base pessoal do JARVIS fica em `backend/prisma/personal-profile/profile-data.ts` e e importada por `backend/prisma/seed-personal-profile.ts`. O importador grava 47 memorias em `Memory` de forma idempotente usando `userId + title + type`, reconhece aliases de titulos antigos, atualiza o conteudo canonico, remove duplicatas equivalentes, bloqueia padroes sensiveis e registra `SystemLog` sem imprimir segredos. O backend nao importa esses arquivos em runtime de producao; nesta fase o uso oficial e via script `npm run seed:personal`.

As memorias cobrem identidade, stack, preferencias de resposta, validacao, prompts Codex, infraestrutura, JARVIS, n8n, WhatsApp/Evolution, financeiro, PWA/mobile, projetos comerciais, deploy e prioridades futuras. O chat consulta memorias relevantes pelo `aiOrchestratorService` antes de montar a resposta.

## Fase 5

- `commands`: central declarativa de comandos com safety e execucao auditada.
- `routines`: rotinas persistidas com `Routine` e `RoutineRun`.
- `reports`: relatorios de resumo diario, tarefas, sistema e atividade.
- `notifications`: notificacoes internas por usuario com leitura individual ou em massa.
- `tasks`: campo `reminderAt` e filtros para vencidas/hoje.
- `whatsapp`: comandos de IA preparam mensagem e exigem confirmacao antes de envio.
- `n8n`: templates padronizados para eventos operacionais.

## Fase 6

- `SchedulerService` inicializa com o backend quando `SCHEDULER_ENABLED=true`.
- Intervalo configuravel por `SCHEDULER_INTERVAL_SECONDS`.
- Rotinas agendadas usam `Routine.triggerType=schedule`, `Routine.config.schedule` e `Routine.lastRunAt`.
- Lembretes usam `Task.reminderAt` e `Task.reminderSentAt`.
- Alertas de vencimento usam `Task.dueDate` e `Task.overdueNotifiedAt`.
- Cada execucao segura cria `RoutineRun`, `SystemLog` e `Notification`.
- O scheduler bloqueia WhatsApp direto, Home Assistant sensivel, shell, envio em massa e acoes destrutivas.
- `/api/health/full` inclui status do scheduler para a tela `/status` e scripts operacionais.

## Fase 7 - Financeiro inteligente

- `financeLedgerService`: contas bancarias, categorias, regras, lancamentos, saldos, duplicatas e relatorios.
- `statementImportService`: upload seguro, armazenamento temporario em `backend/storage/imports`, parser CSV/OFX/TXT e revisao obrigatoria.
- `financialAssistantService`: fluxo multi-etapa para lancamentos financeiros via chat, com coleta de dados faltantes e confirmacao antes de salvar.
- Modelos Prisma: `BankAccount`, `FinancialCategory`, `FinancialTransaction`, `StatementImport`, `StatementImportRow`, `FinancialRule` e `AssistantDraftAction`.
- Frontend: `/finance`, `/finance/accounts`, `/finance/transactions`, `/finance/categories`, `/finance/import`, `/finance/import/:id/review` e `/finance/reports`.
- Segurança: extratos nao sao versionados, nao sao enviados para IA externa por padrao, logs recebem apenas metadados resumidos/redigidos e nenhuma importacao grava transacoes sem aprovacao.

## Hardening Fase 7

- `encryptionService`: criptografia AES-256-GCM para segredos salvos em `Setting`.
- Compatibilidade com legado: valores antigos em texto puro sao descriptografados como texto normal e passam a ser criptografados no proximo save.
- `ALLOW_DEMO_LOGIN=false`: bloqueia o usuario demo `admin@jarvis.local` em producao.
- `create:admin`: script operacional para criar/atualizar admin real sem registrar senha.
- `GET /api/health/public`: endpoint minimo para monitor externo sem detalhes sensiveis.
- API publica oficial: `https://apijarvis.juninnzxtec.com.br/api`.
## Importacao bancaria por WhatsApp

O fluxo financeiro usa parsers locais dedicados para OFX e CSV do Banco Inter PJ:

1. Evolution API envia o webhook para `POST /api/whatsapp/webhook`.
2. O backend detecta anexos `.ofx`, `.csv` ou `.txt`.
3. A midia e baixada em memoria e salva em `backend/storage/imports/whatsapp`, pasta ignorada pelo Git.
4. `statementImportService` chama `parseStatementContent`.
5. OFX e priorizado por conter `FITID`, `DTPOSTED`, `TRNAMT`, `TRNTYPE`, `MEMO`, conta e saldo.
6. CSV do Inter e lido a partir do cabecalho `Data Lancamento;Historico;Descricao;Valor;Saldo`.
7. O sistema cria `StatementImport` e `StatementImportRow`.
8. Duplicatas usam `FITID` ou hash deterministico.
9. A tela `/finance/import/:id/review` exibe resumo e exige aprovacao antes de criar `FinancialTransaction`.

O extrato bruto nunca deve ser enviado para OpenAI/Gemini sem consentimento explicito.

## Fase 10 - Plataforma 100000

- `n8n` local/producao: `docker-compose.yml` inclui `n8n`, `n8n-postgres` e volumes persistentes, com portas presas em `127.0.0.1` e variaveis obrigatorias em `.env.example`.
- Workflows n8n: a pasta `n8n/workflows/` contem templates importaveis para alertas, tarefas, backups, financeiro, WhatsApp, health monitor e Evolution API, sem credenciais reais.
- EventBus interno: `EventBusService` registra eventos em `IntegrationEvent`, cria `SystemLog`, pode criar `Notification` e tenta disparar n8n sem quebrar o JARVIS quando a integracao esta indisponivel.
- Memoria semantica preparada: `MemoryEmbedding` e `embeddingService` usam embedding local deterministico por padrao e mantem fallback textual.
- RAG/documentos: modulo `/api/documents` aceita upload seguro, cria `Document`/`DocumentChunk`, busca em conteudo redigido e mantem arquivos em `backend/storage/documents`, ignorado pelo Git.
- Frontend: novas telas/atalhos para `Documentos`, melhorias em `/n8n` e `/mobile-assistant`.
- Monitoramento: `/api/health/public` permanece como endpoint publico minimo; `jarvis-health-monitor.json` prepara monitoramento via n8n.
- Seguranca: segredos continuam em `Setting` criptografado, arquivos sensiveis ficam fora do Git, PWA nao cacheia API e WhatsApp continua exigindo `ei jarvis`.

Ressalvas tecnicas da Fase 10: pgvector real, embeddings externos, deploy do subdominio `n8njarvis`, credenciais reais do n8n/Evolution/Home Assistant, E2E Playwright completo e backup offsite automatizado ainda dependem de configuracao operacional segura.

## Central de Integracoes

`IntegrationConfigService` centraliza status, configuracao segura, testes, bootstrap, logs e eventos das integracoes. A rota `/api/integrations` agrega n8n, WhatsApp/Evolution, Home Assistant, Financeiro, Monitoramento, Backup, OpenAI, Gemini e URLs publicas.

Credenciais sensiveis sao persistidas em `Setting` usando AES-256-GCM via `encryptSettingValue` e sao expostas ao frontend apenas como `configured` e mascara. O painel usa `/integrations`, `/settings/integrations`, `/integrations/setup-wizard` e `/integrations/events`.

## Assistente Universal de Configuracao

`IntegrationSetupService` alimenta `/api/integrations/setup/*`, `/integrations/setup-wizard` e `/integrations/setup-summary`. O servico padroniza provider, status, campos mascarados, URLs publicas, acoes disponiveis e checklist manual para API publica, IA, n8n, WhatsApp/Evolution, Home Assistant, financeiro, documentos/RAG, monitoramento, backup, mobile/PWA e seguranca.

## Fase 14 - JARVIS Super Intelligence Core

O JARVIS agora possui um Brain interno em `/api/brain/*` e painel em `/brain`, com agentes especialistas, roteador de intencoes, ferramentas internas seguras, contexto por memorias/documentos/financeiro/status, feedback/aprendizado e verificador de resposta. O Brain nao treina modelo do zero; ele orquestra OpenAI/Gemini/fallback local com limites de seguranca.

Rotas principais: `/brain`, `/brain/agents`, `/brain/tools`, `/brain/memory`, `/brain/feedback`. Chat e voz usam o Brain mantendo compatibilidade. WhatsApp continua exigindo `ei jarvis` e OFX/CSV continuam exigindo revisao.

## Fase 3.0 - operacao real

A arquitetura de producao fica dividida em:

- Frontend estatico na Fabweb/DirectAdmin em `jarvis.juninnzxtec.com.br`.
- API oficial em `apijarvis.juninnzxtec.com.br/api`.
- n8n via Docker/Caddy em `n8njarvis.juninnzxtec.com.br`, proxy para `127.0.0.1:15678`.
- PostgreSQL local da aplicacao em porta interna.
- n8n-postgres separado em porta interna.
- Integracoes reais configuradas pela Central, com segredos criptografados em `Setting` ou `.env`.

Deploy remoto, monitoramento externo, Evolution API, Home Assistant e backup offsite permanecem etapas operacionais com `manual_action_required` enquanto nao houver credenciais reais seguras.
