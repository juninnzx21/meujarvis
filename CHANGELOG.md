# Changelog

## Agent Sync V1 — 2026-10-17 (local, em validação)

- Adicionado executor local para conectar planejamento/revisão OpenAI ao Codex CLI, com seleção validada de tarefas elegíveis e encadeamento limitado a até três ciclos.
- Dry-run, lock exclusivo, sandbox de workspace, gate de PostgreSQL de teste antes de chamadas aos modelos, ambiente sintético de validação, avanço para `IN_REVIEW` e prevenção de repetição; sem timer, commit, push, merge ou deploy.
- Ciclo real aguarda `OPENAI_API_KEY` local e validação supervisionada; scheduler continua pausado.

As mudanças notáveis do JARVIS são registradas neste arquivo.

## 2.0.0 — JARVIS Super Platform

- Consolidada a experiência do assistente com Brain, agentes, planejamento seguro, memória, feedback e roteamento entre provedores de IA.
- Mantidas as integrações de voz e centralizada a configuração dos provedores, incluindo modo automático, cotas e síntese remota.
- Incluídas experiências Desktop e Android/PWA, com controles locais limitados por políticas e confirmações.
- Ampliados os módulos de integrações, tarefas, automações, WhatsApp, Home Assistant, documentos e financeiro.
- Versão dos pacotes Desktop e Android: `2.0.0`. A API de produção ainda precisa receber `APP_VERSION=2.0.0` no ambiente de deploy para refletir o mesmo número no health.

Validação desta revisão: backend typecheck/build e 18 testes sem dependência de banco passaram; frontend typecheck/build e 35 testes passaram; Desktop typecheck/build e 4 testes passaram. Integração backend com banco e build Android aguardam ambiente apropriado.

## 2026-10-22 — Staging isolado (preparação local)
- Acrescentados health checks e limites máximos aos quatro serviços do Compose de staging; rede interna e bind local mantidos/reforçados.
- Workflow de preflight agora aceita pull requests e valida recursos, health checks, rede e volume; configuração validada com valores sintéticos.
- Nenhuma conexão SSH, container, migration, VPS ou produção acessada. Staging não implantado.

## 2026-10-22 — Staging isolado (preparação local)
- Adicionados health checks e limites máximos aos quatro serviços do Compose de staging.
- Banco, backend e frontend ficam em rede interna; somente gateway também ingressa na bridge de publicação local.
- Workflow de preflight valida configurações em pull requests usando placeholders sintéticos; configuração passou localmente e falhou fechado sem variáveis.
- Nenhuma conexão SSH, container, migration ou produção acessada. Staging não implantado.


## 2026-10-24 — REL-001: consulta de candidatos integrada
A branch codex/release-console-integration-20261023 foi criada de origin/main (ee4f987) e integrou o histórico local existente de QA (f584187) com merge sem reescrita. A página QA agora consulta GET /releases/candidates usando autenticação existente, valida a resposta com Zod e mostra SHA, digest, destino, CI, evidências pendentes e histórico. Requisições são canceladas na saída/troca de usuário; falhas não viram listas vazias; URLs de CI usam origem fixa. Aprovar/rejeitar continuam desabilitados, sem consumidor de deploy.
Validação local: frontend validate PASS (62 testes, typecheck e build; aviso de bundle >500 kB); backend validate PASS (127 testes, 60 pulados por ausência de banco de integração; Prisma generate, typechecks e build). Revisão independente do incremento: sem achados acionáveis, 6 testes focados PASS com API simulada. Não representa E2E, staging ou produção verificados. Nenhuma migration, SSH ou deploy executado.
Pendências: PostgreSQL descartável, proveniência confiável GitHub, vínculo de identidade, permissão específica de aprovação, decisões no painel, staging com backup/restore/rollback e consumidor protegido. Scheduler permanece desativado e orçamento de APIs pagas R$0. Acesso VPS depende da resolução do incidente de identidade SSH registrado anteriormente.
