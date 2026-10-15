# JARVIS 2.0 — auditoria e estado da entrega (15/10/2026)

## Escopo
Auditoria da cópia em `E:\jarvis-home-assistant`, comparação com o GitHub e verificações de leitura na VPS. Integrações que dependem de credenciais, serviços ou dispositivos externos só são consideradas validadas após chamada real autorizada.

## Arquitetura
- Backend Node.js, Express 4, TypeScript 5, Prisma 5 e PostgreSQL: autenticação, chat/IA, voz, Brain/agentes, memória, tarefas, automações, financeiro, Home Assistant, WhatsApp/Evolution, n8n e integrações.
- Frontend React 18, TypeScript, Vite e React Router; painel, voz, integrações, memória, financeiro, WhatsApp, downloads e PWA.
- Desktop Electron com lista controlada de comandos locais e empacotamento Windows.
- Android Trusted Web Activity/PWA. O build de validação não representa release assinado, instalação em aparelho físico ou publicação em loja.
- TTS com ElevenLabs, Fish Audio e Speechma, seleção/fallback configurável; reconhecimento de fala no cliente.

## Evidências operacionais e limites
- Na verificação pontual anterior, site JARVIS, health da API, health completo e n8n responderam HTTP 200; API e banco reportaram `ok`, com scheduler ativo.
- Métricas pontuais da VPS: RAM 7,8 GiB total/3,4 GiB disponível; swap de 4 GiB com 1,9 GiB usado; raiz com 36 GiB livres de 96 GiB.
- Teste real de síntese TTS falhou com HTTP 402 da ElevenLabs. Não ficou comprovada nesta rodada cota/credencial funcional em Fish Audio ou Speechma.
- Serviços externos como WhatsApp, Home Assistant, IA e voz precisam de configuração válida para validar chamadas reais; não foram alterados nem testados com novas credenciais.
- Build frontend principal fica em torno de 626 kB minificado, acima do aviso padrão de 500 kB.

## Validação do GitHub Actions
A execução [JARVIS CI #24](https://github.com/juninnzx21/meujarvis/actions/runs/38728349677), commit `afbde3a`, finalizou com sucesso em todos os jobs:
- Backend: instalação, Prisma, migrations em PostgreSQL temporário, seed da base descartável, suíte completa de testes e build.
- Frontend: suíte de testes, build e scan de segredos.
- Desktop: validação e geração do instalador Windows.
- Android: build de APK debug com JDK 17 e Android SDK.

Artefatos de validação anexados à execução: web, instalador Windows e APK Android debug. O APK é de teste e não está assinado para distribuição na Play Store; o instalador Windows também precisa de revisão de assinatura e publicação antes de distribuição.

A validação mais recente desta rodada é [JARVIS CI #27](https://github.com/juninnzx21/meujarvis/actions/runs/38730275268), commit `389ce1f`; os jobs `validate`, `desktop` e `android` terminaram com sucesso. O commit anterior também corrige a exposição CORS do cabeçalho que informa qual provedor TTS gerou o áudio e inclui teste de preflight.

Validação local adicional: frontend `npm run validate` passou (35 testes e build). O backend passou typecheck e typecheck dos seeds, mas a suíte local não pôde executar por falta de PostgreSQL/Docker nesta máquina; a suíte completa do backend passou no CI com PostgreSQL descartável.

O lockfile do backend foi atualizado com `npm audit fix` sem `--force`: os 13 avisos de dependências foram eliminados e `npm audit` passou sem vulnerabilidades. Typecheck, typecheck dos seeds e build do backend passaram localmente; o CI #27 validou também a suíte completa em PostgreSQL descartável.

Durante o CI foram corrigidos problemas reais da esteira: ação Android antiga solicitava o pacote removido `tools`; `JWT_SECRET` de teste era menor que a validação mínima; faltava semear o banco temporário; alguns testes não refletiam a exigência atual de confirmação para gravar memória e deixavam transporte HTTP mockado incompleto; o scanner de segredo dava falso positivo em fixture de teste e na própria expressão regular. A suíte foi executada novamente e passou.

## Entrega e estado de produção
- Repositório: `juninnzx21/meujarvis`; base `main` estava em `ee4f987` quando comparada.
- Branch: `codex/jarvis-2.0-platform-20261015`; contém o sincronismo das implementações JARVIS 2.0, ajustes de versão/documentação e workflow de CI.
- A branch `main` não foi alterada. O código `389ce1f` foi implantado em uma pasta de release versionada na VPS e construído como imagens Docker; a instalação principal antiga continua disponível para recuperação.
- Antes da troca, a cópia de produção divergia em 15 arquivos de código. As diferenças foram revisadas: incluem a versão 2.0, confirmação antes de gravar memória/tarefa, validação do endpoint Brain, seleção do provedor local Ollama e ajustes de voz/instalação. A instalação não é checkout Git; o deploy usou uma release isolada e preservou os serviços existentes.
- Antes do deploy foi feito backup externo do código e dump PostgreSQL, com SHA-256 conferido entre PC e VPS e dump validado por `pg_restore`. Uma cópia restrita do `.env` ficou no diretório de rollback da VPS; os segredos não foram adicionados ao Git nem ao backup local. A base tinha cerca de 14 MB e havia 36 GB livres.
- Somente os containers `backend` e `frontend` foram recriados. PostgreSQL, n8n e os demais projetos não foram reiniciados; nenhuma migration foi aplicada, pois a release não adiciona migrations e o banco já estava alinhado.
- Após deploy, `https://jarvis.juninnzxtec.com.br/`, `https://jarvis.juninnzxtec.com.br/api/health` e `https://apijarvis.juninnzxtec.com.br/api/health` responderam HTTP 200; a API reportou `app=ok`, `database=ok`, versão `2.0.0`, scheduler ativo e sem falhas recentes. O bundle público contém a interface 2.0 e o preflight CORS para TTS passou.
- As verificações de saúde mostram OpenAI/Gemini configurados, mas n8n, WhatsApp/Evolution e Home Assistant continuam sem configuração válida no backend. Isso não foi mascarado como teste de integração. Chamada real de IA e geração de áudio ainda dependem de credenciais/cotas; o último TTS observado da ElevenLabs retornou HTTP 402.
- A atualização sem breaking changes zerou as vulnerabilidades do backend. No frontend, `npm audit --omit=dev` não aponta vulnerabilidades de produção, mas a auditoria completa ainda mostra 7 avisos em dependências de desenvolvimento transitivas do Tailwind CSS 3. O npm só oferece correção automática via `--force`, que migraria para Tailwind CSS 4; isso foi evitado por ser uma mudança incompatível que precisa de migração e testes próprios.
- A integração do GitHub negou a criação do PR com HTTP 403 (`Resource not accessible by integration`). Comparação pronta para abrir/criar PR: `https://github.com/juninnzx21/meujarvis/compare/main...codex/jarvis-2.0-platform-20261015?expand=1`.
- O CI roda em pushes de branches para validar a entrega antes do PR.

## Próximas etapas
1. Abrir e revisar o PR acima; a integração atual não tem permissão para criá-lo.
2. Abrir e revisar a branch publicada; a integração atual não tem permissão para criar o PR, apesar do compare link acima.
3. Planejar a migração do Tailwind CSS 3 para 4 para eliminar os avisos nas dependências de desenvolvimento, sem aplicar atualização forçada.
4. Configurar e validar n8n, Evolution/WhatsApp e Home Assistant no próprio painel, usando endpoints e tokens válidos.
5. Validar chamadas reais de IA/TTS com credenciais e cotas disponíveis, sem registrar segredos.
6. Preparar releases assinados para Windows e Android, instalar em dispositivos e seguir os processos de publicação das lojas.

## Revisao de segurança operacional — 2026-10-15

O endpoint de health detalhado foi protegido por sessão autenticada, passou a usar o estado das integrações salvas para o usuário atual e mantém os segredos mascarados. O monitor público deve consultar `/api/health/public`. Validação completa de backend depende do PostgreSQL de CI; o frontend passou 35 testes e build local.
