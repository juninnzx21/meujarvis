# JARVIS Home AI Assistant

## Nota operacional de producao

Frontend publico: `https://jarvis.juninnzxtec.com.br`.

API publica oficial: `https://apijarvis.juninnzxtec.com.br/api`.

Configure builds de producao do frontend com:

```env
VITE_API_URL=https://apijarvis.juninnzxtec.com.br/api
```

Webhook WhatsApp/Evolution: `https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`.

No WhatsApp, o JARVIS so deve responder/executar quando a mensagem tiver `ei jarvis`. Arquivos OFX/CSV enviados pelo WhatsApp geram previa de importacao financeira e nunca sao importados diretamente.

Base full stack para um assistente pessoal inteligente com painel web, chat com IA, voz, memoria, tarefas, automacoes, logs, n8n proprio, EventBus, documentos/RAG preparado e integracoes preparadas com OpenAI, Gemini, Evolution API/WhatsApp, Home Assistant e Controle Financeiro.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide React, Axios e React Router.
- Backend: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT, bcrypt, Zod, OpenAI SDK, Axios, Helmet, CORS, rate limit e logs estruturados.
- Infra: Docker Compose com PostgreSQL, backend, frontend, n8n e PostgreSQL dedicado do n8n.
- Testes: Vitest, Supertest e Testing Library.

## Fase 10 - JARVIS 100000/10

- n8n proprio em Docker (`n8n` e `n8n-postgres`) com portas presas em `127.0.0.1`.
- Scripts `start-n8n.ps1`, `stop-n8n.ps1`, `status-n8n.ps1` e `backup-n8n.ps1`.
- Workflows importaveis em `n8n/workflows/`, sem credenciais reais.
- EventBus interno com `IntegrationEvent` e payload redigido.
- Memoria semantica preparada com fallback local seguro.
- Modulo de documentos/RAG preparado em `/documents` e `/api/documents`.
- CI inicial em GitHub Actions, sem deploy automatico.

Guias: `N8N_LOCAL_PRODUCTION.md`, `N8N_WORKFLOWS_GUIDE.md`, `SEMANTIC_MEMORY_GUIDE.md`, `DOCUMENTS_RAG_GUIDE.md`, `PRODUCTION_HARDENING_100000.md` e `CI_CD_GUIDE.md`.

## Central de Integracoes

O painel possui uma central para configurar e validar integrações sem expor segredos:

- `/integrations`: cards de status para OpenAI, Gemini, n8n, WhatsApp/Evolution, Home Assistant, Financeiro, Webhooks, Monitoramento, Backup e API publica.
- `/settings/integrations`: edicao segura de URLs e credenciais criptografadas.
- `/integrations/setup-wizard`: checklist guiado para conectar API, n8n, Evolution, WhatsApp, Financeiro e monitoramento.
- `/integrations/events`: historico do EventBus e reenvio seguro.

Documentacao: `INTEGRATIONS_CONTROL_CENTER.md`.

## Fase Mobile/PWA

O frontend possui PWA instalavel com manifest, service worker seguro, icones, atalhos e tela `/mobile-assistant`.

Atalhos PWA:

- Falar com JARVIS: `/voice`
- Abrir Chat: `/chat`
- Nova tarefa: `/tasks`
- Financeiro: `/finance`
- Status: `/status`

Seguranca mobile:

- O service worker nao cacheia `/api/*`, Authorization, cookies ou dados autenticados.
- O microfone so e ativado quando o usuario toca no botao.
- Nao existe escuta continua oculta.
- WhatsApp continua exigindo `ei jarvis`.

Guias:

- `MOBILE_PWA_GUIDE.md`
- `ANDROID_ASSISTANT_PLAN.md`

## Login demo

- Email: `admin@jarvis.local`
- Senha: `12345678`

## Fase 7 - Financeiro inteligente

O JARVIS agora possui modulo financeiro nativo para contas bancarias, categorias, lancamentos, importacao de extratos e relatorios.

Rotas do painel:

- `/finance`
- `/finance/accounts`
- `/finance/transactions`
- `/finance/categories`
- `/finance/import`
- `/finance/import/:id/review`
- `/finance/reports`

Comandos uteis no chat:

- `adicionar entrada de 500`
- `registrar saida de 150 no banco Inter`
- `quanto entrou esse mes?`
- `qual meu saldo total?`
- `tenho lancamentos duplicados?`

Documentacao especifica:

- `FINANCE_MODULE.md`
- `BANK_INTER_IMPORT.md`

## Produção e API pública

- Frontend: `https://jarvis.juninnzxtec.com.br`
- API pública oficial: `https://apijarvis.juninnzxtec.com.br/api`
- Health público: `https://apijarvis.juninnzxtec.com.br/api/health/public`

O domínio principal `jarvis.juninnzxtec.com.br` serve o frontend estático na Fabweb. Rotas `/api/*` públicas devem usar `apijarvis`.

## Hardening de produção

Variáveis importantes:

- `SETTINGS_ENCRYPTION_KEY`: chave dedicada para criptografar tokens salvos em `Setting`.
- `ALLOW_DEMO_LOGIN=false`: bloqueia `admin@jarvis.local` em produção.

Criar admin real:

```bash
cd backend
npm run create:admin
```

Guias:

- `PRODUCTION_SECURITY_HARDENING.md`
- `MONITORING_SETUP.md`
- `OFFSITE_BACKUP_PLAN.md`
- `E2E_TEST_PLAN.md`

## Producao

- Frontend publico: `https://jarvis.juninnzxtec.com.br`
- API publica: `https://apijarvis.juninnzxtec.com.br/api`
- DNS esperado: `jarvis -> 166.0.186.20` (Fabweb) e `apijarvis -> 45.76.251.177` (VPS).
- O frontend de producao e publicado como build estatico na Fabweb e consome a API dedicada na VPS.

## Rodando local

```powershell
cd E:\jarvis-home-assistant
copy .env.example .env
copy backend\.env.example backend\.env
docker compose up -d postgres
docker compose up -d n8n-postgres n8n

cd E:\jarvis-home-assistant\backend
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Em outro terminal:

```powershell
cd E:\jarvis-home-assistant\frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:3001/api/health

## Validacao

```powershell
cd E:\jarvis-home-assistant\backend
npm run test
npm run validate

cd E:\jarvis-home-assistant\frontend
npm run test
npm run validate
```

`npm run validate` roda typecheck, testes automatizados e build. No backend tambem gera Prisma Client.

Build do frontend para Fabweb:

```powershell
cd E:\jarvis-home-assistant\frontend
$env:VITE_API_URL="https://apijarvis.juninnzxtec.com.br/api"
npm run build
```

## Modulos

- Autenticacao com JWT, registro, login, senha bcrypt e usuario demo.
- Dashboard premium com status, indicadores, estados de loading/error e logs recentes.
- Chat com historico, persistencia, orquestracao por intencoes, fallback seguro de OpenAI e endpoint SSE em `/api/chat/stream`.
- Voz via Web Speech API e SpeechSynthesis, historico local de comandos e aviso de privacidade.
- Memorias CRUD, criacao automatica por comandos e busca relevante por termos.
- Tarefas CRUD e reconhecimento simples por comando.
- Automacoes com allowlist, logs e bloqueio de acoes perigosas.
- n8n, WhatsApp/Evolution API e Home Assistant com status `not_configured` quando faltam credenciais.
- Controle Financeiro em `/finance`, com configuracao por usuario, teste de token, lancamento manual, resumo mensal e comandos financeiros por WhatsApp.
- Telas de integracao para n8n, WhatsApp e Casa Inteligente com testes seguros via backend.
- Logs estruturados em banco.
- Configuracoes por usuario com status das credenciais.

## Variaveis principais

Copie `.env.example` para `.env` e `backend\.env.example` para `backend\.env`. Ajuste sem expor segredos no frontend:

- `DATABASE_URL`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `N8N_WEBHOOK_URL`
- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`
- `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_TOKEN`
- `SCHEDULER_ENABLED`
- `SCHEDULER_INTERVAL_SECONDS`

O Controle Financeiro externo e configurado pelo painel `/finance`, nao por variavel no frontend. Cole apenas a URL publica do sistema e um token de API; nunca salve senha do painel financeiro dentro do JARVIS.

## Documentacao complementar

- [INSTALLATION.md](./INSTALLATION.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [INTEGRATIONS_SETUP.md](./INTEGRATIONS_SETUP.md)
- [LOCAL_PRODUCTION.md](./LOCAL_PRODUCTION.md)
- [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)
- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
- [PRODUCTION_SECURITY_HARDENING.md](./PRODUCTION_SECURITY_HARDENING.md)
- [DEPLOYMENT_PRODUCTION.md](./DEPLOYMENT_PRODUCTION.md)
- [DEPLOYMENT_STATUS_REPORT.md](./DEPLOYMENT_STATUS_REPORT.md)
- [MEMORY_SEMANTIC.md](./MEMORY_SEMANTIC.md)
- [COMMANDS_GUIDE.md](./COMMANDS_GUIDE.md)
- [ROUTINES_GUIDE.md](./ROUTINES_GUIDE.md)
- [SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md)
- [SYSTEM_STATUS_REPORT.md](./SYSTEM_STATUS_REPORT.md)
- [FINAL_VALIDATION_REPORT.md](./FINAL_VALIDATION_REPORT.md)

## Seguranca

- Nunca salve segredos no frontend.
- JWT, senhas, tokens e API keys sao redigidos nos logs.
- Acoes sensiveis exigem confirmacao.
- Comandos shell arbitrarios, acoes destrutivas e spam sao bloqueados.
- Integracoes sem credenciais retornam `not_configured` sem quebrar o sistema.

## Fase 3

- OpenAI agora reporta estados `configured`, `missing_key`, `quota_exceeded`, `network_error` e `api_error`.
- Gemini pode ser configurado como fallback automatico quando OpenAI falhar.

## Fase 4

- Scripts locais: `start-jarvis.ps1`, `stop-jarvis.ps1`, `status-jarvis.ps1`, `backup-jarvis.ps1`, `restore-jarvis.ps1`, `validate-jarvis.ps1`.
- Backup PostgreSQL em `backups\jarvis_db_YYYYMMDD_HHMMSS.sql`.
- Nova tela `/status` com uptime, banco, IA, integracoes, logs e falhas recentes.
- Dashboard com atalhos rapidos para voz, tarefas, memorias, integracoes e logs.
- Home Assistant possui endpoint seguro para luzes: `POST /api/home-assistant/light`.

## Fase 5

- Central de comandos em `/commands`.
- Rotinas em `/routines` com historico de execucao.
- Relatorios inteligentes em `/reports`.
- Notificacoes internas em `/notifications`.
- Tarefas ganharam `reminderAt`, filtros de hoje/vencidas e endpoint de pendencias.
- WhatsApp reforcado para preparar mensagens sem envio direto por IA.
- n8n tem templates de eventos documentados em `INTEGRATIONS_SETUP.md`.
- Guias: [COMMANDS_GUIDE.md](./COMMANDS_GUIDE.md) e [ROUTINES_GUIDE.md](./ROUTINES_GUIDE.md).
- n8n ganhou tela dedicada com configuracao de webhook pelo painel, `POST /api/n8n/test` e logs redigidos.
- WhatsApp ganhou teste de conexao, validacao de numero e confirmacao visual para envio teste.
- Home Assistant ganhou teste de conexao, agrupamento de entidades e bloqueio reforcado para lock, alarm, cover, garagem e portao.
- Logs de integracoes passam por redaction centralizada antes de persistir metadata.

## Base de conhecimento pessoal

O JARVIS possui seed opcional para importar 47 memorias estruturadas sobre Junior Rodrigues / Juninnzx: identidade, carreira, projetos, stack, preferencias, padroes de deploy, infraestrutura, JARVIS, n8n, WhatsApp/Evolution, financeiro, mobile/PWA e roadmap. O importador bloqueia conteudo sensivel, atualiza memorias existentes e remove duplicatas antigas por titulo equivalente.

```powershell
cd E:\jarvis-home-assistant\backend
npx prisma db seed
npm run seed:personal
```

Guia completo: [PERSONAL_PROFILE_MEMORY.md](./PERSONAL_PROFILE_MEMORY.md).

## Fase 6

- Scheduler automatico seguro dentro do backend.
- Rotinas com `triggerType: schedule` e `config.schedule` real para `daily`, `weekly` e `interval_minutes`.
- Lembretes de tarefas usam `reminderAt` e gravam `reminderSentAt` para evitar repeticao.
- Tarefas vencidas geram resumo interno e gravam `overdueNotifiedAt`.
- Tela de notificacoes ganhou filtros, contador de nao lidas e leitura individual.
- Tela `/status` mostra status do scheduler.
- Guia operacional: [SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md).

## Integracao financeira

- Painel: `/finance`.
- API backend: `/api/finance/status`, `/api/finance/config`, `/api/finance/test-connection`, `/api/finance/transactions`, `/api/finance/summary/month` e `/api/finance/parse`.
- Destino esperado: `https://controlefinanceiro.juninnzxtec.com.br`.
- O token do controle financeiro fica salvo somente no backend/banco e e retornado apenas mascarado.
- Pelo WhatsApp, com Evolution API e auto reply ativos, o JARVIS entende mensagens como:
  - `entrada pix recebido R$ 120,00 cliente Joao`
  - `saida pix enviado R$ 45,90 mercado`
  - `resumo financeiro do mes`
- Comprovantes em imagem/PDF ainda precisam ser enviados como texto ou audio nesta fase. OCR de comprovantes pode ser a proxima evolucao.

## Banco de dados

- O backend usa PostgreSQL via Prisma.
- Banco MySQL/MariaDB da hospedagem compartilhada nao deve substituir o PostgreSQL sem uma fase de migracao.
- Plano seguro: [DATABASE_MIGRATION_PLAN.md](./DATABASE_MIGRATION_PLAN.md).
## Importacao financeira por WhatsApp

O JARVIS aceita extratos OFX/CSV enviados pelo painel financeiro ou pelo webhook WhatsApp/Evolution. O melhor formato para Banco Inter PJ e **OFX**; CSV e fallback confiavel; PDF e apenas conferencia.

No WhatsApp, toda acao exige a frase **"ei jarvis"** no texto, audio transcrito ou legenda do arquivo. Sem essa frase, o JARVIS registra a entrada como ignorada e nao responde nem executa tarefas.

Fluxo seguro:

1. Receber arquivo `.ofx` ou `.csv`.
2. Parsear localmente, sem enviar o extrato para IA externa.
3. Detectar banco, conta, periodo, saldo e movimentacoes.
4. Criar previa em `/finance/import/{id}/review`.
5. Importar somente linhas aprovadas.

Endpoints principais:

- `POST /api/finance/import/upload`
- `POST /api/finance/import/whatsapp`
- `GET /api/finance/imports`
- `GET /api/finance/imports/:id`
- `GET /api/finance/imports/:id/rows`
- `POST /api/finance/imports/:id/approve-all`
- `POST /api/finance/imports/:id/import-approved`
- `POST /api/whatsapp/webhook`

Documentacao relacionada:

- `FINANCE_IMPORT_GUIDE.md`
- `WHATSAPP_FILE_IMPORT.md`
- `BANK_INTER_IMPORT.md`
