# Changelog de implementação

## 2026-10-16 — baseline e governança (documentação local, sem commit)

- Adicionados plano mestre, progresso append-only, estado JSON, runbook, decisões, evidências, registro de segurança e este changelog.
- Adicionada proposta de runner e definição de agendamento Windows, ambos desabilitados por padrão.
- Criada automação Codex horária em status PAUSED; o prompt é fail-closed e o repositório ainda não está associado como projeto.
- Validado dry-run isolado e schema JSON/XML; nenhum timer OS foi registrado/ativado.
- Indexadas as 12 auditorias existentes; referenciado o checkup VPS fora do checkout para evitar publicar inventário operacional.
- Nenhum fonte/app, banco, dependência, imagem, container, volume, DNS, firewall ou serviço alterado.
- Nenhum commit, push ou deploy realizado.

## 2026-10-16 — SEC-001/SEC-004 em branch isolada (sem deploy)

- Webhook Evolution recebe segredo aleatório criptografado e configurado em header por instância; valida evento, instância, ID, remetente permitido, limita taxa e deduplica IDs no banco.
- Removidos fetches de URLs externas para áudio/anexos, eliminando encaminhamento da API key Evolution; base64 inline limitado a 8 MiB.
- Adicionada migration para ID externo único e testes negativos/regressões de mídia.
- Backend typecheck/build e 34 testes sem DB passaram; testes focados 5/5; frontend validate 47/47 e build passaram; schema válido; auditorias de produção sem vulnerabilidades reportadas.
- `npm run validate` backend parou no primeiro `prisma generate` por EPERM; repetição isolada passou. Integração DB não executada (Docker daemon/PostgreSQL local indisponíveis).
- Branch `codex/sec-001-004-webhook-media-20261016`; commit local `2932b70`; sem push, PR novo, merge ou deploy.

## Registro de releases anteriores

Use `docs/audits/jarvis-v2-functional/` como auditoria baseline da versão 2.0.0. Checkup da VPS da mesma data está em local externo referenciado em `TEST_EVIDENCE.md`; não confundir snapshot com estado atual.

## 2026-10-16 — validação PostgreSQL isolada e limite de mídia

- `decodeInboundBase64` rejeita strings acima do tamanho bruto permitido antes de normalizar, com regressões para anexos e áudio acima de 8 MiB.
- A suíte integrada prepara configuração WhatsApp apenas nos casos de webhook, evitando contaminação de testes que esperam integração desativada.
- Acrescentados testes de segredo errado, evento inválido, segredo cifrado no banco, isolamento de usuário e rate limit; replay continua verificado no PostgreSQL.
- Migration aplicada sobre duas mensagens legadas e testada por rollback/reaplicação no banco descartável; ambas preservadas.
- Backend 82 testes, frontend 47 e desktop 4; typechecks e builds passaram. Nenhuma dependência foi atualizada e nenhuma mudança chegou à produção.

## Modelo para entradas futuras

`<UTC date> — <TASK-ID> — <resumo>`: componentes, arquivos, comportamento antes/depois, flags/env e migrações, testes/evidências, commit/PR/release, status deploy separado e instruções de rollback.

## 2026-10-16 — robustez do runner e fechamento de teste isolado

- Runner horário agora lê expirations convertidas em `DateTime` pelo PowerShell e strings ISO sem depender da cultura regional.
- Dry-run, lock concorrente e bloqueio de execução sem gates foram validados em diretório temporário isolado.
- PostgreSQL descartável foi encerrado e seus artefatos temporários removidos; produção permaneceu inalterada.

- GitHub Actions run #53 passou com 3/3 checks; PR separado não criado porque a integração recusou a criação com 403 e a sessão web não estava autenticada.

## AUTH-001 — 2026-10-17

Adicionado em branch isolada o núcleo TOTP RFC 6238 e os testes determinísticos. Não foi ligado ao login e não ativa MFA. Permanecem pendentes armazenamento cifrado, enrollment, recuperação, revogação e integração autenticada.
# 2026-10-17 — AUTH-001 — MFA administrativo em revisão local

- Integrado login admin em duas etapas: senha + TOTP; primeiro acesso exige enrollment com QR e verificação do primeiro código.
- Migration adiciona estado MFA, segredos ativos/pendentes cifrados, hashes de recovery, contador TOTP consumido e versão de sessão.
- Recovery codes são single-use; recuperação/desativação incrementa authVersion e revoga tokens anteriores. Desativação exige senha e TOTP ou recovery code.
- Interface de login suporta QR, TOTP e código de recuperação; Configurações mostra status de MFA e fluxo protegido de desativação.
- Verificação isolada: backend 82 testes + build; frontend 49 testes + typecheck/build, incluindo os fluxos visuais de enrollment e recovery. Nenhum deploy, push, merge, alteração VPS ou automação.

## 2026-10-18 — OBS-001 — saúde e correlação HTTP (em revisão)

- Adicionado correlation ID do servidor (`X-Request-Id`) exposto ao frontend via CORS; logs registram método, template da rota, status e duração sem query string ou corpo.
- Health retorna readiness degradado quando o banco falha, distingue integração configurada de conectividade testada e usa `unknown` quando não consegue consultar estado.
- Adicionados contadores HTTP voláteis e alertas internos genéricos de 5xx, deduplicados por rota/status por 60 segundos; o painel diferencia falhas e histórico indisponível e não trata somente configuração como operação.
- Validação: backend 153/153, zero skips, PostgreSQL descartável verificado; integração app 43/43 após asserção CORS; frontend 49/49 e build. Evidências em `docs/jarvis/TEST_EVIDENCE.md`.
- Limites: sem probes ativos, notificações externas, persistência dos contadores, smoke test VPS ou deploy. Revisão independente pendente.

## 2026-10-22 — auditoria PR #2 / LIFE-001

- CI remota confirmada para `89eacaf2c3007b5eea6b529f09609a5208404083` (run `39828531504`, jobs `validate`, `desktop`, `android` aprovados).
- Auditoria registrou o escopo parcial do Meu Dia, autorização por usuário nas rotas existentes, fuso local do navegador e limites da listagem de notificações.
- Preflight de configuração do Compose de staging passou com placeholders sintéticos; Docker daemon indisponível, sem inicializar serviços.
- Asserções estáticas equivalentes a `staging-preflight.yml` também passaram: quatro serviços esperados, bind em loopback, sem containers nomeados/privileged, scheduler desligado e sem credenciais externas.
- PR draft preservado; nenhuma ação em produção, VPS, merge, scheduler ou API paga.
