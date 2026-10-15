# Changelog

As mudanças notáveis do JARVIS são registradas neste arquivo.

## 2.0.0 — JARVIS Super Platform

- Consolidada a experiência do assistente com Brain, agentes, planejamento seguro, memória, feedback e roteamento entre provedores de IA.
- Mantidas as integrações de voz e centralizada a configuração dos provedores, incluindo modo automático, cotas e síntese remota.
- Incluídas experiências Desktop e Android/PWA, com controles locais limitados por políticas e confirmações.
- Ampliados os módulos de integrações, tarefas, automações, WhatsApp, Home Assistant, documentos e financeiro.
- Versão dos pacotes Desktop e Android: `2.0.0`. A API de produção ainda precisa receber `APP_VERSION=2.0.0` no ambiente de deploy para refletir o mesmo número no health.

Validação desta revisão: backend typecheck/build e 18 testes sem dependência de banco passaram; frontend typecheck/build e 35 testes passaram; Desktop typecheck/build e 4 testes passaram. Integração backend com banco e build Android aguardam ambiente apropriado.
