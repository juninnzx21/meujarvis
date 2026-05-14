# JARVIS Home AI Assistant

Base full stack para um assistente pessoal inteligente com painel web, chat com IA, voz, memoria, tarefas, automacoes, logs e integracoes preparadas com OpenAI, n8n, Evolution API/WhatsApp e Home Assistant.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide React, Axios e React Router.
- Backend: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT, bcrypt, Zod, OpenAI SDK, Axios, Helmet, CORS, rate limit e logs estruturados.
- Infra: Docker Compose com PostgreSQL, backend e frontend.
- Testes: Vitest, Supertest e Testing Library.

## Login demo

- Email: `admin@jarvis.local`
- Senha: `12345678`

## Rodando local

```powershell
cd E:\jarvis-home-assistant
copy .env.example .env
copy backend\.env.example backend\.env
docker compose up -d postgres

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

## Modulos

- Autenticacao com JWT, registro, login, senha bcrypt e usuario demo.
- Dashboard premium com status, indicadores, estados de loading/error e logs recentes.
- Chat com historico, persistencia, orquestracao por intencoes, fallback seguro de OpenAI e endpoint SSE em `/api/chat/stream`.
- Voz via Web Speech API e SpeechSynthesis, historico local de comandos e aviso de privacidade.
- Memorias CRUD, criacao automatica por comandos e busca relevante por termos.
- Tarefas CRUD e reconhecimento simples por comando.
- Automacoes com allowlist, logs e bloqueio de acoes perigosas.
- n8n, WhatsApp/Evolution API e Home Assistant com status `not_configured` quando faltam credenciais.
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

## Documentacao complementar

- [INSTALLATION.md](./INSTALLATION.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [INTEGRATIONS_SETUP.md](./INTEGRATIONS_SETUP.md)
- [LOCAL_PRODUCTION.md](./LOCAL_PRODUCTION.md)
- [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)
- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
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
- n8n ganhou `POST /api/n8n/test` e tela dedicada.
- WhatsApp ganhou teste de conexao, validacao de numero e confirmacao visual para envio teste.
- Home Assistant ganhou teste de conexao, agrupamento de entidades e bloqueio reforcado para lock, alarm, cover, garagem e portao.
- Logs de integracoes passam por redaction centralizada antes de persistir metadata.

## Fase 6

- Scheduler automatico seguro dentro do backend.
- Rotinas com `triggerType: schedule` e `config.schedule` real para `daily`, `weekly` e `interval_minutes`.
- Lembretes de tarefas usam `reminderAt` e gravam `reminderSentAt` para evitar repeticao.
- Tarefas vencidas geram resumo interno e gravam `overdueNotifiedAt`.
- Tela de notificacoes ganhou filtros, contador de nao lidas e leitura individual.
- Tela `/status` mostra status do scheduler.
- Guia operacional: [SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md).
