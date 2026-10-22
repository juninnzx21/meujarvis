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
