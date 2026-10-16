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
