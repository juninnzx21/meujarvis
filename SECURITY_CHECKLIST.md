# Security checklist

- [x] PWA nao cacheia `/api/*`.
- [x] PWA nao cacheia requisicoes com Authorization ou cookie.
- [x] Service worker cacheia apenas assets estaticos e fallback offline.
- [x] Tokens continuam no fluxo existente do app e nao sao gravados pelo service worker.
- [x] Microfone mobile so e ativado por toque/clique explicito.
- [x] Nao ha escuta continua oculta.
- [x] WhatsApp mobile continua exigindo `ei jarvis`.

- [ ] Rotacionar segredos compartilhados fora do repositorio.
- [x] `.env`, backups, node_modules, dist e imports ignorados no Git.
- [x] API key da Evolution salva em `Setting` com criptografia.
- [x] Frontend mostra apenas configurado/mascara, nunca segredo real.
- [x] WhatsApp exige `ei jarvis` para responder/executar.
- [x] OFX/CSV via WhatsApp cria previa/revisao, sem importacao direta.
- [x] Scheduler registra erros redigidos.
- [ ] Recriar container local do Postgres para aplicar bind `127.0.0.1:5432:5432` se ele ainda aparecer como `0.0.0.0`.
- [ ] Configurar firewall/SSH hardening em producao.
- [ ] Configurar monitoramento externo.

- [x] Memorias pessoais nao devem salvar senhas reais, tokens reais, API keys reais, chaves privadas, credenciais, dados bancarios ou dumps.
- [x] A base pessoal deve usar apenas fatos duradouros, preferencias, contexto tecnico e roadmap seguros.
- [x] `npm run seed:personal` bloqueia padroes sensiveis, registra apenas resumo e nao imprime conteudo bloqueado.
- [x] A base pessoal usa aliases de titulos antigos para atualizar memorias sem duplicar.
- [x] Segredos reais devem ficar em vault/gerenciador de senhas, nunca em `Memory`.
- [x] Senhas sao armazenadas com bcrypt.
- [x] JWT protege rotas privadas.
- [x] Zod valida entradas principais.
- [x] Helmet, CORS e rate limit ativos.
- [x] Logs redigem `apiKey`, `token`, `authorization`, `cookie`, `password`, `secret` e JWT-like strings.
- [x] `.env` nao e servido pelo frontend.
- [x] Chaves OpenAI/Gemini/n8n/Evolution/Home Assistant ficam somente no backend/local env.
- [x] WhatsApp exige confirmacao para envio.
- [x] Auto reply WhatsApp fica desligado por padrao e ignora mensagens do proprio JARVIS.
- [x] Home Assistant exige confirmacao para lock, alarm, cover, garage e portao.
- [x] Automacoes bloqueiam shell arbitrario e comandos destrutivos.
- [x] Backups ficam em pasta local e devem ser protegidos pelo usuario do Windows.
- [x] Restore exige confirmacao manual `RESTORE`.
- [x] Central de comandos classifica comandos seguros, com confirmacao ou bloqueados.
- [x] Relatorios nao retornam chaves ou tokens.
- [x] Notificacoes passam por redaction antes de armazenar mensagens internas.
- [x] Backups SQL estao ignorados por `.gitignore`.
- [x] WhatsApp por IA apenas prepara mensagem; envio exige confirmacao no painel.
- [x] Scheduler bloqueia WhatsApp direto, Home Assistant sensivel, shell e envio em massa.
- [x] Scheduler evita repeticao por `lastRunAt`, `reminderSentAt` e `overdueNotifiedAt`.
- [x] Notificacoes criadas pelo scheduler passam por redaction.
- [x] Frontend publico em HTTPS pela Fabweb.
- [x] API publica em HTTPS via Caddy na VPS.
- [x] Backend e Postgres do JARVIS estao presos em `127.0.0.1` na VPS.
- [x] Docker Compose usa `restart: unless-stopped`.
- [x] API dedicada `apijarvis.juninnzxtec.com.br` documentada.
- [x] `backend/storage/imports/` ignorado no Git.
- [x] Extratos financeiros nao sao salvos em pasta publica.
- [x] Logs financeiros registram somente metadados resumidos/redigidos.
- [x] CPF/CNPJ, chaves Pix e credenciais sao redigidos em logs.
- [x] Categorizacao financeira local por padrao.
- [x] Importacao de extrato exige revisao antes de gravar transacoes.
- [x] Duplicidade financeira e verificada antes de gravar.
- [x] PDF/XLSX sao recusados quando nao houver parser confiavel.
- [x] Tokens sensiveis salvos em `Setting` sao criptografados com AES-256-GCM.
- [x] Valores antigos plaintext em `Setting` continuam compativeis e sao criptografados ao salvar novamente.
- [x] `/api/settings` nao retorna segredo bruto.
- [x] Login demo e bloqueavel por `ALLOW_DEMO_LOGIN=false`.
- [x] Endpoint publico minimo `/api/health/public` criado para monitoramento.
- [x] n8n proprio fica preso em `127.0.0.1` localmente e exige Basic Auth/Encryption Key via `.env`.
- [x] Workflows n8n versionados nao contem credenciais reais.
- [x] `backend/storage/documents/` fica ignorado no Git.
- [x] EventBus salva payload redigido em `IntegrationEvent`.
- [x] `apijarvis.juninnzxtec.com.br/api` oficializado como API publica.
- [x] OFX/CSV bancario e parseado localmente.
- [x] Arquivos recebidos via WhatsApp ficam em `backend/storage/imports/whatsapp`.
- [x] PDF de extrato e tratado apenas como conferencia/fallback, nao como fonte principal em massa.
- [x] Importacao por WhatsApp cria previa e exige revisao antes de gravar.
- [x] WhatsApp exige wake phrase `ei jarvis` antes de responder, importar arquivo ou executar tarefa.
- [x] Central de Integracoes nunca retorna segredo real para o frontend.
- [x] Configuracoes sensiveis de n8n, Evolution, Home Assistant e Financeiro sao criptografadas em `Setting`.
- [x] `/api/integrations/*` retorna somente status, flags e mascaras.
- [x] Apenas admin pode alterar configuracoes globais de integracao.
- [x] Reenvio de eventos sensiveis exige confirmacao/manual review.
- [x] Fluxo QR Code da Evolution API roda por rotas admin protegidas.
- [x] QR Code/pairing code da Evolution nao e persistido como dado permanente.
- [x] Respostas do manager Evolution removem payload bruto e nunca retornam API key.
- [x] Endpoints variaveis da Evolution retornam `manual_action_required` em vez de expor erro sensivel.
- [ ] Rotacionar DirectAdmin/hospedagem.
- [ ] Rotacionar senha root da VPS.
- [ ] Rotacionar todos os segredos compartilhados e gerar `SETTINGS_ENCRYPTION_KEY` dedicado na producao.
- [ ] Criar usuario `deploy` com chave SSH.
- [ ] Desabilitar login root por senha depois de validar chave.
- [ ] Revisar portas UFW extras antes de remover.

- [x] Assistente Universal retorna somente status, mascara, URLs publicas e checklists; nenhum provider deve devolver segredo real ao frontend.

## Voz e microfone

- A voz `JARVIS BR Premium` e original do projeto e nao clona voz de ator/personagem.
- Microfone deve iniciar apenas por clique/toque explicito.
- Nao implementar escuta continua oculta.
- Nao salvar audio bruto em logs, banco, storage ou relatorios.
- Respostas faladas devem respeitar confirmacao para acoes sensiveis.

## Fase 14 - JARVIS Super Intelligence Core

O JARVIS agora possui um Brain interno em `/api/brain/*` e painel em `/brain`, com agentes especialistas, roteador de intencoes, ferramentas internas seguras, contexto por memorias/documentos/financeiro/status, feedback/aprendizado e verificador de resposta. O Brain nao treina modelo do zero; ele orquestra OpenAI/Gemini/fallback local com limites de seguranca.

Rotas principais: `/brain`, `/brain/agents`, `/brain/tools`, `/brain/memory`, `/brain/feedback`. Chat e voz usam o Brain mantendo compatibilidade. WhatsApp continua exigindo `ei jarvis` e OFX/CSV continuam exigindo revisao.
