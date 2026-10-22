# SYSTEM_STATUS_REPORT

## LIFE-001 — fuso horário por usuário

Implementação local: `User.timezone` com padrão `America/Sao_Paulo`, migration compatível para registros existentes, endpoints autenticados do próprio perfil e controle em Configurações. Meu Dia usa o fuso persistido na classificação de prazos. Backend: 118 testes passaram, 61 foram pulados por gate de banco; frontend: 57 passaram; typechecks/builds passaram. Docker indisponível, portanto migration e teste autenticado com DB estão bloqueados; staging/produção não verificados.

## Revisão de observabilidade e isolamento — 2026-10-18

- Revisão do OBS-001 encontrou que `/api/health/full` permitia a qualquer usuário autenticado consultar falhas e contagens globais. A implementação local subsequente filtra logs e dados financeiros por usuário e limita o agregado global ao papel `admin`.
- Request IDs do servidor, logs HTTP sem URL/query/corpo, erros sem stack/mensagem brutos e readiness do banco foram revisados. Integrações marcadas `not_checked` não são consideradas conectadas.
- Métricas HTTP reiniciam com o processo e não são agregadas entre réplicas. Validação completa local com PostgreSQL descartável verificado: backend 158/158, frontend 49/49, Agent Sync 15/15, zero skips; typechecks/builds aprovados. Integração autenticada comprovou isolamento entre admin e usuário comum. A segunda revisão independente e smoke operacional continuam pendentes. Nenhum deploy ou acesso à VPS.
- Após a revisão do payload restante, métricas globais ficam apenas para admin; provedores de IA são consultados por usuário e scheduler não expõe erros/horários agregados a usuários comuns. Nova validação final: backend 159/159, frontend 49/49, Agent Sync 15/15, sem skips; builds/typechecks aprovados.

## Agent Sync local V1 — 2026-10-17

Foi preparado `tools/agent-sync` para executar o planejador/revisor OpenAI com o Codex CLI local. O dry-run confirmou a branch isolada e a tarefa elegível MEM-001; quatro testes do módulo e o typecheck passaram. A suíte real GPT→Codex→GPT não foi executada: `OPENAI_API_KEY` não está configurada neste ambiente. Não houve chamadas de modelo, timer, push, merge, deploy ou alteração na VPS. O scheduler permanece desativado.

## Atualizacao 2026-05-18 - Reset seguro da Evolution

Status: **APROVADO** para correcao operacional local.

- O painel `/whatsapp` agora possui reset seguro de instancia Evolution para casos em que o manager falha ao deletar ou a sessao nao sincroniza mensagens.
- Backend adicionou rotas protegidas para `POST /api/whatsapp/evolution/reset` e `DELETE /api/whatsapp/evolution/instances`, ambas exigindo confirmacao `RESETAR EVOLUTION`.
- O reset tenta logout e delete por endpoints conhecidos da Evolution e retorna `manual_action_required` se a versao da API nao permitir automacao.
- API key real continua criptografada em `Setting`; frontend recebe apenas status/mensagem segura.
- Testes atualizados cobrem reset com sucesso e rejeicao de confirmacao incorreta.

Ressalva real: a limpeza da instancia em producao depende da API key real e das permissoes/versao da Evolution. Se a Evolution bloquear delete via API, seguir checklist manual no painel.

## Atualizacao 2026-05-18 - CMD online de logs

Status: **APROVADO** para observabilidade local.

- `/logs` foi ampliado para funcionar como CMD online do JARVIS, com auto-refresh, filtros por nivel/modulo/busca, cards de resumo e linha do tempo.
- `GET /api/logs/summary` foi adicionado para totalizar as ultimas 12 horas por nivel e modulo.
- Webhook WhatsApp agora registra eventos seguros em `SystemLog`: `webhook_received`, `webhook_ignored`, `webhook_processing`, `statement_preview_created` e `auto_reply_disabled`.
- Logs nao exibem API key, token, senha, payload bruto do WhatsApp ou telefone completo.
- Diagnostico atual observado: WhatsApp/Evolution e n8n seguem `not_configured`; mensagens enviadas do proprio numero conectado podem ser ignoradas como `fromMe`.

Proximo passo: configurar Evolution API em producao, conectar QR no painel e validar se ao enviar mensagem aparece `whatsapp.webhook_received` em `/logs`.

## Checagem publica de URLs 2026-05-17

Status: **APROVADO** para disponibilidade HTTP basica.

| URL | HTTP | Tipo | Status operacional |
| --- | ---: | --- | --- |
| `https://jarvis.juninnzxtec.com.br` | 200 | HTML | Frontend publico online. |
| `https://apijarvis.juninnzxtec.com.br/api/health` | 200 | JSON | API oficial online. |
| `https://apijarvis.juninnzxtec.com.br/api/health/public` | 200 | JSON | Health publico online. |
| `https://apijarvis.juninnzxtec.com.br/api/health/full` | 200 | JSON | Health full online. |
| `https://n8njarvis.juninnzxtec.com.br` | 200 | HTML | n8n online; nao aparenta placeholder simples. |

Ressalva: nao foram testados login, webhook, rotas privadas, payloads, credenciais ou integracoes reais nesta rodada.

Data/hora da auditoria: 2026-05-16 16:29:54 -03:00

Diretorio usado: `E:\jarvis-home-assistant`

Status final: **APROVADO COM RESSALVAS**

## Validação completa 2026-05-16 19:11

- Commit validado: `8188a4c feat: enrich personal profile memory base`.
- Tag recente: `v1.1.1-personal-memory-base`.
- Backend: `npm install`, `npm audit --omit=dev`, `prisma generate`, `prisma validate`, `prisma migrate status`, `npm run seed:personal`, `npm run test`, `npm run validate` e `npm run build` passaram.
- Frontend: `npm install`, `npm audit --omit=dev`, `npm run test`, `npm run validate` e `npm run build` passaram.
- Banco/Prisma: PostgreSQL principal healthy, porta `127.0.0.1:5432`, migrations em sincronia.
- n8n local: `jarvis-n8n` e `jarvis-n8n-postgres` rodando; `status-n8n.ps1` retornou HTTP 200.
- Produção: frontend `jarvis` 200, API oficial `apijarvis` 200 JSON em `/health`, `/health/public` e `/health/full`, n8njarvis 200 HTML.
- Memórias pessoais: seed idempotente `created=0 updated=0 skipped=0 total=47`.
- Segurança: arquivos sensíveis ignorados; varredura não encontrou segredo real versionado.
- Ressalvas: backend/frontend dev locais offline no status, `jarvis/api` retorna frontend, `health/full` ainda usa flags env-based para n8n/WhatsApp/Home Assistant, E2E Playwright completo segue planejado.

Atualizacao operacional desta rodada:

- API publica oficial: `https://apijarvis.juninnzxtec.com.br/api`.
- Webhook WhatsApp/Evolution oficial: `https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`.
- Diagnostico OpenAI/Gemini refinado para `missing_key`, `invalid_key`, `quota_exceeded`, `model_not_found`, `network_error` e `api_error`.
- Scheduler passa a registrar erro de `tick_error` com detalhe redigido.
- WhatsApp nao trata OFX/CSV como audio; anexos geram previa de importacao.
- Guia `WHATSAPP_PRODUCTION_SETUP.md` criado.
- Fase Mobile/PWA adicionada com manifest, service worker seguro, icones, atalhos e tela `/mobile-assistant`, validada por testes, build e checagem local do manifest/service worker.
- Rodada WhatsApp/Evolution: guia de producao ampliado, payload bruto do webhook redigido antes de persistir, endpoints revisados e producao validada via health dedicado.
- Auditoria final completa: Docker Desktop foi iniciado, PostgreSQL subiu em `127.0.0.1:5432`, backend/frontend passaram em testes/validate/build, scripts status/validate/backup passaram e producao API dedicada respondeu health/full.
- Proximo passo operacional: estado local confirmado, backend/frontend revalidados, scripts reexecutados, producao validada pela API oficial, guia `DEPLOY_NEXT_STEPS.md` criado e configuracao Evolution/WhatsApp mantida como pendencia de credenciais reais.
- Fase 10: n8n proprio, scripts n8n, workflows, EventBus, IntegrationEvent, memoria semantica local, documentos/RAG preparado, CI inicial e documentacao 100000 adicionados.
- Base pessoal enriquecida: 47 memorias canonicas sobre Junior Rodrigues / Juninnzx, projetos, stack, preferencias, JARVIS, n8n, WhatsApp, financeiro, mobile/PWA, deploys e roadmap. O seed atualiza aliases antigos, remove duplicatas equivalentes e bloqueia conteudo sensivel.
- WhatsApp QR in-app: implementado fluxo local para conectar Evolution API pelo painel `/whatsapp`, com QR Code/pairing code, polling de status, configuracao automatica de webhook e fallback `manual_action_required` para variacoes de versao da Evolution.

## Ambiente

- Sistema local: Windows PowerShell.
- Docker: `29.4.3`.
- Docker Compose: `v5.1.3`.
- Node: `v24.15.0`.
- npm: `11.12.1`.
- PostgreSQL local: container `jarvis-postgres` healthy.
- Porta 5432: OK em `127.0.0.1`.
- Porta 3001: nao havia backend local ativo.
- Porta 5173: nao havia frontend local ativo.

## Git

- Repositorio: `https://github.com/juninnzx21/meujarvis.git`.
- Branch: `main`.
- Commit atual validado: `b09a7d6 test: run full jarvis system validation`.
- Status inicial: limpo.
- Status apos auditoria: relatorios atualizados localmente.

## Seguranca

Arquivos ignorados confirmados:

- `.env`
- `backend/.env`
- `backups/`
- `backend/node_modules/`
- `frontend/node_modules/`
- `frontend/dist/`
- `backend/storage/imports/`

Varredura de segredos:

- Foram encontrados padroes em `.env` locais ignorados, `.env.example`, documentacao com placeholders e codigo/testes com nomes de variaveis/mocks.
- Nao foi identificado segredo real versionado nesta auditoria.
- Recomendacao: rotacionar segredos compartilhados anteriormente em conversas ou ambientes externos ao Git.

## Comandos executados e resultados

### Estrutura/Git

- `Get-Location`: OK.
- `git status --short`: OK, limpo no inicio.
- `git remote -v`: OK.
- `git branch --show-current`: OK, `main`.
- `git log --oneline -n 10`: OK.
- `Get-ChildItem -Force`: OK.
- `Get-ChildItem .\backend -Force`: OK.
- `Get-ChildItem .\frontend -Force`: OK.

### Ambiente

- `docker --version`: OK.
- `docker compose version`: OK.
- `node --version`: OK.
- `npm --version`: OK.
- `docker compose ps`: OK, Postgres healthy em `127.0.0.1:5432`.
- `Test-NetConnection localhost -Port 5432`: OK.
- `Test-NetConnection localhost -Port 3001`: indisponivel, backend local nao iniciado.
- `Test-NetConnection localhost -Port 5173`: indisponivel, frontend local nao iniciado.

### WhatsApp/Evolution

- `GET /api/whatsapp/status`: coberto por testes e retorna `not_configured` com seguranca quando faltam credenciais.
- `GET /api/whatsapp/config`: protegido por JWT e retorna somente flags/mascara, nunca API key real.
- `PUT /api/whatsapp/config`: protegido por JWT, valida URL/instancia/API key e salva API key criptografada.
- `POST /api/whatsapp/test-connection`: protegido por JWT e testa Evolution sem expor credenciais.
- `POST /api/whatsapp/webhook`: publico para Evolution, exige `ei jarvis`, ignora `fromMe` e grupos, trata OFX/CSV como anexo e gera previa de importacao.
- Payload bruto recebido no webhook passa por redaction antes de ser persistido em `WhatsAppMessage.rawPayload`.

### Backend

- `npm install`: OK.
- `npm audit --omit=dev`: OK, 0 vulnerabilidades.
- `npx prisma generate`: OK.
- `npx prisma validate`: OK.
- `npx prisma migrate status`: OK, banco em sincronia.
- `npm run test`: OK, 34 testes aprovados.
- `npm run validate`: OK, typecheck, seed typecheck, testes e build aprovados.

### Frontend

- `npm install`: OK.
- `npm audit --omit=dev`: OK, 0 vulnerabilidades.
- `npm run test`: OK, 10 testes aprovados.
- `npm run validate`: OK, typecheck, testes e build aprovados.

### Scripts

- `.\status-jarvis.ps1`: OK com ressalva; Postgres healthy, backend/frontend locais indisponiveis por nao estarem iniciados.
- `.\validate-jarvis.ps1`: OK.
- `.\backup-jarvis.ps1`: OK, backup criado em `backups/` ignorado pelo Git.

### Producao

- `https://jarvis.juninnzxtec.com.br`: OK, HTTP 200, frontend HTML.
- `https://jarvis.juninnzxtec.com.br/api/health`: ressalva, HTTP 200 mas retorna HTML do frontend.
- `https://jarvis.juninnzxtec.com.br/api/health/full`: ressalva, HTTP 200 mas retorna HTML do frontend.
- `https://apijarvis.juninnzxtec.com.br/api/health`: OK, HTTP 200 JSON.
- `https://apijarvis.juninnzxtec.com.br/api/health/full`: OK, HTTP 200 JSON.

## Evidencias de producao

API dedicada:

- app: OK.
- database: OK.
- scheduler: enabled/running, intervalo 60s.
- OpenAI: configurada, status atual `configured`.
- Gemini: configurado, status atual `configured`.
- n8n: `not_configured`.
- WhatsApp: `not_configured`, `autoReply=false`.
- Home Assistant: `not_configured`.
- Logs recentes: warnings de transcricao de audio WhatsApp e registros anteriores de `scheduler tick_error`.

## Status por modulo

- Auth: funcional nos testes.
- Health/status: funcional na API dedicada; rota `/api` no dominio principal precisa correcao/decisao.
- Chat: funcional nos testes, com fallback seguro.
- IA OpenAI/Gemini: estrutura funcional; producao retornou status `configured` na validacao atual.
- Voz: tela/modulo existem; transcricao WhatsApp teve warnings recentes.
- Memorias: funcional nos testes.
- Tarefas: funcional nos testes, incluindo vencidas/lembretes.
- Automacoes: funcional nos testes com bloqueio de acao perigosa.
- Comandos: funcional nos testes.
- Rotinas: funcional nos testes.
- Scheduler: funcional nos testes e running em producao; houve `tick_error` anterior.
- Notificacoes: funcional nos testes.
- Relatorios: funcional nos testes.
- Logs: funcional nos testes.
- Settings: funcional; exige cuidado permanente com redaction.
- n8n: preparado; producao sem credenciais.
- WhatsApp/Evolution: preparado; producao sem credenciais; wake phrase implementada no codigo/testes; OFX/CSV via WhatsApp gera previa e nao importacao direta.
- Mobile/PWA: implementado no frontend; sem escuta continua; service worker nao cacheia API.
- Home Assistant: preparado; producao sem credenciais.
- Financeiro: funcional nos testes, incluindo contas, categorias, transacoes, assistente e importacao.
- Importacao bancaria: OFX/CSV e revisao obrigatoria implementadas/testadas.
- Scripts: validate/backup/status funcionam. `status-jarvis.ps1` mostra backend/frontend locais indisponiveis quando os servidores dev nao estao iniciados, o que nao bloqueia build/testes.

## O que esta funcionando

- Validacao local backend/frontend.
- Banco local healthy em `127.0.0.1:5432`.
- Prisma generate/validate/migrate status.
- Testes automatizados.
- Build backend/frontend.
- Scripts validate e backup.
- Frontend de producao.
- API dedicada de producao.
- Scheduler rodando em producao.
- Fallbacks n8n/WhatsApp/Home Assistant sem quebrar.

## Parcialmente funcionando

- IA externa em producao: configurada e retornando `configured` no health atual.
- API no dominio principal: frontend OK, `/api/*` nao roteia para backend.
- WhatsApp/Evolution: codigo pronto, mas producao `not_configured`.
- n8n: codigo pronto, mas producao `not_configured`.
- Home Assistant: codigo pronto, mas producao `not_configured`.
- Observabilidade: health full mostra dados uteis, mas precisa monitoramento externo.

## Nao validado nesta auditoria

- Login real em producao, para evitar alteracao/criacao de dados.
- Fluxos destrutivos ou restore.
- E2E real no navegador.
- Deploy do commit mais recente na VPS/Fabweb, alem do que a producao expoe no health/frontend.

## Pendencias reais

1. Rotacionar segredos compartilhados anteriormente.
2. Corrigir ou oficializar roteamento de API.
3. Monitorar OpenAI para `invalid_key`, `quota_exceeded`, `model_not_found`, `network_error` ou `api_error`.
4. Monitorar Gemini para `invalid_key`, `quota_exceeded`, `model_not_found`, `network_error` ou `api_error`.
5. Configurar n8n real.
6. Configurar Evolution API/WhatsApp real.
7. Configurar Home Assistant real.
8. Investigar warnings de transcricao de audio.
9. Revisar `scheduler tick_error` historico.
10. Criar E2E Playwright e monitoramento externo.

## Resultado final

**APROVADO COM RESSALVAS**

O sistema esta funcional e validado localmente, com producao respondendo pela API dedicada. As ressalvas sao reais e devem ser tratadas antes de considerar o ambiente pronto para uso diario sem supervisao ou producao comercial.

## Fase 10 - Validacao 2026-05-16

Resultado: **APROVADO COM RESSALVAS**.

Comandos executados e aprovados:

- `docker compose config --quiet`
- `docker compose ps`
- `npm audit --omit=dev` no backend e frontend: 0 vulnerabilidades.
- `npx prisma generate`
- `npx prisma validate`
- `npx prisma migrate status`
- `npm run test`, `npm run validate` e `npm run build` no backend.
- `npm run test`, `npm run validate` e `npm run build` no frontend.
- `.\status-jarvis.ps1`
- `.\validate-jarvis.ps1`
- `.\backup-jarvis.ps1`
- `.\start-n8n.ps1`
- `.\status-n8n.ps1`
- `.\backup-n8n.ps1`

Evidencias:

- Backend: 35 testes aprovados.
- Frontend: 11 testes aprovados.
- PostgreSQL local: healthy em `127.0.0.1:5432`.
- n8n local: container `jarvis-n8n` ativo em `127.0.0.1:15678` e HTTP 200.
- n8n Postgres: `jarvis-n8n-postgres` healthy em `127.0.0.1:15433`.
- Producao frontend: `https://jarvis.juninnzxtec.com.br` HTTP 200.
- API oficial: `https://apijarvis.juninnzxtec.com.br/api/health` HTTP 200 JSON.
- Health full: scheduler running; n8n/WhatsApp/Home Assistant retornam `not_configured` sem quebrar.
- Git ignore: `.env`, backups, imports, documentos de upload, `node_modules`, `dist` e dados n8n locais estao ignorados.

Ressalvas:

- n8n producao ainda nao foi exposto por subdominio/HTTPS.
- Workflows n8n foram criados como templates importaveis, sem credenciais reais.
- RAG/documentos e memoria semantica usam indexacao local segura; pgvector/IA externa nao foram ativados por padrao.
- E2E Playwright completo ficou planejado.
- Rotacao de credenciais compartilhadas anteriormente continua recomendada.

## Central de Integracoes - 2026-05-16

Status: **APROVADO COM RESSALVAS**.

Implementado:

- Backend `IntegrationConfigService`.
- Rotas `/api/integrations/*`.
- Tela `/integrations`.
- Tela `/settings/integrations`.
- Wizard `/integrations/setup-wizard`.
- Eventos `/integrations/events`.
- Listagem/importacao manual de workflows n8n locais.
- `POST /api/whatsapp/configure-webhook` com retorno `success`, `manual_action_required` ou `not_configured`.
- Home Assistant configuravel por `Setting` criptografado, com fallback para `.env`.

Ressalvas:

- n8n producao ainda depende de DNS/Caddy/HTTPS e `.env` real.
- Evolution pode exigir configuracao manual do webhook no manager.
- OpenAI/Gemini seguem via ambiente/secret manager para evitar expor chaves no painel.


## Assistente Universal - 2026-05-17

Implementado em `/integrations/setup-wizard` com backend `/api/integrations/setup/*`, status padronizado, checklists manuais e resumo final em `/integrations/setup-summary`. Segredos continuam fora do frontend.

Atualizado para exibir informativos operacionais dos proximos passos reais: preencher n8n, preencher Evolution API, gerar QR do WhatsApp, configurar webhook, testar `ei jarvis status do sistema`, configurar Home Assistant, configurar backup offsite, revisar erros antigos do scheduler, rotacionar credenciais compartilhadas e validar importacao OFX/CSV criando previa.


## Voz premium original 2026-05-17

Status: implementado localmente.

- Voz/preset: `JARVIS BR Premium`, original do projeto.
- Rotas: `/voice`, `/jarvis-mode`, `/settings/voice`, `/mobile-assistant`.
- TTS: SpeechSynthesis local do navegador.
- Reconhecimento: SpeechRecognition quando disponivel, sempre por clique explicito.
- Privacidade: sem escuta continua oculta e sem audio bruto em logs.
- Ressalva: qualidade da voz depende das vozes instaladas no navegador/sistema.

## Fase 14 - JARVIS Super Intelligence Core

O JARVIS agora possui um Brain interno em `/api/brain/*` e painel em `/brain`, com agentes especialistas, roteador de intencoes, ferramentas internas seguras, contexto por memorias/documentos/financeiro/status, feedback/aprendizado e verificador de resposta. O Brain nao treina modelo do zero; ele orquestra OpenAI/Gemini/fallback local com limites de seguranca.

Rotas principais: `/brain`, `/brain/agents`, `/brain/tools`, `/brain/memory`, `/brain/feedback`. Chat e voz usam o Brain mantendo compatibilidade. WhatsApp continua exigindo `ei jarvis` e OFX/CSV continuam exigindo revisao.

## Fase Suprema - status 2026-05-17

Status operacional: **APROVADO COM RESSALVAS**.

- Backend local validado: 41 testes, validate e build OK.
- Frontend local validado: 15 testes, validate e build OK.
- PostgreSQL local: healthy.
- n8n local: ativo e HTTP 200.
- Backup local: OK.
- Brain Core: ativo e integrado ao chat/voz/WhatsApp.
- Voz premium original: implementada com SpeechSynthesis local e microfone apenas por clique.
- Financeiro: importacao OFX/CSV continua exigindo revisao.
- Documentos/RAG: upload/chunks/busca textual preparados.
- Monitoramento/offsite/E2E: documentados e preparados; dependem de ativacao operacional.
- Producao real de Evolution, Home Assistant e n8n API: depende de credenciais reais.

## Fase 3.0 - readiness de producao

Status: **APROVADO COM RESSALVAS**.

- Deploy remoto: preparado por `DEPLOY_REAL_PRODUCTION_PHASE.md`; execucao depende de acesso seguro.
- n8n producao: checklist pronto para Caddy, Basic Auth, `N8N_ENCRYPTION_KEY`, `WEBHOOK_URL` e workflows.
- WhatsApp/Evolution: QR e webhook prontos no painel; validacao real depende de API key/instancia.
- Financeiro real: revisao obrigatoria mantida para OFX/CSV.
- Home Assistant: preparado em `HOME_ASSISTANT_SETUP.md`; token real pendente.
- Monitoramento: health endpoints e checklist externo preparados.
- Backup offsite: plano criptografado preparado; destino externo pendente.
- E2E: plano atualizado; Playwright completo ainda pendente.

## Atualizacao 2026-10-15 - Protecao do health detalhado

- `/api/health/full` exige JWT e reflete integrações persistidas para o usuário autenticado.
- `/api/health/public` continua disponível com resposta resumida para monitoramento externo.
- n8n, WhatsApp/Evolution e Home Assistant seguem realmente não configurados na conta de produção, conforme health atual; essa alteração corrige a leitura por usuário, não adiciona credenciais.

## Deploy 2026-10-15 — health seguro

Commit `d9487c4` implantado no backend da VPS após CI verde (validate, desktop e android). Health público HTTP 200; health detalhado retorna 401 anonimamente e 200 com sessão autenticada. Smoke autenticado confirmou que a tela agora lê as configurações persistidas do admin: n8n e WhatsApp/Evolution estão configurados; Home Assistant não está. Isso atesta apenas configuração no painel, não teste de conexão dos provedores. A resposta não retornou padrões de segredo. Só o container JARVIS backend foi recriado; os demais containers e banco continuaram ativos.

- Teste real de conexão Evolution (somente GET, sem disparo de mensagem): sucesso, instância com sessão `open`.

## Voz local do navegador — 2026-10-15

A seleção do preset JARVIS passou a priorizar vozes masculinas pt-BR identificáveis e deixou de tratar “Brasil” no nome como indicador de gênero. A suíte frontend inclui teste de regressão para Google Português do Brasil e Microsoft Antonio. Naquela versão, não havia chaves/IDs de voz salvos para Fish Audio e ElevenLabs; suas cotas retornaram `not_configured`.

## Publicacao da correcao de voz — 2026-10-15

A release `91d297c` está publicada. A página e o bundle público retornaram 200 e o bundle contém o seletor corrigido. A VPS segue saudável (app, banco e scheduler `ok`) com todos os cinco containers JARVIS/n8n em execução. A seleção local agora procura primeiro nomes masculinos pt-BR; naquele momento, não havia chaves/IDs de Fish Audio ou ElevenLabs salvos. O usuário pode configurar credenciais novas em `/settings/integrations` e selecionar `auto`. A credencial Fish Audio compartilhada na conversa não deve ser reutilizada; gere uma nova antes de salvar.

## Correções adicionais da Central de Voz — 2026-10-15

Carregar vozes e testar a fala agora salvam antes os dados preenchidos na tela. A leitura da cota Fish Audio aceita contas com crédito gratuito sem campo `credit`. Testes unitários cobrem crédito gratuito, saldo positivo, cota esgotada e resposta sem saldo. A produção ainda depende de chaves e voice IDs válidos do usuário para validar síntese remota real.

Release `1cd1170` publicada na VPS após CI verde. Frontend e backend foram recompilados sem cache e recriados sem dependências; PostgreSQL e n8n permaneceram em execução. Smoke tests: painel de integrações e health público HTTP 200. O status TTS autenticado segue em `browser`; as três chaves externas e os voice IDs estão ausentes, então a geração premium não pode ser testada ainda.

O backend `116225f` também está publicado. A leitura de crédito agora envia `check_free_credit=true`, conforme o OpenAPI oficial da Fish Audio. Health público e página de integrações continuaram em HTTP 200 após recriar apenas o backend. Chaves e vozes remotas permanecem ausentes; ainda não é possível testar geração premium na conta.

## Seleção automática por cota confirmada — publicada em 2026-10-15

O modo automático só tenta provedores remotos quando a cota está confirmada como disponível e suficiente para o texto. Provedores com cota desconhecida ou insuficiente são pulados para evitar requisições sem confirmação de disponibilidade. A interface explica a regra.

Commit `bb72343`; CI `38765847066` verde nos jobs validate, desktop e android. Release publicada em `/opt/jarvis-home-assistant/releases/jarvis-bb72343`, com build Docker sem cache e recriação apenas de backend/frontend; sem migrations. Testes: bundle público contém a mensagem nova; `/settings/integrations`, API pública e checks internos retornaram HTTP 200. Frontend, backend, PostgreSQL e n8n permanecem ativos. A síntese remota continuava sem validação por falta de chaves e voice IDs.

## Validação da voz local — publicada em 2026-10-15

Causa: uma voz Google pt-BR salva tinha prioridade; se nenhuma voz masculina fosse identificada, o seletor escolhia a primeira voz pt-BR genérica. Agora uma voz salva só é aceita se o nome identifica uma voz masculina; o seletor prioriza pt-BR e não reproduz fallback Google genérico. A página corrige preferência antiga, lista vozes masculinas identificáveis e o teste aguarda o fim da fala para exibir o resultado.

Commit `73dec7f`; CI `38772235880` verde nos jobs validate, desktop e android. Release `/opt/jarvis-home-assistant/releases/jarvis-73dec7f` implantada na VPS, recriando somente frontend. Página e bundle públicos HTTP 200, bundle conferido com a proteção contra fallback e mensagem de teste; health público e backend interno HTTP 200. Frontend, backend, PostgreSQL e n8n seguem ativos. Os testes simulados de Web Speech passam. Não foi possível ouvir áudio nesta sessão, que está deslogada; provedores remotos seguem sem credenciais/voice IDs configurados.

## Piper local — publicada em 2026-10-15

Foi adicionada uma integração TTS Piper isolada e interna, com o modelo PT-BR pt_BR-cadu-medium (aprox. 63 MB), limite Docker de 1 CPU/512 MB, health check e síntese WAV autenticada pela API JARVIS. O modo automático prioriza Piper, Fish Audio pode ser usado com cota confirmada e ElevenLabs requer autorização explícita para fallback.

A VPS tem 4 vCPUs, 7.8 GiB de RAM, nenhum GPU, 3.7 GiB disponíveis no diagnóstico e 2.1 GiB em swap usada. Kokoro e Chatterbox ainda não foram instalados ou testados; aguardam benchmark seguro devido ao uso de recursos dos outros serviços.

Commit `c3899e0`; CI `38775757022` verde nos jobs validate, desktop e android. Release publicada em `/opt/jarvis-home-assistant/releases/jarvis-c3899e0`; somente Piper, backend e frontend foram criados/recriados, sem migrations nem reinício de PostgreSQL, n8n ou outros projetos. A síntese autenticada `/api/voice/speech` retornou HTTP 200, `audio/wav`, provedor `piper` e WAV válido. A geração respondeu em 2,19 s no teste inicial; o container ficou saudável e usou cerca de 260 MiB de 512 MiB, com 0,34% de CPU no instante medido. Página pública, frontend interno e API pública retornaram HTTP 200. A voz foi gerada e validada tecnicamente; reprodução audível no dispositivo do usuário ainda depende de teste na sessão logada.

## Diagnóstico do teste de voz — 2026-10-15

O botão **Testar voz** agora mostra a mensagem segura do backend quando a geração remota falha, incluindo status HTTP quando disponível. Se o servidor gerar o áudio mas o dispositivo não conseguir tocá-lo, a interface informa esse cenário separadamente. A seleção do navegador continua recusando fallback para a voz Google genérica.

Deploy da tela de diagnóstico de voz — 2026-10-15

A release `13cf8af` está publicada na VPS. CI `38783407549` passou em validate, desktop e android. Somente `jarvis-frontend` foi recriado; a imagem anterior está preservada com tag de rollback. Site/API retornaram 200, health da aplicação e banco está `ok`, e Piper continua saudável.
# Atualização de voz — 15/10/2026

O fluxo ElevenLabs agora aceita parâmetros ajustáveis de estabilidade, semelhança, expressividade e velocidade. O painel inicia com estabilidade 0,42, semelhança 0,82, estilo 0,18 e velocidade 0,94; as opções são armazenadas como configurações do usuário e aplicadas apenas pelo backend. A seleção de uma voz masculina pt-BR continua dependente das vozes liberadas na conta do provedor. Uma amostra audível e a confirmação da voz escolhida dependem de teste no navegador autenticado.

## Diagnóstico de interações — 15/10/2026

Health público consultado: app e banco retornaram `ok`; OpenAI e Gemini constam como configurados no servidor; n8n, WhatsApp e Home Assistant constam como não configurados no health público. Isso não substitui o status autenticado por usuário. Corrigido o encaminhamento do usuário autenticado para consultas do Brain ao Home Assistant/n8n/health. Chat e voz agora aguardam até 90 segundos; o chat apresenta erros em vez de ocultá-los e permite repetir a mensagem. A VPS não foi atualizada: acesso SSH por chave/senha não autenticou neste ambiente.

## Central de downloads JARVIS 2.0.0 — 15/10/2026

O APK TWA assinado foi compilado nesta revisão e validado pelo `apksigner`; o certificado coincide com o fingerprint configurado em `assetlinks.json`. A Central foi atualizada para apontar para os assets de uma release pública do GitHub. O workflow `release-downloads.yml` compila o EXE Windows, cria checksums e publica APK e EXE ao enviar a tag `v2.0.0`. O instalador Windows não tem assinatura Authenticode. O repositório não tem deploy automático do frontend e SSH recusou a autenticação; portanto, o site online ainda precisa receber o build do frontend para exibir os novos botões.

# AUTH-001 — MFA administrativa (implementação parcial)

Foi adicionado um serviço TOTP isolado compatível com RFC 6238 e testes determinísticos. O serviço gera segredos base32 aleatórios, códigos de seis dígitos e URIs de provisionamento para aplicativos autenticadores, e valida códigos com tolerância de um intervalo de 30 segundos. O login ainda não usa este serviço; não há enrollment, persistência cifrada, recuperação nem revogação de sessões nesta etapa.
# Atualização 2026-10-17 — AUTH-001 MFA administrativo

Implementação local na branch `codex/auth-001-admin-mfa-20261017`: enrollment com QR TOTP, desafio MFA no login administrativo, segredo cifrado, recovery codes de uso único, status e desativação protegida que revoga sessões antigas. Migration `20261017170000_admin_totp_mfa` e testes de integração com PostgreSQL descartável incluídos. Backend: 82/82 testes e build passaram. Frontend: 49/49 testes, typecheck e build passaram. Revisão independente, CI desta branch e deploy ainda pendentes. Nenhuma alteração foi feita na VPS ou produção.

## AUTH-001 — revisão de segurança local — 2026-10-17

- A API de autenticação passou a definir `Cache-Control: no-store` e `Pragma: no-cache` em todas as respostas para evitar cache de tokens de desafio, QR/segredo TOTP e códigos de recuperação.
- Provisionamento, login MFA, TOTP/recovery de uso único, proteção de replay e revogação por `authVersion` foram revisados em código e na suíte integrada local.
- Estado: branch local em revisão; não há CI GitHub desta branch nem validação em produção. `TOTP_ENCRYPTION_KEY` ainda não foi provisionada em produção. Não ativar MFA até provisionar uma chave exclusiva, aleatória e com recuperação protegida.

## Agent Sync V1 — 2026-10-17 (local, sem ciclo externo)

Executor local disponível em `tools/agent-sync`, com OpenAI como planejador/revisor e Codex SDK local como desenvolvedor. A V1 limita a 1 ciclo por padrão e 3 no máximo, seleciona tarefas permitidas pelo STATE, usa sandbox sem rede para o Codex, executa testes backend/frontend com ambiente sintético e banco PostgreSQL descartável obrigatório, registra aprovações como `IN_REVIEW` e atualiza o progresso. Dry-run e 7 testes unitários passaram. Ciclo real ainda não executado: faltam chave OpenAI API na sessão e PostgreSQL descartável local. Scheduler permanece pausado; sem alterações na VPS, produção ou GitHub remoto.

## Agent Sync V1 — checkpoint do protocolo — 2026-10-17T22:02:40Z

A configuração do SDK confirma que o processo Codex recebe um ambiente allowlist sem URLs do PostgreSQL e executa a thread com rede desativada. Assim, o agente não acessa diretamente o DB descartável; o coordenador executa as validações no host. Não foi sondada uma sessão real para evitar iniciar outro ciclo pago.

Os estados agora diferenciam blocked, validation_failed, no_changes e review_rejected. Sem diff, o revisor não é chamado e a tarefa não avança para IN_REVIEW. MEM-001 ainda não foi implementada. Agent Sync passou TypeScript e 13/13 testes; nenhum ciclo GPT/Codex, push, merge, deploy ou acesso VPS ocorreu. Scheduler segue pausado.

## MEM-001 — regressões de memória (2026-10-17)

Adicionada suíte `backend/src/memoryIsolation.integration.test.ts` para isolamento por usuário, exclusão/cascata, concorrência e contexto compartilhado entre chat e WhatsApp com históricos separados. Nenhum comportamento de retenção, schema ou módulo de produção foi alterado. Execução PostgreSQL reservada ao coordenador por opt-in explícito; no sandbox os cinco casos são ignorados deliberadamente.

Cobertura, limites dos dublês, resultados locais e procedimento de revisão: [MEM-001-VALIDATION](docs/jarvis/tasks/MEM-001-VALIDATION.md). Aceite PostgreSQL concluído no host pelo coordenador: 5/5 casos de MEM-001 aprovados (0 skips); backend validate aprovado com 87 testes (10/10 suítes); frontend validate aprovado com 49 testes (9/9 suítes); builds e git diff --check aprovados. Tarefa pronta para IN_REVIEW.

## SEC-002 — hardening de cifras e rotação — 2026-10-18

- `Setting` grava novas cifras `enc:v2:` com chave dedicada; `enc:v1:` permanece legível durante migração, enquanto cifra inválida/desconhecida aborta com falha fechada.
- Serviço de rotação faz preflight completo, backup cifrado antes de escrita e atualizações serializáveis; dry-run é somente leitura. Restauração valida o backup e reverte integralmente se algum registro não corresponder.
- Revisão técnica inicial encontrou que o backup validava só o prefixo dos ciphertexts. A correção local usa backup v2 com HMAC que vincula registros, ciphertexts e metadados; valores são autenticados/decifrados antes da restauração, e backups v1 sem autenticação são recusados.
- Backend 106 testes/12 arquivos, frontend 49/9, Agent Sync 13/13 e builds passaram localmente com chaves sintéticas e PostgreSQL descartável loopback. Teste recuperou backup real gerado e comprovou rollback após erro parcial.
- Pós-correção: PostgreSQL descartável confirmado em loopback, migrations atualizadas (6/6); SEC-002 focado 24/24 sem skips (9 integrações); backend validate 111/111 sem skips; frontend 49/49; Agent Sync 13/13. Segunda revisão independente e gate protocolar ainda pendem; status permanece `IN_PROGRESS`.
- Sem migração ou rotação de segredos reais, sem acesso VPS/produção e sem push, merge ou deploy. Backups anteriores permanecem preservados e ignorados pelo Git.
- SEC-002 permanece `IN_PROGRESS`: a correção da ressalva está pendente de validação; o gate `reviewed_continue` também não foi executado. Nenhum estado de produção foi inferido.

## SEC-002 — isolamento do PostgreSQL e fixtures — 2026-10-18

A revisão independente identificou o gate permissivo de banco de teste e a exclusão ampla de dados por prefixo na suíte API. O gate local agora exige o container Docker conhecido, imagem/saúde/bind loopback/tmpfs sem mounts e credenciais correspondentes, além de validar por SQL a identidade do servidor antes de mutações. A suíte API cria somente usuários sintéticos aleatórios, verifica que registros de outro usuário sobrevivem ao teardown e apaga apenas fixtures vinculadas aos próprios usuários. Agent Sync deixou de aplicar o seed global com dados de perfil/demo.

Validação final pós-correção: PostgreSQL descartável confirmado por configuração Docker e SQL (database `jarvis_agent_sync_test`, PostgreSQL 16, tmpfs sem mounts, bind exclusivo `127.0.0.1:55433`); seis migrations presentes e nenhuma pendente, sem seed global. Foco SEC-002/MEM-001/API **57/57 sem skips**; backend `npm run validate` **116/116 em 14 arquivos**, Prisma generate/typecheck/typecheck:seed/build PASS; frontend **49/49**, typecheck/build PASS (aviso conhecido de bundle >500 kB); Agent Sync **14/14**, typecheck PASS. SEC-002 permanece `IN_PROGRESS` aguardando segunda revisão independente e gate formal `reviewed_continue`. Sem segredos reais, produção, VPS, push, merge ou deploy; Agent Sync/scheduler pausados.

## SEC-002 — gate P1 da CLI de rotação corrigido — 2026-10-17 BRT / 2026-10-18 UTC

Commits locais de implementação: `610cfdc` (`fix(security): require verified disposable DB for rotation`) e `2370f3f` (`fix(security): verify rotation target inside transaction`), sobre o HEAD inicial `ca206855c2594c2970fe50069e0b1ced6768b7c0`, branch `codex/agent-sync-v1-20261017`.

O gate agora exige container Docker esperado e saudável, ID e digest de imagem fixados, credenciais conferidas sem log, bind somente loopback, tmpfs com opções exatas, nenhum volume/bind persistente, rede isolada sem pares extras e identidade SQL de database, role, IP interno e porta. O container é inspecionado novamente depois da consulta. O critério não usa hostname ou nome contendo `test`; a CLI rejeita `--confirm-non-test-database` e só aceita `--dry-run`. Rotação e restauração repetem a prova SQL pela mesma conexão transacional que altera os settings; a rotação a repete antes de criar o backup em disco. Criação de backup também valida antes do primeiro efeito colateral.

Validação: PostgreSQL descartável confirmado; 6 migrations presentes e zero pendentes; backend 142/142 em 15 arquivos, frontend 49/49 e Agent Sync 14/14, todos sem skips; typechecks/builds passaram. CLI rejeitou a flag removida com exit 2; `--dry-run` concluiu e o inventário de backups não mudou. A suíte integrada verificou que alvos recusados não criam backup nem alteram registros, e que rotação/restauração legítimas funcionam no banco descartável. Bundle frontend ainda apresenta aviso conhecido acima de 500 kB.

Somente dados e chaves sintéticos. Nenhuma migration foi aplicada nesta rodada, nenhum banco persistente foi rotacionado, e não houve acesso a VPS/produção, push, merge ou deploy. SEC-002 segue `IN_PROGRESS` até nova revisão independente e gate `reviewed_continue`; Agent Sync automático e scheduler permanecem pausados.

## OBS-001 — diagnóstico e observabilidade HTTP — 2026-10-18 (em revisão local)

A branch implementa IDs de correlação gerados pelo backend, logs HTTP sem URL/query/body, contadores 4xx/5xx em memória, alertas internos deduplicados de 5xx e health/readiness resiliente a falhas do banco. O status separa configuração de conectividade e usa “não verificado” quando não há probe.

Validação local: PostgreSQL descartável verificado por Docker e SQL; backend `npm run validate` 153/153, zero skips, Prisma/typechecks/build aprovados; `app.integration.test.ts` 43/43 após conferir exposição CORS do `X-Request-Id`; frontend 49/49, typecheck/build aprovados. O bundle continua com aviso acima de 500 kB.

Escopo não validado: VPS/produção, monitoramento externo, envio de WhatsApp/e-mail, recuperação operacional e retenção/rotação real de logs. Métricas HTTP reiniciam com o processo. OBS-001 permanece IN_REVIEW até revisão independente e smoke operacional autorizado; não houve deploy.

## Checkpoint SEC-002 — formato estrito de ciphertext — 2026-10-18

A revisão independente encontrou que os parsers de `enc:v1` e `enc:v2` ignoravam segmentos após os campos esperados. `decryptSecret` agora falha fechado e `needsReEncryption` marca o valor para rejeição/reprocessamento quando a estrutura não contém exatamente cinco segmentos. Regressões geram ciphertexts sintéticos válidos das duas versões e acrescentam sufixos inesperados.

Validação local pós-fix: PostgreSQL descartável identificado por Docker+SQL; backend **172/172**, frontend **49/49**, Agent Sync **17/17** e integração SEC-002 **11/11**, zero skips; typechecks, builds, migrations, dry-run e `git diff --check` passaram. A revisão independente direcionada confirmou o fechamento do achado e não encontrou outros problemas de código no escopo. Commit de código: `76809d0371dadb58ca27b865f3933b2662e3ad99`. SEC-002 segue `IN_PROGRESS` até o gate formal `reviewed_continue`; OBS-001/OBS-002 continuam `IN_REVIEW` aguardando smoke operacional autorizado. Sem VPS, produção, segredo real, chamada paga, push, merge ou deploy.

## Checkpoint AUTH-001 — hardening de armazenamento TOTP — 2026-10-18

Revisão independente identificou aceitação de campos TOTP extras e a possibilidade de reutilizar `JWT_SECRET` como chave de cifra. O parser agora exige envelope `totp:v1` com exatamente três campos após o prefixo, base64url canônico, IV de 12 bytes, tag GCM de 16 bytes e ciphertext não vazio. `TOTP_ENCRYPTION_KEY` é rejeitada se igual a `JWT_SECRET`, tanto no schema de ambiente quanto no serviço. Regressões cobrem estrutura inválida, IV/tag curtos, alfabeto não canônico e reutilização da chave JWT. Re-revisão independente confirmou fechamento e compatibilidade com valores v1 válidos.

`run-cycle.ps1 -ValidateOnly` após as mudanças: backend **175/175** em 22 arquivos, frontend **49/49** em 9 arquivos, Agent Sync **17/17**, zero skips; migrations, typechecks, builds, dry-run e `git diff --check` passaram. Integração SEC-002, PostgreSQL descartável verificado: **11/11**. AUTH-001 permanece `IN_REVIEW`: falta CI GitHub da branch e confirmação operacional não reveladora de `TOTP_ENCRYPTION_KEY` antes de qualquer ativação/deploy. Nenhum segredo real, VPS ou produção foi acessado.
## NVIDIA NIM — implementação local (2026-10-18)

- Configuração por usuário no painel para NVIDIA LLM; chave criptografada, catálogo curado de modelos, teste manual com confirmação, provedor principal e fallback ordenável. Chat usa endpoint NVIDIA OpenAI-compatible; streaming e tool calling não estão implementados.
- STT: integração para NVIDIA Speech NIM auto-hospedado em endpoint privado HTTP; arquivos limitados a 20 MiB e fallback OpenAI explicitamente opt-in. O Whisper/Canary hospedado por NVIDIA em gRPC ainda não está conectado.
- TTS: Magpie Multilingual para pt-BR (Diego/Louise/Isabela), usando API HTTP do catálogo e a chave salva na seção NVIDIA. Uso automático bloqueado até a quota ser verificável; teste real exige confirmação explícita.
- Proteções atuais: timeout, 30 req/min por usuário/processo, circuit breaker após 3 falhas por 30 s, 1.024 tokens de saída, até 32 mensagens/24.000 caracteres e logs sem prompt/credenciais. Métricas incluem latência e tokens reportados, não custo monetário; o limite é local ao processo e não representa quota da conta.
- Validação: testes com endpoints mockados e chave fictícia; nenhuma chamada, preço, quota ou disponibilidade real de conta NVIDIA verificada. Sem alteração ou deploy na VPS.

## Checkpoint local — NVIDIA_ZERO_SPEND e gates — 2026-10-19

A política NVIDIA de R$ 0,00 está aplicada aos caminhos de execução backend; as operações hospedadas e seus testes estão bloqueados sem evidência de quota, preço e entitlement sem custo. Validação local `LOCAL_VALIDATION_OK`: backend 177/177, frontend 49/49, Agent Sync 17/17, zero skips; builds, typechecks, dry-run e diff-check aprovados. O workflow de release foi endurecido para exigir CI bem-sucedido no SHA exato em main. CI remoto e configurações de proteção não confirmados. VPS: `[VPS_ENDPOINT_REDACTED]:22014` confirmado, sem conta não-root/fingerprint; não conectada. Nenhuma publicação/produção/chamada paga; scheduler pausado.


## Continuidade master — 2026-10-19

ValidateOnly passou após regressão que bloqueia fetch externo no teste NVIDIA: PostgreSQL descartável/migrations PASS; backend 177/177, frontend 49/49, Agent Sync 17/17, sem skips; typechecks, builds, dry-run e git diff --check PASS. NVIDIA continua CONFIGURED_BUT_BILLING_UNVERIFIED, LLM/STT/TTS bloqueados pelo orçamento de R$ 0.

Branch codex/agent-sync-v1-20261017 está 93 commits à frente de origin/main e não existe remotamente. Não houve push; revisar dados operacionais privados do histórico antes de publicação. VPS sem conexão: faltam usuário não-root e fingerprint confiável. Gates não foram promovidos e scheduler segue pausado.

\n
## JARVIS 3.0 — Meu Dia (2026-10-22)

Dashboard ampliado para consultar resumo financeiro do mês e rotinas do usuário autenticado, junto às tarefas e notificações existentes. A visualização de rotinas não executa ações. Frontend validado localmente: typecheck, 56 testes e build aprovados. CI do PR #2 passou no SHA `1484b4a` (`validate`, `desktop`, `android`). Ainda pendem revisão e E2E autenticado/staging; timezone é o do navegador. Não é release nem deploy.

## LIFE-001 � atualiza��o de valida��o
Timezone individual e code splitting por rota implementados na branch isolada. Frontend 57/57 testes e build aprovados; chunk inicial 283.78 KB (antes 662.49 KB). Backend 118 testes passaram; 61 foram ignorados pelo gate PostgreSQL. Migration e E2E de banco continuam n�o executados por indisponibilidade do Docker Linux. Trabalho parcial, ainda requer revis�o e staging.
