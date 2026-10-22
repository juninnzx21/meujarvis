# JARVIS Home AI Assistant

## Agent Sync local

O executor supervisionado fica em [`docs/jarvis/AGENT_SYNC.md`](docs/jarvis/AGENT_SYNC.md) e `tools/agent-sync/`. Ele conecta o planejador/revisor OpenAI ao Codex CLI local em ciclos limitados, exige PostgreSQL descartável antes de chamar modelos, valida em ambiente sintético, registra tarefas aprovadas como `IN_REVIEW` e não as repete na mesma execução. `tools/agent-sync/run-cycle.ps1` executa o preflight e solicita a chave em entrada oculta; uma chave da OpenAI API tem cobrança separada do ChatGPT. O agendador continua pausado.

As conversas do chat e da voz podem levar mais tempo quando o Brain consulta pesquisa e integrações; as telas aguardam até 90 segundos e o chat mostra falhas de rede/provider com opção de repetir a mensagem. Consultas do Brain ao Home Assistant e n8n usam a configuração vinculada ao usuário autenticado.

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

## Voz do JARVIS

Em Configurações → Integrações → Voz do JARVIS, selecione uma voz masculina pt-BR do provedor e ajuste naturalidade, semelhança, expressividade e velocidade do ElevenLabs. O preset inicial é mais pausado e expressivo. Os controles são enviados apenas pelo backend; chaves continuam criptografadas. Use “Testar voz selecionada” para ouvir a amostra. O JARVIS oferece uma identidade original com estilo de assistente cinematográfico, sem clonar exatamente uma voz de ator/personagem.

## Fuso horário pessoal

Em Configurações, cada usuário pode salvar um identificador de fuso IANA (por exemplo, `America/Sao_Paulo`). O Meu Dia usa esse valor para classificar os prazos; contas existentes recebem esse fuso como padrão por migration. A API autenticada permite consultar e alterar somente o perfil da sessão atual.

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
- A seção **Voz do JARVIS · Piper local, Fish Audio e ElevenLabs**, em `/settings/integrations`, testa a síntese. Piper roda em serviço Docker privado com voz pt-BR, sem chave ou cobrança por uso. O modo automático tenta Piper primeiro e só usa provedores remotos com cota confirmada; ElevenLabs precisa ser autorizado como fallback.
- `/integrations/setup-wizard`: checklist guiado para conectar API, n8n, Evolution, WhatsApp, Financeiro e monitoramento.
- `/integrations/events`: historico do EventBus e reenvio seguro.

Documentacao: `INTEGRATIONS_CONTROL_CENTER.md`.

### NVIDIA NIM para conversa e voz

Em **Configurações → Integrações**, administradores podem salvar a API key NVIDIA criptografada por usuário e escolher um modelo do catálogo curado. A política persistente `NVIDIA_ZERO_SPEND` fixa o orçamento em R$ 0,00 por mês-calendário em `America/Sao_Paulo`; como a aplicação não comprova preço, quota e entitlement sem cobrança para a conta, o backend bloqueia chat, STT, TTS e testes remotos. Um bloqueio não dispara fallback automático para provedores pagos quando NVIDIA é a IA principal; somente Ollama local pode ser tentado. Os endpoints existentes permanecem preparados, sem chamadas externas.

Magpie Multilingual e NVIDIA Speech NIM continuam selecionáveis como configuração, mas não enviam texto ou áudio ao provedor enquanto vigorar o orçamento zero. As configurações são registradas na mesma transação que salva os parâmetros NVIDIA e os bloqueios ficam em logs por usuário, operação, modelo e mês-calendário; nenhum log contém chave, prompt ou áudio. Referências oficiais: [API LLM NIM](https://docs.nvidia.com/nim/large-language-models/latest/api-reference.html), [acesso ao API Catalog](https://docs.nvidia.com/nim/large-language-models/latest/getting-started.html) e [APIs NVCF](https://docs.nvidia.com/nvcf/dev/overview/api). A documentação consultada descreve invocação e autenticação, mas não prova que esta conta/modelo/operação seja gratuita nem que haja um teto de cobrança configurado; por isso a execução continua bloqueada.

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

## Saúde e diagnóstico HTTP

O health detalhado respeita o escopo do usuário autenticado: falhas, contagens financeiras e provedores de IA são próprios da conta; status/erros internos do scheduler são redigidos para usuários comuns, e somente administradores veem métricas HTTP globais. Métricas são locais ao processo e reiniciam com ele; estados de integrações em `not_checked` não comprovam conectividade.

O backend gera um `X-Request-Id` por requisição e mantém contadores HTTP em memória desde o início do processo. O status distingue serviço configurado de conectividade testada; integrações sem probe ficam como “não verificado”. Apenas falhas 5xx geram log/alerta genérico no histórico interno, com deduplicação por rota/status. Logs usam templates de rota e não incluem query string ou corpo. Esses dados não substituem monitoramento externo; OBS-001 passou pela revisão independente de código, mas ainda aguarda smoke operacional e não foi implantada.

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
- `SETTINGS_ENCRYPTION_KEY_OLD`: chave anterior temporaria para leitura durante uma rotacao controlada; nunca use `JWT_SECRET` para novas cifras.
- `ALLOW_DEMO_LOGIN=false`: bloqueia `admin@jarvis.local` em produção.

Gere e armazene `SETTINGS_ENCRYPTION_KEY` em um gestor de segredos (mínimo 32 caracteres aleatórios), separado de `JWT_SECRET`. Novas cifras usam `enc:v2:`; a leitura `enc:v1:` permanece habilitada durante a migração. `npm run settings:rotate -- --dry-run` é somente leitura; a execução cria um backup cifrado ignorado pelo Git e altera os registros em uma transação. Proteja e teste a recuperação desse backup antes de qualquer rotação real. A CLI e o serviço exigem identidade positiva Docker + SQL do PostgreSQL descartável antes de backup, rotação ou restauração; `localhost`, nome contendo `test` e flags de confirmação não liberam outros bancos.

Backups SEC-002 usam formato v2, HMAC com chave derivada da chave dedicada e incluem a identidade e os ciphertexts dos registros na autenticação. A restauração verifica a integridade e decifra todos os valores antes de abrir a transação. Backups v1 sem autenticação são rejeitados; preserve a chave atual/anterior necessária à recuperação dos backups v2.

Testes que acessam PostgreSQL exigem `JARVIS_AGENT_SYNC_TEST_DATABASE_URL` apontando exatamente para `127.0.0.1:55433/jarvis_agent_sync_test`, além da confirmação Docker do container saudável `jarvis-agent-sync-postgres-test` (PostgreSQL 16, sem mounts e com dados em tmpfs). A conexão confirma database, role e IP interno antes de mutações; um host loopback ou nome contendo `test` não é prova suficiente. Sem URL/identidade válida, testes integrados são ignorados ou bloqueados sem mostrar a URL.

Backups legados v1 não têm autenticidade verificável e não podem ser restaurados diretamente. Preserve o original sem alterações; só considere conversão offline se houver hash/assinatura confiável criado antes do incidente, validação AEAD de cada valor e conferência independente de cada ID/usuário/chave com o inventário esperado. Um hash calculado agora não prova procedência, e AEAD não vincula ciphertext à identidade do registro. Sem essas provas, recupere as configurações nas fontes autoritativas (provedores/administrador) e grave-as novamente pelo fluxo normal, que gera v2. Uma ferramenta de conversão v1->v2 deve passar por revisão e validação própria antes de ser usada; não habilite bypass de restore.

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
- Dashboard premium com status, indicadores, estados de loading/error, logs recentes e “Meu Dia” (tarefas, notificações, resumo financeiro e rotinas em leitura).
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

A rota autenticada `/downloads` oferece o instalador Windows x64 e o APK Android assinado da release JARVIS 2.0.0. O workflow `.github/workflows/release-downloads.yml` gera o instalador e publica ambos os arquivos e seus checksums em uma release pública do GitHub ao enviar a tag `v2.0.0`. Consulte [DOWNLOADS_CENTER_GUIDE.md](DOWNLOADS_CENTER_GUIDE.md) para hashes, assinatura, instalação e limitações.

### Abrir programas e jogos no Windows

O companion abre aplicativos pelo nome exato do atalho do Menu Iniciar, após confirmação nativa do Windows. Atalhos duplicados que apontam para o mesmo executável são consolidados. O comando `Jarvis, abra o jogo Rust` verifica o manifesto e o executável nas bibliotecas registradas do Steam e pede confirmação antes de iniciar o App ID fixo do Rust (`252490`). Esta capacidade só funciona no JARVIS Desktop instalado e aberto; o site/PWA isolado não pode iniciar programas do computador. Não há execução de comandos de terminal nem caminhos de executáveis fornecidos pela IA.

## Distribuicao para lojas — 2026-10-14

O companion Windows 2.0.0 foi validado e o instalador x64 e gerado em `desktop/release/`. O Android agora tem um projeto TWA em `android/` e os artefatos assinados são preparados por `android/build-release.ps1`; o AAB de Play Console fica em `android/release/`. Esses artefatos são locais e ainda não foram publicados em nenhuma loja.

O Android depende do site JARVIS e da associação em `/.well-known/assetlinks.json`. O APK direto está assinado com o certificado associado no arquivo-fonte `frontend/public/.well-known/assetlinks.json`. A assinatura do Google Play poderá ser diferente e deverá ser adicionada após criar o app na Play Console.

## Builds automaticos por commit

O workflow `.github/workflows/ci.yml` valida e arquiva builds de web, Windows e Android de teste por push/pull request. A release `v2.0.0` publica os instaladores Windows e Android assinados como assets públicos. Isso não implanta a interface na VPS nem publica o app nas lojas; mudanças web precisam de deploy e mudanças nativas exigem nova release. Leia [CI_CD_GUIDE.md](CI_CD_GUIDE.md) para os detalhes.

### IA local híbrida — 2026-10-14

A Central de Integrações agora permite configurar Ollama em `/integrations`, descobrir modelos instalados, testar conectividade e escolher `Ollama` como provedor principal. No modo automático, o Brain/chat/voz tentam Ollama primeiro e recorrem aos provedores OpenAI e Gemini quando o endpoint estiver indisponível. O endpoint aceita loopback, IP privado literal ou o nome interno `ollama` na rede Compose; URLs públicas são recusadas. A API Ollama não tem autenticação própria, portanto não publique a porta 11434. O runtime/modelo ainda não estão instalados; a VPS precisa de mais margem de memória antes de ativar o serviço. Auditoria e próximos passos em [LOCAL_AI_AUDIT.md](LOCAL_AI_AUDIT.md).

### Voz personalizada do JARVIS
Na Central de Integrações, configure a chave Fish Audio e use **Selecionar MP3 e clonar voz** para enviar uma amostra MP3 diretamente à Fish Audio. O modelo é criado com visibilidade privada; o arquivo não é persistido pelo JARVIS. Após o clone, Fish Audio fica selecionado como provedor TTS. O endpoint aceita MP3 de até 8 MB e exige administrador autenticado.

### Diagnóstico autenticado
`GET /api/health/public` fornece somente o estado básico de disponibilidade. `GET /api/health/full` exige autenticação e lê as configurações do usuário autenticado para mostrar n8n, WhatsApp/Evolution e Home Assistant. O endpoint completo pode incluir contagens financeiras e registros recentes; mantenha-o atrás da sessão do JARVIS e use a rota pública para monitores externos.

## Atualizacao de producao 2026-10-15 — release d9487c4

O health detalhado passou a exigir JWT e usa status de integrações do usuário autenticado. CI verde para backend/testes, companion Windows e APK de validação Android. Em produção, frontend 200, health público 200, health detalhado 401 sem sessão e 200 autenticado, banco e scheduler saudáveis. O teste GET da Evolution retornou sessão `open`; webhook e workflows não foram executados. Home Assistant está sem configuração e precisa de URL alcançável pela VPS e token de acesso.

## Voz do navegador e disponibilidade dos provedores — 2026-10-15

A seleção automática foi atualizada para priorizar vozes masculinas pt-BR identificadas pelo nome; “Brasil” não é mais tratado como marcador masculino. Dois testes cobrem o caso de Google Português do Brasil versus Microsoft Antonio. CI da release `91d297c` passou em validate, desktop e android; o frontend foi recompilado sem cache e o bundle público confirmado contém o seletor novo. Naquela versão, o usuário usava `browser`, e nenhum provedor remoto tinha chave/voice ID configurados. Configure em `/settings/integrations` e escolha `auto` para habilitar preferência por quota disponível.

## Voz automática — correção do teste e cota Fish Audio

Na Central de Integrações, os botões de carregar vozes e testar a síntese salvam primeiro os campos atualmente preenchidos. Isso evita testar com uma configuração anterior ainda persistida. A consulta Fish Audio pede explicitamente o sinalizador de crédito grátis e reconhece essa elegibilidade mesmo quando não há saldo numérico. No modo automático, só são usados provedores com cota confirmada e suficiente; uma consulta indisponível faz o JARVIS tentar o próximo provedor, sem arriscar consumo às cegas. Para ativar síntese remota ainda é necessário configurar chave válida e voice ID.

A release frontend `1cd1170` e backend `116225f` estão implantadas na VPS. Ambos passaram smoke tests HTTP 200; a consulta Fish solicita explicitamente o estado do crédito grátis. O teste de áudio premium ainda depende de credenciais novas cadastradas em `/settings/integrations`.

## Voz do navegador — validação masculina — 2026-10-15

O seletor local ignora uma preferência salva para a voz Google genérica e procura uma voz masculina identificável, priorizando pt-BR. Se o navegador só oferecer uma voz genérica/feminina, a aplicação não a reproduz como se fosse a voz masculina do JARVIS; agora Piper fornece síntese pt-BR local por `/settings/integrations`, com Fish Audio e ElevenLabs opcionais. O botão **Testar voz** aguarda o fim da reprodução e informa sucesso, erro, indisponibilidade ou timeout.

## Piper local — 2026-10-15

O endpoint autenticado `/api/voice/speech` pode usar o serviço Piper em `http://piper:5000` pela rede privada do Compose. O serviço carrega um modelo pt-BR por vez, limita o texto a 1.000 caracteres e roda com 1 CPU/512 MB. O áudio WAV é enviado sem cache. O modo automático tenta Piper primeiro; Fish Audio segue disponível como fallback com cota confirmada e ElevenLabs só entra quando o administrador habilita a opção.

Piper usa licença GPL-3.0; consulte `tts/piper/NOTICE.md` antes de redistribuir.

Na VPS compartilhada, Kokoro e Chatterbox ainda não foram instalados: há 4 vCPUs, nenhum GPU e já existe uso de swap enquanto outros sites estão ativos. Esses dois motores permanecem pendentes de benchmark isolado e não são apresentados como disponíveis até uma geração de áudio validada.

Em **Configurações > Voz**, o botão **Testar voz** mostra a mensagem segura retornada pelo TTS quando a geração falha. O JARVIS não substitui a voz local/remota pela voz Google genérica.

## Segurança de conta — AUTH-001

O painel administrativo exige TOTP no login: no primeiro acesso, a senha válida inicia o enrollment e exibe um QR compatível com Google Authenticator, Microsoft Authenticator e aplicativos TOTP similares. O segredo é cifrado com `TOTP_ENCRYPTION_KEY`; códigos de recuperação são exibidos uma vez e armazenados somente como hashes. Códigos TOTP e de recuperação são de uso único; desativar MFA exige senha e um código válido e revoga sessões antigas. Respostas da API de autenticação usam `Cache-Control: no-store`. A chave TOTP precisa ter pelo menos 32 caracteres, ser distinta de `JWT_SECRET` e receber backup protegido. O parser do segredo aceita apenas o envelope `totp:v1` canônico, com IV de 12 bytes, tag GCM de 16 bytes e ciphertext não vazio. AUTH-001 segue em revisão; CI da branch e provisionamento operacional da chave ainda não foram confirmados, e não houve deploy.

## Agent Sync V1 — estado do protocolo

O coordenador local verifica positivamente o container descartável conhecido antes de migrations/testes no PostgreSQL; o fluxo de validação não executa seed global, pois ele inclui dados de perfil/demo. Os testes criam fixtures sintéticas próprias e não limpam memórias/tarefas por prefixo global. O Codex desenvolvedor roda sem rede e sem as variáveis/credenciais do banco. Essa fronteira é intencional: o desenvolvedor edita testes e o coordenador os executa depois. Os registros distinguem tarefa bloqueada (`blocked`), validação local falha (`validation_failed`), execução sem diff (`no_changes`) e rejeição real do revisor (`review_rejected`). Um ciclo sem diff não chama o revisor e nunca avança a tarefa para `IN_REVIEW`. Scheduler segue pausado.

## MEM-001 — regressões de memória (2026-10-17)

Adicionada suíte `backend/src/memoryIsolation.integration.test.ts` para isolamento por usuário, exclusão/cascata, concorrência e contexto compartilhado entre chat e WhatsApp com históricos separados. Nenhum comportamento de retenção, schema ou módulo de produção foi alterado. Execução PostgreSQL reservada ao coordenador por opt-in explícito; no sandbox os cinco casos são ignorados deliberadamente.

Cobertura, limites dos dublês, resultados locais e procedimento de revisão: [MEM-001-VALIDATION](docs/jarvis/tasks/MEM-001-VALIDATION.md). Aceite PostgreSQL concluído no host pelo coordenador: 5/5 casos de MEM-001 aprovados (0 skips); backend validate aprovado com 87 testes (10/10 suítes); frontend validate aprovado com 49 testes (9/9 suítes); builds e git diff --check aprovados. Tarefa pronta para IN_REVIEW.

## SEC-002 — gate de destino da rotação

A CLI `settings:rotate` aceita somente `--dry-run`. Antes de rotação, criação de backup ou restauração, o sistema exige identidade positiva do PostgreSQL descartável por Docker e SQL; rotação/restauração confirmam a conexão transacional que executa a operação. Hostname loopback, nome com `test` e flags não liberam outros bancos. `enc:v1` e `enc:v2` também exigem exatamente cinco segmentos; formatos com sufixos são rejeitados. Testes atuais e limitações: [SEC-002-VALIDATION](docs/jarvis/tasks/SEC-002-VALIDATION.md). A revisão independente do código não tem achados abertos conhecidos; SEC-002 permanece em progresso até o gate formal `reviewed_continue`.
