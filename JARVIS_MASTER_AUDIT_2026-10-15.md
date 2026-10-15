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

A validação mais recente desta rodada é [JARVIS CI #25](https://github.com/juninnzx21/meujarvis/actions/runs/38729501272), commit `b500e0d`; os jobs `validate`, `desktop` e `android` terminaram com sucesso. O commit também corrige a exposição CORS do cabeçalho que informa qual provedor TTS gerou o áudio e inclui teste de preflight.

Validação local adicional: frontend `npm run validate` passou (35 testes e build). O backend passou typecheck e typecheck dos seeds, mas a suíte local não pôde executar por falta de PostgreSQL/Docker nesta máquina; a suíte completa do backend passou no CI com PostgreSQL descartável.

Depois disso, o lockfile do backend foi atualizado com `npm audit fix` sem `--force`: os 13 avisos de dependências foram eliminados e `npm audit` passou sem vulnerabilidades. Typecheck, typecheck dos seeds e build do backend passaram localmente; o CI precisa validar o lockfile atualizado.

Durante o CI foram corrigidos problemas reais da esteira: ação Android antiga solicitava o pacote removido `tools`; `JWT_SECRET` de teste era menor que a validação mínima; faltava semear o banco temporário; alguns testes não refletiam a exigência atual de confirmação para gravar memória e deixavam transporte HTTP mockado incompleto; o scanner de segredo dava falso positivo em fixture de teste e na própria expressão regular. A suíte foi executada novamente e passou.

## Entrega e estado de produção
- Repositório: `juninnzx21/meujarvis`; base `main` estava em `ee4f987` quando comparada.
- Branch: `codex/jarvis-2.0-platform-20261015`; contém o sincronismo das implementações JARVIS 2.0, ajustes de versão/documentação e workflow de CI.
- A branch `main` e a VPS de produção não foram alteradas.
- A comparação da cópia de produção com a branch encontrou 15 arquivos de código diferentes. As diferenças incluem a versão exibida, proteção para exigir confirmação antes de criar memória/tarefa, validação do endpoint Brain, seleção do provedor local Ollama e ajustes de voz/instalação. A cópia do servidor não é um checkout Git; o compose e a aplicação estão implantados por imagem Docker.
- A base PostgreSQL de produção ocupa aproximadamente 14 MB e o diretório JARVIS cerca de 109 MB. Há 36 GB livres na raiz. Ainda não foi feito backup de produção nesta rodada nem deploy; a implantação permanece pendente de backup externo verificável e revisão final da divergência de código/configuração para permitir rollback seguro.
- A atualização sem breaking changes zerou as vulnerabilidades do backend. No frontend, `npm audit --omit=dev` não aponta vulnerabilidades de produção, mas a auditoria completa ainda mostra 7 avisos em dependências de desenvolvimento transitivas do Tailwind CSS 3. O npm só oferece correção automática via `--force`, que migraria para Tailwind CSS 4; isso foi evitado por ser uma mudança incompatível que precisa de migração e testes próprios.
- A integração do GitHub negou a criação do PR com HTTP 403 (`Resource not accessible by integration`). Comparação pronta para abrir/criar PR: `https://github.com/juninnzx21/meujarvis/compare/main...codex/jarvis-2.0-platform-20261015?expand=1`.
- O CI roda em pushes de branches para validar a entrega antes do PR.

## Próximas etapas
1. Abrir e revisar o PR acima; a integração atual não tem permissão para criá-lo.
2. Validar no CI a atualização segura do lockfile do backend.
3. Planejar a migração do Tailwind CSS 3 para 4 para eliminar os avisos de desenvolvimento, sem aplicar atualização forçada.
4. Revisar com segurança as 15 diferenças contra a imagem atual, fazer backup externo verificável de fonte/configuração/base e só então implantar com rollback documentado. O ambiente efetivo ainda precisa ser conferido, inclusive `APP_VERSION`; nenhuma implantação foi feita nesta etapa.
5. Validar TTS, IA, WhatsApp e Home Assistant com credenciais/cotas reais, sem registrar segredos.
6. Preparar releases assinados para Windows e Android, instalar em dispositivos e seguir os processos de publicação das lojas.
