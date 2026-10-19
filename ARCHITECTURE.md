# Arquitetura

## Agent Sync local supervisionado

O módulo `tools/agent-sync` roda no PC do operador, separado do backend que atende a VPS. O planejador e o revisor usam a OpenAI API; o desenvolvedor usa o Codex SDK sobre o Codex CLI local autenticado. O runner valida a tarefa selecionada contra os estados/dependências do plano, invoca comandos de validação fixos, envia ao revisor somente um diff local sanitizado até 64 KiB e persiste metadados de execução locais ignorados pelo Git. O Codex recebe `workspace-write`, sem rede e com política de aprovação `on-request`; tarefas de risco, diffs sensíveis, falhas e limites interrompem o ciclo. A cadência permanece desligada e o processo não tem acesso à VPS nem executa deploy.

## Health e status de integracoes

`/api/health/full` exige autenticação. Logs, dados financeiros, estados de provedores de IA e informações do scheduler são filtrados/redigidos para o usuário autenticado; somente `admin` solicita dados globais e métricas HTTP agregadas. O health público não revela erros ou horários internos do scheduler. Métricas HTTP são contadores voláteis por processo, não histórico durável nem métricas agregadas de cluster. Status `configured` não implica conectividade; sondagens externas devem informar `not_checked` até validação real.

- `/api/health/public` e a interface para monitores sem sessao e retorna somente disponibilidade resumida.
- `/api/health/full` exige JWT e calcula n8n, WhatsApp/Evolution e Home Assistant com as configuracoes do usuario autenticado; chaves permanecem redigidas.
- Dados detalhados de operacao, como contagens financeiras e mensagens de falhas recentes, nao devem ser publicados em endpoints de monitoramento publico.
- O middleware HTTP gera `X-Request-Id` por requisição (ignora IDs enviados pelo cliente), mantém contadores e só escreve log operacional para respostas 5xx, contendo método, template de rota, status e duração, sem URL/query/body. O header é exposto via CORS.
- `/api/health` separa liveness e readiness; falha do banco retorna estado `degraded` sem executar consultas dependentes. Integrações sem probe ativo ficam `not_checked`, erro ao consultar estado fica `unknown`; configuração nunca prova conectividade.
- O health autenticado inclui contadores HTTP desde o início do processo e falhas recentes sanitizadas. Respostas 5xx geram um registro genérico `http.request_failed`, limitado a um por rota/status a cada minuto por processo. Contadores são voláteis e não representam monitoramento externo.

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

Chat, voz, mobile e WhatsApp fornecem ao Brain as últimas mensagens da conversa persistida. O Brain limita o histórico a 8 mensagens e 3.000 caracteres por mensagem, preservando contexto sem deixar a solicitação crescer sem limite. A busca web também recebe esse histórico, inclusive em acompanhamentos curtos; consultas financeiras e de status continuam usando suas ferramentas locais.

Tambem existe `/api/chat/stream`, que retorna eventos SSE com fallback de streaming. A estrutura esta pronta para streaming token a token futuro.

## Orquestracao de IA e tools

`intentDetectorService` classifica intencoes como chat normal, memoria, tarefa, health, n8n, WhatsApp e Home Assistant. `toolRegistryService` descreve tools com nivel de seguranca (`safe`, `confirmation_required`, `forbidden`) para evoluir para function calling real sem abrir brecha para acoes perigosas.

No Brain, intenções `memory.create` e `task.create` somente preparam uma proposta e retornam `needsConfirmation`; nenhuma escrita é feita durante a interpretação. A rota autenticada `/api/brain/execute-draft` valida a estrutura do pedido e permanece deliberadamente sem executor até haver autorização vinculada ao usuário, alvo imutável, expiração e uso único. O fluxo administrativo de login integra TOTP, armazenamento cifrado, códigos de recuperação e revogação por `authVersion`, conforme a seção AUTH-001 abaixo; sua implantação ainda não foi validada.

## OpenAI

`openAiService` usa OpenAI quando `OPENAI_API_KEY` existe. Se a API falhar por quota, rede ou credencial, o backend registra log e retorna fallback local seguro, sem derrubar chat ou voz.
O health full expoe somente status operacional e modelo, nunca a chave.

## Gemini fallback

`geminiService` e acionado automaticamente quando OpenAI esta sem chave ou falha. A ordem e: OpenAI, Gemini, fallback local seguro. O frontend recebe apenas status e modelo, nunca a API key.

## Memoria

`memorySearchService` faz busca relevante por termos normalizados e tags. Pgvector esta planejado para memoria semantica futura sem ser dependencia obrigatoria da versao atual.

## Voz

A pagina Voz usa Web Speech API quando disponivel, envia transcricao para `POST /api/voice/process`, le resposta com `SpeechSynthesis`, mostra historico e aviso de privacidade. Cada turno é persistido e reutiliza a conversa autorizada do usuário. A opcao visivel de conversa com consentimento reativa o microfone depois da resposta falada; sem essa opcao, cada captura exige clique. Wake word "Ei Jarvis" fica apenas planejada.

## Integracoes

- n8n: `N8nService` envia payload para `N8N_WEBHOOK_URL`; sem URL retorna `not_configured`.
- n8n teste: `POST /api/n8n/test` envia payload seguro e grava logs redigidos.
- WhatsApp: `WhatsAppService` usa Evolution API, exige confirmacao para envio, valida telefone e nao faz disparo em massa.
- WhatsApp webhook: auto reply ignora mensagens do proprio JARVIS e grupos para reduzir risco de loop.
- Evolution manager: `modules/whatsapp/evolutionManagerService.ts` gerencia conexao pelo painel, normaliza QR Code/pairing code, normaliza estado de conexao, tenta endpoints alternativos da Evolution e retorna `manual_action_required` quando a versao nao suportar automacao.
- WhatsApp QR flow: `/api/whatsapp/evolution/*` expoe rotas admin protegidas para status, instancia, QR, polling de conexao, logout/restart, reset seguro e configuracao de webhook sem retornar API key real.
- Reset Evolution: o reset de instancia exige confirmacao textual `RESETAR EVOLUTION`, tenta logout/delete por endpoints conhecidos e retorna `manual_action_required` quando a versao da Evolution nao permite automacao.
- Controle Financeiro: `FinanceIntegrationService` guarda URL/token por usuario em `Setting`, retorna token apenas mascarado, testa `/api/v1/me`, consulta `/api/v1/summary/month` e cria lancamentos em `/api/v1/transactions`.
- Controle Financeiro via WhatsApp: antes do orquestrador geral, o webhook tenta interpretar mensagens financeiras com entrada/saida e valor; se reconhecer, registra no sistema externo ou pede complemento sem expor segredo.
- Home Assistant: `HomeAssistantService` lista entidades agrupadas, chama servicos e conversa via `conversation.process`; dominios sensiveis exigem confirmacao.
- Vinculo Home Assistant: `/smart-home/setup` guia a criação do Long-Lived Access Token, salva URL/token pela configuração protegida de integração, testa `/api/` e consulta `/api/states` somente para descoberta. A tela não executa serviços durante o pareamento.
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

`GET /api/logs` retorna a linha do tempo operacional autenticada com filtros por nivel, modulo, periodo e busca. Administradores conseguem enxergar logs globais e por usuario; usuarios comuns ficam restritos aos seus registros. `GET /api/logs/summary` alimenta o painel `/logs` com totais por nivel, modulos mais ativos e ultimos pontos de atencao.

O webhook do WhatsApp grava eventos operacionais redigidos em `SystemLog`: recebimento, ignorado por falta de `ei jarvis`, `fromMe`, grupo, processamento, previa de extrato e resposta automatica desativada. Isso permite diagnosticar se a Evolution chamou a API sem expor telefone completo, payload bruto, token ou conteudo sensivel.

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

OpenAI e Gemini tambem podem ser configurados por usuario em `/settings/integrations`. `aiProviderConfigService` le as chaves criptografadas e modelos da tabela `Setting`; `openAiService` e `geminiService` recebem o ID da conta nas chamadas de chat e Brain. Variaveis de ambiente continuam como fallback para compatibilidade. `ai_primary_provider` guarda `auto`, `openai` ou `gemini`; `auto` preserva OpenAI primeiro e Gemini como reserva. A rota administrativa autenticada `GET /api/integrations/models/:provider` consulta os modelos disponiveis para a chave, filtra OpenAI para IDs de modelos conversacionais e Gemini para modelos com `generateContent`. A escolha usa o provedor selecionado primeiro, tenta o outro quando configurado e termina no fallback local. O frontend recebe apenas status, origem e nomes de modelo; nunca recebe chaves.

## Assistente Universal de Configuracao

`IntegrationSetupService` alimenta `/api/integrations/setup/*`, `/integrations/setup-wizard` e `/integrations/setup-summary`. O servico padroniza provider, status, campos mascarados, URLs publicas, acoes disponiveis e checklist manual para API publica, IA, n8n, WhatsApp/Evolution, Home Assistant, financeiro, documentos/RAG, monitoramento, backup, mobile/PWA e seguranca.

O Controle Financeiro externo e vinculado por `POST /api/finance/auth/login`; se a API exigir 2FA, o frontend guarda apenas o desafio temporario em memoria e confirma por `POST /api/finance/auth/challenge`. O backend troca as credenciais por token, armazena somente o token criptografado em `Setting` e nunca devolve o token. `/api/finance/test-connection` valida a sessao consultando `/api/v1/me`. A senha e o codigo TOTP nao sao persistidos nem registrados em logs.

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

## Pesquisa web do JARVIS

O Brain aciona Google Search Grounding do Gemini para perguntas de conhecimento e pedidos de informação atual. A busca ocorre no backend, usa a chave Gemini já configurada e devolve URLs e títulos associados à resposta para exibição nos clientes web e WhatsApp. Resultados externos são tratados como dados não confiáveis; segredos e credenciais não são encaminhados à busca. Se o grounding falhar, a resposta segue pelo provedor normal e não é apresentada como pesquisada. O recurso pode consumir quota/cobrança da conta Gemini.
# Síntese de voz (TTS)

As credenciais ElevenLabs e Fish Audio ficam em `Setting` criptografadas por `encryptSettingValue`; o endpoint de status retorna apenas indicador e chave mascarada. Em modo automático, `ttsService` tenta primeiro o Piper privado e depois provedores remotos com cota confirmada. ElevenLabs exige autorização específica para fallback. A consulta manual `/api/integrations/tts/quotas` mostra somente uso e disponibilidade, sem credenciais. O frontend envia texto autenticado para `/api/voice/speech`, recebe WAV (Piper) ou MP3 (provedores remotos) sem cache e reproduz localmente; a resposta inclui o motor que sintetizou.

NVIDIA tem política backend `NVIDIA_ZERO_SPEND`, persistida por usuário em `Setting` junto à configuração do provedor. A política fixa budget R$ 0,00, mês-calendário BRT, operações LLM/STT/TTS desativadas e bloqueio quando preço, quota ou entitlement são desconhecidos. A configuração transacional registra modelo/endpoints; tentativas bloqueadas gravam somente metadados por usuário, operação, modelo e período em `SystemLog`. Não existe caminho de chamada real nesta versão. Se NVIDIA estiver selecionada como IA principal, a única reserva permitida é Ollama local; STT não cai automaticamente para OpenAI. A documentação NVIDIA consultada sobre APIs do catálogo e invocação NVCF não prova custo zero nem teto de cobrança específico da conta.

O serviço Piper expõe apenas `/health` e `/synthesize` na rede privada do Compose, carrega um modelo pt-BR por vez, valida WAV e limita o texto. Docker restringe o container a 1 CPU e 512 MB. Kokoro e Chatterbox aguardam benchmark, pois não há GPU e a VPS é compartilhada.

## Instalacao e assistente flutuante

`/install` apresenta a instalacao do PWA em Android/iOS e distribui o companion nativo x64 para Windows; o PWA continua instalavel por Chrome/Edge no desktop. O componente `JarvisFloatingAssistant` pertence ao `AppLayout`, usa `/voice/process` e `speakJarvis`, e so inicia captura depois de ativacao manual. O modo conversa e visivel e para quando o painel fecha ou a aba fica oculta.

## Companion local do Windows

`desktop/` e um shell Electron para Windows que abre apenas o dominio oficial do JARVIS em HTTPS. O renderer tem `nodeIntegration=false`, `contextIsolation=true`, sandbox, navegacao restrita e acesso IPC verificado pela origem; o preload expoe apenas comandos locais tipados, abertura da janela e autorizacao temporaria do microfone. `commandPolicy.ts` aceita uma gramatica curta e fechada. O processo principal mapeia somente apps internos, atalhos exatos do menu Iniciar e pastas pessoais conhecidas; leitura de nomes de arquivos aparece apenas em dialogo nativo local. Criacoes, abertura de atalhos/documentos e exclusoes pedem confirmacao; exclusoes usam a Lixeira. O companion nao expoe shell, terminal, caminhos arbitrarios ou permissoes administrativas. Hotword sempre ativa nao existe: `Ctrl+Shift+J` abre a janela, e voz exige clique explicito que libera audio por 60 segundos para o dominio confiavel.

O painel flutuante possui modo imersivo com Fullscreen API e fallback visual em janela, HUD responsivo e saida por `Esc`. A tela cheia e da janela JARVIS, nao uma sobreposicao sobre outros jogos.

## Versao da aplicacao

Desde 2026-10-14, os pacotes frontend, backend e desktop usam a versao de release `2.0.0`; o manifesto PWA, os titulos web e a janela Electron exibem JARVIS 2.0. A versao publicada na Central de Downloads e mantida separada dos artefatos locais para nao afirmar que uma release nao publicada esta disponivel.
# Auditoria de dispositivos e navegação — 2026-10-14

O estado implementado e as lacunas de pareamento autenticado, Android nativo, Home Assistant e Waze estão em [PROJECT_AUDIT_MULTIPLATFORM.md](PROJECT_AUDIT_MULTIPLATFORM.md). A navegação Waze do PWA usa deep links oficiais sem armazenar destino no backend. O bridge Electron continua local; ainda não há protocolo de agente remoto/dispositivo no backend.
# Central de Downloads — 2026-10-15

`/downloads` lista o instalador Windows x64 e o APK Android assinado JARVIS 2.0.0; os botões e QR apontam para os arquivos de uma release pública GitHub e o checksum acompanha os dois pacotes. A tag `v2.0.0` aciona `.github/workflows/release-downloads.yml`, que compila o EXE e publica os artefatos. O APK usa o certificado que corresponde ao `assetlinks.json` do domínio. O EXE continua sem assinatura Authenticode. O deploy do frontend para a VPS é separado e não é feito por esse workflow. Manual em [DOWNLOADS_CENTER_GUIDE.md](DOWNLOADS_CENTER_GUIDE.md).

### Abertura de aplicativos e jogos

`parseLocalCommand` continua usando uma gramática local fechada. `findStartMenuShortcut` consolida atalhos com o mesmo alvo/argumentos para evitar falsos conflitos entre atalhos do usuário e globais. Rust é a única integração de jogo dedicada: o processo principal encontra o Steam via atalho confiável, verifica `appmanifest_252490.acf` e `RustClient.exe` nas bibliotecas em `libraryfolders.vdf`, solicita confirmação nativa e chama `steam.exe -applaunch 252490` com `shell: false`. O navegador/PWA não tem essa permissão local.
## Distribuicao multiplataforma — 2026-10-14

- Windows: companion Electron x64, instalador NSIS por usuário, autenticado pelo site JARVIS. A janela abre o origin HTTPS remoto e exige internet.
- Android: aplicativo TWA com package `br.com.juninnzxtec.jarvis.twa`, versão 2.0.0, Android mínimo 24 e target 36. O conteúdo é servido pelo mesmo site; a chave de upload fica local e fora do Git.
- O APK de instalação direta foi assinado com a chave local, e o fingerprint está configurado em `frontend/public/.well-known/assetlinks.json`. A publicação na Play Store usa uma identidade/certificado App Signing diferente e exige atualização da associação após cadastro na loja.
- A publicação em Microsoft Store/Play Console depende da conta do publicador, identidade reservada, ficha da loja, declarações legais e certificação da loja.

## CI multiplataforma — 2026-10-14

O workflow `.github/workflows/ci.yml` valida e arquiva builds de web, Windows e Android debug. O workflow `.github/workflows/release-downloads.yml`, ao receber uma tag `v*`, publica o instalador Windows e o APK Android assinado em GitHub Releases. O deploy do frontend na VPS e o envio às lojas continuam separados; veja `CI_CD_GUIDE.md`.

Web, Windows e TWA Android carregam a interface do domínio JARVIS. Uma publicação do frontend/API na VPS propaga as mudanças web para esses clientes ao recarregar. Alterações no companion nativo ou no wrapper Android requerem uma nova release e aprovação/distribuição pelas respectivas lojas.

## IA local híbrida (2026-10-14)

O roteador central `openAiService.complete()` agora tenta Ollama primeiro no modo `auto`, seguido de OpenAI e Gemini. A preferência explícita Ollama também mantém os dois provedores cloud como fallback. `ollamaService` usa `/api/tags` para verificar/listar modelos e `/api/chat` sem streaming, contexto limitado a 4096, timeout de 90 s e descarrega o modelo após 30 s sem atividade. A configuração por usuário/admin fica na tabela `Setting`; somente status e URL privada aparecem no frontend. O backend aceita `localhost`, o nome interno Compose `ollama`, loopback, RFC1918 e Tailscale CGNAT; exige URL raiz e bloqueia redirects. Nunca exponha a porta 11434 à internet, pois Ollama não autentica chamadas. A instalação na VPS está suspensa enquanto a memória disponível continuar em 3,4 GiB e o swap em uso; ver `LOCAL_AI_AUDIT.md`.

### TTS Fish Audio com referência de voz
O serviço `ttsService` armazena a chave Fish Audio criptografada e o ID da voz. O endpoint administrativo `/api/integrations/tts/fish-audio/clone` recebe somente áudio MP3 (limite de 8 MB), valida o cabeçalho, envia a amostra ao endpoint oficial `/model` com visibilidade privada e grava o ID retornado. A síntese usa `/v1/tts` com `reference_id`; o MP3 não é salvo em disco nem em logs.
# Health e status de integrações

- `/api/health/public` é a interface para monitores sem sessão e retorna somente disponibilidade resumida.
- `/api/health/full` exige JWT e calcula n8n, WhatsApp/Evolution e Home Assistant com as configurações do usuário autenticado; chaves permanecem redigidas.
- Dados detalhados de operação, como contagens financeiras e mensagens de falhas recentes, não devem ser publicados em endpoints de monitoramento público.

## Health detalhado protegido — 2026-10-15

- `/api/health/full` agora exige JWT e reporta n8n, WhatsApp/Evolution e Home Assistant usando as configurações do usuário autenticado.
- O health completo deixa de ser uma rota pública, pois inclui eventos recentes e contagens operacionais. Monitores sem sessão devem usar `/api/health/public`.
- Tokens e chaves seguem mascarados; a validação autenticada é feita no CI porque esta cópia não tem banco local configurado.

## Selecao da voz local e estado de provedores

`selectBestJarvisVoice` só seleciona vozes cujo nome identifica uma voz masculina; prioriza pt-BR, depois outras vozes portuguesas e, por fim, outras línguas. Se uma preferência antiga apontar para a voz Google genérica ou não houver voz masculina identificável, o JARVIS não reproduz silenciosamente uma voz feminina. `testVoice` aguarda o evento real de término ou erro para informar o resultado. A lista depende do sistema operacional e navegador; configuração remota em `ttsService` continua sendo o meio para uma voz consistente entre dispositivos. No runtime, o modo `auto` consulta cota dos provedores configurados antes de sintetizar.

Na Central de Integrações, carregar vozes e testar áudio persistem primeiro os campos atuais da tela para evitar requisições com chaves antigas. A consulta de crédito Fish Audio usa `check_free_credit=true`, conforme o OpenAPI oficial; `parseFishAudioQuota` considera `has_free_credit=true` suficiente para marcar a conta disponível, mesmo sem saldo numérico. `canUseTtsProvider` só permite síntese automática quando a API confirmou cota suficiente; cota desconhecida/esgotada é pulada antes de chamar o endpoint de áudio.

O teste de voz apresenta mensagens seguras da API autenticada quando a geração falha, incluindo status HTTP quando disponível. O frontend lê apenas o campo `message`, sem registrar credenciais ou o corpo do áudio. A reprodução do navegador segue restrita a voz masculina identificável e não usa a voz Google genérica como fallback silencioso.
# Voz e prosódia

O serviço `ttsService` mantém credenciais remotas criptografadas e envia os parâmetros de estabilidade, semelhança, estilo e velocidade ao endpoint ElevenLabs. Faixas são limitadas no backend. Piper e Fish Audio permanecem disponíveis; os novos controles são específicos do ElevenLabs e não alteram esses provedores.

## Conversas e integrações por usuário

As rotas de conversa do chat e da voz têm timeout de cliente de 90 segundos para acomodar pesquisas e integrações lentas. Falhas do envio textual são apresentadas ao usuário e mantêm o prompt disponível para nova tentativa. Ferramentas do Brain que consultam status ou entidades do Home Assistant, n8n ou health recebem o `userId` autenticado para resolver as credenciais/configurações daquele usuário.
# Autenticação administrativa com MFA (AUTH-001)

Administradores autenticam primeiro com senha e concluem um desafio TOTP. No primeiro login, a senha válida gera um token de setup curto; a API entrega o QR de provisionamento e só ativa MFA após validar o primeiro código. Segredos TOTP pendentes e ativos usam AES-256-GCM com a variável backend `TOTP_ENCRYPTION_KEY`, que deve ser distinta de `JWT_SECRET`; códigos de recuperação aleatórios são salvos como hashes SHA-256. O backend consome cada contador TOTP uma vez, consome cada recovery code uma vez e incrementa `authVersion` para revogar JWTs anteriores ao ativar/desativar MFA ou usar recovery. O parser exige envelope `totp:v1` com exatamente três campos após o prefixo e base64url canônico, IV de 12 bytes, tag de 16 bytes e ciphertext não vazio.

O estado e a desativação ficam em Configurações, visíveis apenas para administradores. Para desativar, exige-se senha atual e código TOTP/recovery; a API devolve uma sessão nova e invalida as antigas. O controle global `/api/auth` já aplica rate limit compartilhado. Esta implementação está em revisão isolada; não foi implantada nem ativada em produção.

## AUTH-001 — revisão adicional de cache

Respostas em toda a rota `/api/auth` enviam `Cache-Control: no-store` e `Pragma: no-cache`, incluindo desafios JWT, QR/segredo de enrollment, recovery codes e respostas de login. A suíte de integração verifica o cabeçalho nas respostas de login, enrollment e MFA. Isso reduz o risco de armazenamento por browser ou intermediários; HTTPS e proteção do cliente continuam necessários.

## Agent Sync — isolamento e estados de execução

O processo local do coordenador mantém acesso ao URL do PostgreSQL descartável e executa as validações; o processo Codex recebe um ambiente de allowlist, sem variáveis de banco/OpenAI, e uma thread com rede desativada. Não há acesso direto do desenvolvedor ao DB, por desenho. `blocked` significa bloqueio de planejamento/elegibilidade; `validation_failed` registra falha da suíte do coordenador antes da revisão; `no_changes` registra ausência de diff sem chamar GPT; `review_rejected` só é persistido após chamada efetiva do revisor. `testsPassed` registra exclusivamente o resultado da suíte local do coordenador, não a implementação dos critérios.

O preflight PostgreSQL aceita somente `127.0.0.1:55433/jarvis_agent_sync_test` após confirmar via `docker inspect` o container `jarvis-agent-sync-postgres-test`, imagem PostgreSQL 16, estado saudável, publish somente em loopback, ausência de mounts e armazenamento temporário. Usuário/senha da URL devem corresponder à configuração do container sem serem impressos; as suítes ainda confirmam database, role, porta e IP interno do servidor antes de escrever. Sem essa prova, o coordenador bloqueia migrations/testes e as integrações Vitest não são habilitadas. O runner não executa seed global; os testes provisionam fixtures sintéticas e a limpeza é limitada a identidades criadas pelo próprio run.

## MEM-001 — regressões de memória (2026-10-17)

Adicionada suíte `backend/src/memoryIsolation.integration.test.ts` para isolamento por usuário, exclusão/cascata, concorrência e contexto compartilhado entre chat e WhatsApp com históricos separados. Nenhum comportamento de retenção, schema ou módulo de produção foi alterado. Execução PostgreSQL reservada ao coordenador por opt-in explícito; no sandbox os cinco casos são ignorados deliberadamente.

Cobertura, limites dos dublês, resultados locais e procedimento de revisão: [MEM-001-VALIDATION](docs/jarvis/tasks/MEM-001-VALIDATION.md). Aceite PostgreSQL concluído no host pelo coordenador: 5/5 casos de MEM-001 aprovados (0 skips); backend validate aprovado com 87 testes (10/10 suítes); frontend validate aprovado com 49 testes (9/9 suítes); builds e git diff --check aprovados.

## SEC-002 — separação de chaves e versionamento de settings (2026-10-18)

Desacoplamento estrito entre `SETTINGS_ENCRYPTION_KEY` e `JWT_SECRET`. Novas configurações usam `enc:v2:` (AES-256-GCM, chave derivada exclusivamente da chave dedicada de pelo menos 32 caracteres). `enc:v1:` mantém fallback de leitura legado para `JWT_SECRET`; v2 nunca usa JWT e lê a chave anterior somente durante a rotação. Formatos desconhecidos, estrutura que não tenha exatamente cinco segmentos, integridade inválida e texto não UTF-8 falham fechados. `settingsRotationService` produz backup v2 com valores cifrados e HMAC derivado da chave dedicada, vinculando ciphertexts e metadados antes de mutações em transação serializável. Restauração valida HMAC e decifra todos os valores antes da transação; backups v1 sem autenticação são rejeitados. `--dry-run` é somente leitura. CLI e serviço aceitam rotação/backup/restauração somente após identidade positiva do PostgreSQL descartável por Docker e SQL; nome do banco ou hostname não bastam e nenhuma flag libera outro destino. Testes usam chaves sintéticas; detalhe e evidência atual estão em [SEC-002-VALIDATION](docs/jarvis/tasks/SEC-002-VALIDATION.md). SEC-002 continua `IN_PROGRESS` até o gate formal `reviewed_continue`; nenhuma rotação real foi executada.

## NVIDIA NIM — conversa, STT e TTS (2026-10-19)

A chave NVIDIA continua criptografada por usuário em `Setting`, e o catálogo curado continua disponível para configurar o modelo. A execução de chat, transcrição, síntese, teste de inferência e teste de saúde remoto está desativada pela política backend `NVIDIA_ZERO_SPEND`. A regra é persistida transacionalmente por usuário junto aos parâmetros NVIDIA, registra modelo/endpoints e operações LLM/STT/TTS, fixa budget de R$ 0,00 por mês-calendário em `America/Sao_Paulo` e bloqueia quando preço, quota ou entitlement não estão provados. Tentativas negadas gravam somente metadados de operação, modelo e período, sem chave, texto ou áudio.

Quando NVIDIA está selecionada como IA principal, o roteador só tenta Ollama local; não chama OpenAI ou Gemini automaticamente. STT NVIDIA retorna bloqueio sem cair para OpenAI. NVIDIA é removida do fallback remoto TTS; se for configurada como preferência, apenas Piper local pode ser tentado. OpenAI, Gemini, Ollama, Fish Audio e ElevenLabs preservam suas configurações independentes. A documentação oficial consultada sobre endpoints NIM, acesso ao catálogo e APIs NVCF não comprova gratuidade ou teto de gastos para esta conta; não foram feitas chamadas NVIDIA reais.
