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

## Conversa contextual e pesquisa

Chat, voz e assistente mobile persistem o histórico em conversas do próprio usuário e enviam até 8 mensagens recentes à IA (com limite de 3.000 caracteres por mensagem). O Brain inclui esse contexto tanto nas chamadas normais aos provedores quanto na busca grounded do Gemini, e reconhece perguntas curtas de continuação para manter a pesquisa no mesmo assunto. O WhatsApp mantém uma conversa por usuário e remetente, sempre respeitando a exigência `ei jarvis` e a configuração de resposta automática. No modo Voz, a escuta volta a iniciar depois da resposta apenas se a opção de conversa com consentimento estiver ativa; cada sessão continua começando por clique explícito.

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
- A seção **Voz do JARVIS · Fish Audio, Speechma e ElevenLabs**, em `/settings/integrations`, armazena as chaves criptografadas, carrega vozes e permite testar o áudio. O modo automático verifica cotas e tenta os provedores configurados pela ordem de preferência; a tela também consulta cotas sob demanda. Em falha, o frontend não troca silenciosamente para uma voz aleatória do navegador. Escolha e teste uma voz masculina pt-BR em cada serviço para manter a identidade do JARVIS.
- `/integrations/setup-wizard`: checklist guiado para conectar API, n8n, Evolution, WhatsApp, Financeiro e monitoramento.
- `/integrations/events`: historico do EventBus e reenvio seguro.

Documentacao: `INTEGRATIONS_CONTROL_CENTER.md`.

## Vinculo assistido do Home Assistant

Em `Casa Inteligente > Vincular Home Assistant` (`/smart-home/setup`), o assistente orienta a criar um Long-Lived Access Token no perfil do Home Assistant, recebe a URL/token, salva a credencial criptografada, testa a API e descobre entidades sem acionar dispositivos. A URL deve ser alcançável pela VPS. Ações de fechaduras, alarmes, portões e garagem continuam exigindo confirmação.

## CMD online e logs ao vivo

A tela `/logs` agora funciona como painel de operacao em tempo quase real:

- auto-refresh a cada 5 segundos, com botao para pausar;
- filtros por nivel, modulo e busca textual;
- resumo das ultimas 12 horas por erro, aviso, seguranca e info;
- linha do tempo para `whatsapp`, `n8n`, `scheduler`, `routines`, `integrations`, `finance`, `documents`, `brain`, `ai`, `auth` e Home Assistant;
- diagnostico claro para o fluxo WhatsApp: `webhook_received`, `webhook_ignored`, `webhook_processing`, `statement_preview_created` e `auto_reply_disabled`.

O painel nao mostra segredos nem payload bruto. Quando uma mensagem do WhatsApp nao aparece como `whatsapp.webhook_received`, a Evolution nao chamou o webhook da API oficial. Quando aparece como `webhook_ignored`, o motivo fica no log: sem `ei jarvis`, `fromMe` ou grupo.

## WhatsApp com QR Code pelo painel

A tela `/whatsapp` permite conectar WhatsApp pela Evolution API diretamente no JARVIS:

- salvar URL, instancia e API key com criptografia em `Setting`;
- criar/selecionar instancia quando a Evolution suportar;
- gerar QR Code ou pairing code dentro do painel;
- acompanhar estado `disconnected`, `connecting` e `connected/open`;
- configurar automaticamente o webhook oficial `https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`;
- exibir `manual_action_required` quando a versao da Evolution exigir etapa manual.

O frontend nunca recebe a API key real. O WhatsApp continua exigindo `ei jarvis` antes de executar comandos, e OFX/CSV continuam gerando previa de importacao com revisao obrigatoria.

Quando o manager da Evolution travar ao deletar uma instancia ou deixar de sincronizar mensagens, a tela `/whatsapp` possui `Reset seguro da Evolution`. A acao exige digitar `RESETAR EVOLUTION`, tenta logout/delete por endpoints conhecidos da Evolution e mostra `manual_action_required` se a versao da API exigir limpeza manual no manager. Nenhuma API key real volta para o frontend.

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

O login de demonstração só deve ser usado em desenvolvimento. Em produção, mantenha `ALLOW_DEMO_LOGIN=false` e crie um usuário administrador próprio com `npm run create:admin`.

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

## Produção

- Frontend público: `https://jarvis.juninnzxtec.com.br`
- API pública: `https://apijarvis.juninnzxtec.com.br/api`
- O frontend estático e a API são publicados na infraestrutura atual da VPS. Consulte o guia de deploy antes de alterar DNS ou serviços.

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

## Assistente Universal de Configuracao

O JARVIS agora possui um assistente universal em `/integrations/setup-wizard` e um resumo final em `/integrations/setup-summary`. Ele cobre API publica, OpenAI/Gemini, n8n, WhatsApp/Evolution, Home Assistant, financeiro, documentos/RAG, monitoramento, backup, mobile/PWA e seguranca. O frontend recebe apenas status, mascaras, URLs publicas e checklists; segredos reais permanecem criptografados no backend ou em ambiente seguro.

### Configuracao de OpenAI e Gemini pelo painel

Administradores podem configurar OpenAI e Gemini em `/settings/integrations`, escolher a IA principal (OpenAI, Gemini ou automatico) e carregar a lista de modelos liberados para cada chave. O modo automatico preserva OpenAI como primeira opcao e Gemini como reserva; ao escolher um provedor, ele e tentado primeiro e a outra IA configurada e usada como fallback. Chat, Brain e respostas faladas seguem essa preferencia. A transcricao de audio continua usando OpenAI Whisper e a sintese de voz tem configuracao propria. As chaves ficam criptografadas em `Setting`; a API retorna somente status, origem e nomes de modelo. O campo de chave vazio preserva uma chave existente. Testes e carga de modelos ocorrem apenas quando solicitados no painel.

### Vincular o Controle Financeiro externo

Em `/settings/integrations`, o cartao Controle Financeiro usa por padrao `https://controlefinanceiro.juninnzxtec.com.br`. Informe o e-mail e a senha usados nesse sistema e clique em **Conectar Controle Financeiro**. Se houver 2FA, informe o codigo temporario na etapa seguinte. A senha nao e armazenada; o token de API emitido pelo Financeiro e guardado criptografado em `Setting`. O botao de teste consulta `/api/v1/me`; o cartao tambem permite desvincular e revogar a sessao. O JARVIS nunca envia extratos financeiros a IA externa e mantem revisao obrigatoria de importacoes.

## Fase 14 - JARVIS Super Intelligence Core

O JARVIS agora possui um Brain interno em `/api/brain/*` e painel em `/brain`, com agentes especialistas, roteador de intencoes, ferramentas internas seguras, contexto por memorias/documentos/financeiro/status, feedback/aprendizado e verificador de resposta. O Brain nao treina modelo do zero; ele orquestra OpenAI/Gemini/fallback local com limites de seguranca.

Rotas principais: `/brain`, `/brain/agents`, `/brain/tools`, `/brain/memory`, `/brain/feedback`. Chat e voz usam o Brain mantendo compatibilidade. WhatsApp continua exigindo `ei jarvis` e OFX/CSV continuam exigindo revisao.

No Brain, pedidos para criar memória ou tarefa agora geram uma proposta e exigem revisão; não gravam dados automaticamente. `POST /api/brain/execute-draft` valida o formato recebido, mas continua sem executar drafts até existir um fluxo de confirmação vinculado, com expiração e proteção contra repetição. A autenticação própria ainda usa senha + JWT; 2FA, sessões revogáveis e gerenciamento de dispositivos não estão implementados neste checkout.

## Fase 3.0 - producao real e uso diario

Status: **APROVADO COM RESSALVAS**.

Esta fase adiciona os guias operacionais para deploy real, n8n em producao, Evolution/WhatsApp real, Home Assistant, monitoramento externo, backup offsite e E2E planejado.

Arquivos principais:

- `DEPLOY_REAL_PRODUCTION_PHASE.md`
- `QA_PRODUCTION_READINESS_REPORT.md`
- `HOME_ASSISTANT_SETUP.md`
- `MONITORING_SETUP.md`
- `OFFSITE_BACKUP_PLAN.md`
- `E2E_TEST_PLAN.md`

Ressalvas: credenciais reais, Caddy/DNS, Home Assistant, Evolution API, monitoramento externo e backup offsite dependem de acao manual segura.

## Pesquisa automática na web

Perguntas de conhecimento geral passam pela busca Google Grounding do Gemini, com fontes vinculadas às respostas exibidas no Brain, Chat, voz, modo JARVIS e WhatsApp. A busca usa a configuração Gemini da conta ou o ambiente já suportado. Se a chave, o modelo ou a quota não permitir grounding, o JARVIS tenta responder pelo provedor normal e não afirma que pesquisou. A busca externa pode consumir quota ou cobrança da conta Gemini. No WhatsApp, continua obrigatório incluir `ei jarvis`.

## Instalacao multiplataforma e avatar de voz — 2026-10-14

A rota publica `/install` orienta a instalacao do JARVIS como PWA no Android e iPhone e disponibiliza o companion EXE x64 para Windows. Chrome/Edge tambem permitem instalar o PWA no desktop. O projeto agora inclui uma TWA Android com AAB/APK local, ainda nao publicada. O companion Windows e unsigned e pode mostrar aviso de editor desconhecido.

Nas paginas autenticadas, o avatar holografico flutuante abre um painel compacto para conversa. O microfone permanece desligado ate o usuario ativar o modo de conversa; a interface mostra o estado de escuta, processamento e fala. A sessao para ao fechar o painel ou ocultar a aba. As falas usam `/api/voice/process`, o mesmo Brain/historico do modo Voz, e a resposta e sintetizada pelo TTS configurado.

## JARVIS Desktop para Windows

O companion nativo fica em `desktop/`, abre o JARVIS com `Ctrl+Shift+J` e permite acoes locais tipadas pelo mesmo assistente flutuante. O microfone recebe autorizacao temporaria quando o usuario clica em iniciar conversa; nao ha escuta oculta. O painel pode abrir em modo imersivo de tela cheia com visual HUD, e `Esc` sai desse modo. Operacoes em arquivos restritas a pastas pessoais pedem confirmacao do Windows, exclusao move para a Lixeira, e o app nunca executa comandos de terminal. Veja `DESKTOP_COMPANION_GUIDE.md` para comandos suportados, limites e geracao do instalador x64. O companion ainda requer autenticacao na conta JARVIS e internet para conversar com a IA.

## JARVIS 2.0 — release preparada em 2026-10-14

Os pacotes do frontend, backend e companion Windows estao na versao `2.0.0`; a identidade visual do site/PWA e do companion mostra JARVIS 2.0. Os pacotes Windows e Android sao gerados localmente. A release ainda nao foi enviada ao site nem as lojas, e a Central de Downloads online deve continuar identificando apenas os artefatos realmente publicados.

### Microfone e modo imersivo — 2026-10-14

No JARVIS Desktop atualizado, o botao **Ativar conversa por voz** libera uma janela de permissao de 60 segundos no processo principal antes de iniciar a captura de audio. A permissao continua restrita ao dominio JARVIS confiavel, ao quadro principal e apenas a audio. Para uma tela HUD de jogo, use o botao de tela cheia no topo do painel; `Esc` ou o botao de minimizar encerra o modo. O modo de tela cheia ocupa a janela do JARVIS e nao fica por cima de outro jogo em tela cheia.
# Auditoria multiplataforma 2026-10-14

Consulte [PROJECT_AUDIT_MULTIPLATFORM.md](PROJECT_AUDIT_MULTIPLATFORM.md) para o estado verificado de Windows, Android/PWA, voz, Home Assistant, Waze e serviços. A tela `/mobile-assistant` inclui navegação para Waze por endereço ou favoritos pessoais.
## Central de Downloads

A rota autenticada `/downloads` lista os artefatos verificados e deixa explícito quando uma plataforma não tem pacote nativo publicado. Consulte [DOWNLOADS_CENTER_GUIDE.md](DOWNLOADS_CENTER_GUIDE.md) para versão, hash, assinatura e procedimento Android/PWA. Gerenciamento administrativo de releases, assinatura e envio automático ainda não estão disponíveis.

### Abrir programas e jogos no Windows

O companion abre aplicativos pelo nome exato do atalho do Menu Iniciar, após confirmação nativa do Windows. Atalhos duplicados que apontam para o mesmo executável são consolidados. O comando `Jarvis, abra o jogo Rust` verifica o manifesto e o executável nas bibliotecas registradas do Steam e pede confirmação antes de iniciar o App ID fixo do Rust (`252490`). Esta capacidade só funciona no JARVIS Desktop instalado e aberto; o site/PWA isolado não pode iniciar programas do computador. Não há execução de comandos de terminal nem caminhos de executáveis fornecidos pela IA.

## Distribuicao para lojas — 2026-10-14

O companion Windows 2.0.0 foi validado e o instalador x64 e gerado em `desktop/release/`. O Android agora tem um projeto TWA em `android/` e os artefatos assinados são preparados por `android/build-release.ps1`; o AAB de Play Console fica em `android/release/`. Esses artefatos são locais e ainda não foram publicados em nenhuma loja.

O Android depende do site JARVIS e da associação em `/.well-known/assetlinks.json`. O arquivo-fonte está em `frontend/public/.well-known/assetlinks.json`, mas o endpoint público ainda serve a página HTML de fallback. O certificado de assinatura do Play Console também deve ser acrescentado depois que o app for criado na conta.

## Builds automaticos por commit

O workflow `.github/workflows/ci.yml` valida e arquiva builds de web, Windows e Android de teste para cada commit em `main`/pull request quando o projeto está conectado ao GitHub. Isso ainda não faz deploy na VPS nem publica em lojas. O Companion e o Android TWA usam o site hospedado, então mudanças web chegam após deploy da interface; mudanças nativas exigem nova versão e distribuição pelas lojas. Leia [CI_CD_GUIDE.md](CI_CD_GUIDE.md) para o fluxo e os itens necessários para habilitar publicação contínua com segurança.

### IA local híbrida — 2026-10-14

A Central de Integrações agora permite configurar Ollama em `/integrations`, descobrir modelos instalados, testar conectividade e escolher `Ollama` como provedor principal. No modo automático, o Brain/chat/voz tentam Ollama primeiro e recorrem aos provedores OpenAI e Gemini quando o endpoint estiver indisponível. O endpoint aceita loopback, IP privado literal ou o nome interno `ollama` na rede Compose; URLs públicas são recusadas. A API Ollama não tem autenticação própria, portanto não publique a porta 11434. O runtime/modelo ainda não estão instalados; a VPS precisa de mais margem de memória antes de ativar o serviço. Auditoria e próximos passos em [LOCAL_AI_AUDIT.md](LOCAL_AI_AUDIT.md).

### Voz personalizada do JARVIS
Na Central de Integrações, configure a chave Fish Audio e use **Selecionar MP3 e clonar voz** para enviar uma amostra MP3 diretamente à Fish Audio. O modelo é criado com visibilidade privada; o arquivo não é persistido pelo JARVIS. Após o clone, Fish Audio fica selecionado como provedor TTS. O endpoint aceita MP3 de até 8 MB e exige administrador autenticado.

### Diagnóstico autenticado
`GET /api/health/public` fornece somente o estado básico de disponibilidade. `GET /api/health/full` exige autenticação e lê as configurações do usuário autenticado para mostrar n8n, WhatsApp/Evolution e Home Assistant. O endpoint completo pode incluir contagens financeiras e registros recentes; mantenha-o atrás da sessão do JARVIS e use a rota pública para monitores externos.

## Atualizacao de producao 2026-10-15 — release d9487c4

O health detalhado passou a exigir JWT e usa status de integrações do usuário autenticado. CI verde para backend/testes, companion Windows e APK de validação Android. Em produção, frontend 200, health público 200, health detalhado 401 sem sessão e 200 autenticado, banco e scheduler saudáveis. O teste GET da Evolution retornou sessão `open`; webhook e workflows não foram executados. Home Assistant está sem configuração e precisa de URL alcançável pela VPS e token de acesso.

## Voz do navegador e disponibilidade dos provedores — 2026-10-15

A seleção automática foi atualizada para priorizar vozes masculinas pt-BR identificadas pelo nome; “Brasil” não é mais tratado como marcador masculino. Dois testes cobrem o caso de Google Português do Brasil versus Microsoft Antonio. CI da release `91d297c` passou em validate, desktop e android; o frontend foi recompilado sem cache e o bundle público confirmado contém o seletor novo. O estado real do usuário na VPS está definido como `browser`, e nenhum provedor Fish Audio, ElevenLabs ou Speechma tem chave/voice ID configurados. Por isso, ainda não há TTS premium nem consulta de cota disponível. Configure em `/settings/integrations` e escolha `auto` para habilitar preferência por quota disponível.

## Voz automática — correção do teste e cota Fish Audio

Na Central de Integrações, os botões de carregar vozes e testar a síntese salvam primeiro os campos atualmente preenchidos. Isso evita testar com uma configuração anterior ainda persistida. O modo automático reconhece crédito gratuito Fish Audio mesmo quando a resposta de cota não inclui um saldo numérico; se a consulta de cota estiver indisponível, a síntese ainda tenta o provedor em vez de descartá-lo imediatamente. Para ativar síntese remota ainda é necessário configurar chave válida e voice ID.

A release `1cd1170` está implantada na VPS. Frontend e backend passaram smoke tests HTTP 200; o teste de áudio premium ainda depende de credenciais novas cadastradas em `/settings/integrations`.
