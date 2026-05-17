# Guia de Agentes do Brain

O Brain possui agentes internos com dominios, ferramentas permitidas e regras de seguranca.

- `GeneralAssistantAgent`: conversa geral, rotina e organizacao.
- `DeveloperAgent`: codigo, debug, Laravel, Node, React, Vue, Docker e prompts Codex.
- `DevOpsAgent`: VPS, Docker, Caddy, DNS, backups, logs e producao.
- `FinanceAgent`: contas, extratos, categorias, relatorios e fluxo de caixa.
- `BusinessAgent`: propostas, SaaS, vendas e apresentacoes.
- `PersonalMemoryAgent`: perfil, projetos, preferencias e prioridades do usuario.
- `DocumentsAgent`: documentos, RAG local, trechos e resumos.
- `HomeAssistantAgent`: casa inteligente e acoes com confirmacao.
- `WhatsAppAgent`: Evolution API, QR, webhook, anexos e regra `ei jarvis`.
- `N8nAutomationAgent`: workflows, eventos e automacoes n8n.
- `SecurityGuardianAgent`: limites, segredos, confirmacoes e redaction.
- `LearningCoachAgent`: estudo, explicacoes e plano de aprendizado.

Os agentes nao executam acoes perigosas diretamente. Quando uma acao tiver efeito real, o retorno deve ser `confirmation_required`.

