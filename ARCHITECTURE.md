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

A base pessoal do JARVIS fica em `backend/prisma/personal-profile/profile-data.ts` e e importada por `backend/prisma/seed-personal-profile.ts`. O importador grava memorias em `Memory` de forma idempotente usando `userId + title + type`, bloqueia padroes sensiveis e registra `SystemLog` sem imprimir segredos. O backend nao importa esses arquivos em runtime de producao; nesta fase o uso oficial e via script `npm run seed:personal`.

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
