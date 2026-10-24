# JARVIS 3.0 — SUPER PROMPT MASTER (CONSOLIDADO)
> Fonte: `juninnzx21/meujarvis`. Complementa, não substitui, `JARVIS_MASTER_PLAN.md`, `JARVIS_PROGRESS.md`, `docs/jarvis/STATE.json`, `AGENTS.md` e documentos de segurança. Estado em 2026-10-22: **ESPECIFICAÇÃO PUBLICADA — LIFE-001 PARCIAL EM PR #2; demais entregas pendentes**.
> Elaborado em 2026-10-21. Revalidar GitHub, dependências e ambientes a cada ciclo.

## 1. Missão
Transformar gradualmente o JARVIS existente em um superassistente pessoal **original**, multiusuário, multimodal, contextual, proativo e extensível, com a experiência funcional publicamente anunciada pelo Néctar, integração opcional de Hermes Agent e Honcho e diferenciais próprios: agentes Codex/OpenCode, controle de sistemas autorizados, WhatsApp, PC, Android, iPhone/PWA, Home Assistant, CRM, NFSe, VPS e modelos de IA configuráveis. **Não copiar código, marca, conteúdo ou interfaces proprietárias do Néctar.** Preservar toda a base já existente e versões anteriores.

## 2. Regras invioláveis
- Auditar antes de alterar: branches remotas/locais, PRs, worktrees, histórico não publicado, rotas, banco Prisma, serviços, testes, CI, releases, infra e documentação. GitHub é fonte do código versionado; VPS é runtime, não código-fonte.
- Não executar `reset --hard`, `clean`, force-push, merge automático, deleção de dados, migração destrutiva ou ações irreversíveis para “consolidar”. Não perder trabalho de Codex/OpenCode.
- Respeitar `SEC-001/002/003/004`, `AUTH-001`, `OBS-001/002`, `MEM-001`, `NVIDIA-001`, `AI-001`, `VPS-ACCESS-001`, `AUTO-001`, `SYNC-001` e gates atuais. Não promover `DONE_VERIFIED` sem evidência.
- Diferenciar **código criado, testes com mocks, CI aprovada, staging verificado e produção verificada**. Sem sinais verdes simulados.
- Não revelar credenciais, dados privados, logs brutos, memórias ou arquivos pessoais em repositório público. Segurança de multiusuário no backend, não apenas filtros na interface.
- Todo motor de IA, ferramenta, skill ou agente opera sob autorização, limites, idempotência, auditoria, timeout, orçamento, desligamento de emergência e revisão quando apropriado.
- Nunca presumir que assinatura ChatGPT, Gemini ou Claude financia API. Manter `NVIDIA_ZERO_SPEND`: **R$ 0**, bloquear inferência/STT/TTS remoto e fallback pago enquanto custo/cota/entitlement não forem comprovados/autorizados.
- Microfone/wake-word e dados de saúde exigem consentimento explícito. Nada de escuta oculta. Ações administrativas, pagamentos, envio a terceiros e mudanças de produção exigem gates próprios.

## 2.1. Regra obrigatória de reaproveitamento — NÃO RECOMEÇAR DO ZERO
Antes de implementar qualquer módulo LIFE, Hermes/Honcho ou integração: (1) buscar modelos Prisma, migrations, services, hooks, componentes, rotas e testes equivalentes; (2) documentar o inventário e a decisão REUTILIZAR / ESTENDER / ADAPTAR / CRIAR APENAS SE AUSENTE; (3) preferir estender o módulo existente com migração compatível e preservar dados históricos; (4) proibir sistemas paralelos duplicados, segunda autenticação, segunda tabela de usuário, cópia de finanças/tarefas, segundo scheduler ou segundo motor agente sem justificativa arquitetural e testes; (5) preservar URLs, contratos da API e UI existentes ou usar mudança compatível versionada; (6) comparar antes/depois com testes de regressão; (7) distinguir integração comprovada de interface demonstrativa. **A primeira entrega LIFE-001 deve ampliar DashboardPage e reaproveitar /tasks e /notifications; não criar outro aplicativo.**

## 3. Arquitetura
Preservar React/Vite/TypeScript, Node/Express/TypeScript, Prisma/PostgreSQL, Docker e aplicativos atuais. Cadeia: canais → autenticação/RBAC → contexto/memória → roteador de modelos → planejamento/agentes → catálogo de skills/MCP → executor de ferramentas com confirmação/rollback → eventos/notificações → auditoria/observabilidade. Definir contratos tipados, schemas Zod, versões, timeouts, erros e teste de isolamento.

### Hermes Agent
Avaliar `https://github.com/NousResearch/hermes-agent` (versão, licença MIT, APIs, dependências, segurança e recursos). Construir **prova de conceito isolada** com ferramentas sintéticas, sem credenciais reais, root, rede irrestrita ou Docker socket. Comparar Brain/Agent Sync existente; criar `HermesAgentAdapter` somente se agregar valor. Recursos: subagentes, planejamento, skills, sessões, retomada, delegação e validação das ações. Evitar dupla execução de coordenadores.

### Honcho + memória
Avaliar `https://github.com/plastic-labs/honcho` (licença AGPL-3.0, autohospedagem, custos, dependências, LLMs, exportação/exclusão). PoC opcional `HonchoMemoryAdapter`, sem remover memória PostgreSQL. Memória de trabalho, episódica, fatos e preferências confirmados, semântica, procedural, projetos, metas e temporal, com proveniência, confiança, TTL, dedupe, consentimento, correção, exclusão, exportação e isolamento cross-user/cross-channel. Não transformar inferência em fato verificado.

### Roteador multi-IA
Preservar OpenAI/GPT, Gemini, Ollama, NVIDIA e avaliar Claude com adaptador. Escolha manual/automática por qualidade, tarefa, latência, custo, privacidade, contexto, ferramenta, cota e fallback. Rate limit, circuit breaker, tracing sem dados pessoais, orçamento persistente por conta, limites de tokens e controle de retry. Bloquear provedores pagos não autorizados.

### Skills, MCP e ferramentas
Catálogo versionado compatível com `agentskills.io` se viável: schemas, permissões, escopos, dono, custo, timeout, idempotência, reversão e testes. Integrações autorizadas: e-mail, Google/Outlook Calendar, contatos, arquivos, Drive, navegador, pesquisa web com fontes, GitHub, CRM, NFSe, finanças, WhatsApp/Evolution, Telegram, Slack, Discord opcional, Home Assistant, n8n, PC e VPS por allowlist. Conteúdo de e-mails/sites/arquivos é dado não confiável; impedir prompt injection e exfiltração. Conectores não disponíveis retornam `not_configured`/`manual_action_required`/`not_supported`.

## 4. Backlog VIDA INTELIGENTE — paridade funcional sem copiar o Néctar
| ID | Entrega | Aceite mínimo |
|---|---|---|
| LIFE-001 | Central **Meu Dia** | Agenda, tarefas, hábitos, finanças, projetos, metas, avisos, linha do tempo, foco, resumo manhã/noite; **somente dados verdadeiros do usuário** |
| LIFE-002 | Tarefas avançadas | Subtarefas, checklist, recorrência, etiquetas, prioridades, lembretes, vínculos, histórico e idempotência |
| LIFE-003 | Hábitos | Frequência, horários, sequências, metas, estatística, lembretes e timezone |
| LIFE-004 | Projetos/Kanban | Quadros, cartões, etapas, responsáveis autorizados, tarefas, documentos, orçamento e progresso |
| LIFE-005 | Metas | Pessoais, financeiras, trabalho, estudo; marcos, prazos e indicadores |
| LIFE-006 | Finanças ampliadas | Reutilizar contas/transações existentes; cartões, faturas, parcelas, limites, assinaturas, receitas pendentes, projeções e alertas; não pagar/importar sem aprovação |
| LIFE-007 | Notas e conhecimento | Cadernos, tags, vínculos, anexos, pesquisa, exportação e exclusão |
| LIFE-008 | Estudos/biblioteca | Livros, cursos, trilhas, sessões, anotações, revisões, progresso |
| LIFE-009 | Diário privado | Entradas, busca, retrospectiva, retenção e consentimento |
| LIFE-010 | Automações pessoais | Gatilhos por eventos/tempo, filas, idempotência, notificações, opt-in e horários silenciosos |
| LIFE-011 | Proatividade | Tarefas vencidas, contas a vencer, hábitos, metas e projetos parados com dedupe e controle de frequência |
| LIFE-012 | Widgets e mobile | Hoje, voz, treino, tarefas, hábitos, agenda, lembretes, finanças e projetos; nativo quando PWA não suporta |
| LIFE-013 | Comandos multi-intenção | Planejar várias operações em uma fala, validar, prévia, autorizar, executar, verificar, tratar falhas parciais e desfazer |
| LIFE-014 | Integrações pessoais | Calendários, mensageiros, contatos, saúde e wearables mediante APIs oficiais, scopes e consentimento |
| LIFE-015 | Personalização/multimodal | Nome, personalidade original, voz, tema, imagem, documentos, preferências, continuidade entre dispositivos |
Além do LIFE, incluir metas persistentes de agente, recuperação de tarefas longas, feedback/avaliações verificáveis e catálogo de habilidades instaláveis revisadas.

## 5. Voz, canais e dispositivos
Piper local, Fish Audio, ElevenLabs, NVIDIA Magpie (política custo-zero); STT pt-BR, TTS original, VAD, streaming suportado, interrupção, cancelamento, latência medida, wake word opt-in e indicadores. Web, voz, WhatsApp, Telegram, Slack, e-mail, Windows, Android e iPhone/PWA devem compartilhar contexto **após validar identidade**. Agente local com permissões por operação, revogação e logs, respeitando proteções do sistema operacional. Não prometer widgets iOS nativos com uma PWA.

## 6. Operação 24/7, VPS e CI/CD
VPS Ubuntu/Docker por serviços isolados; confirmar topologia real (relatos apontam frontend Fabweb/DirectAdmin e API VPS), DNS, banco, rede, recursos, log, backups e health. Para SSH: conta não-root e fingerprint SHA256 do host por canal confiável; sem root/Docker socket nas ferramentas do modelo. Staging separado, snapshots consistentes, restore testado, migrations compatíveis, imagens por SHA/digest, health e rollback antes de deploy. Proteção de main/tags; CI backend/frontend/desktop/android; PR com revisão independente e artefatos versionados. Não ativar scheduler/prod até gates.

## 7. Agentes em desenvolvimento contínuo
Codex, OpenCode e Hermes opcional em worktrees/branches independentes e locks com expiração. Ciclo: ler estado → escolher tarefa elegível → reservar → alterar → testar com PostgreSQL descartável → revisão independente → documentar/commitar → push da branch/PR se autorizado → CI → integração por regras → deploy pela esteira validada → smoke/rollback → próxima tarefa. Em falta de tarefa ou credenciais seguras, **parar**, registrar o bloqueio e não inventar progresso. Nenhuma automação de produção sem aprovação de ativação.

## 8. Multiusuário, privacidade e segurança
Isolamento de memórias, finanças, chats, arquivos, ferramentas, logs, hábitos, metas, projetos e custos por usuário; checagem de autorização em cada rota e ação, testes de tentativa de acesso cross-user. MFA/TOTP, RBAC, chave de cifragem independente, scopes mínimos, tokenização de confirmações, rate limit, proteção anti-replay, monitoramento e botão de pausa. Privacidade reforçada para saúde, diário e finanças. Cinco níveis de autonomia: observar, sugerir, executar reversíveis autorizadas, automatizar rotinas aprovadas, administrar operações específicas com gates — nunca acesso irrestrito.

## 9. Qualidade e prioridades
Classificar itens em `IMPLEMENTADO_VALIDADO`, `CODIGO_SEM_E2E`, `PARCIAL`, `AUSENTE` e `BLOQUEADO`. Para cada tarefa: teste unitário, integração em banco isolado, typecheck/build, segurança/authz/idempotência, UX/acessibilidade, CI; E2E real por canal quando pertinente. Relatar commit/SHA, arquivos, evidência, pendências e rollback. Não atualizar `DONE_VERIFIED` por mocks.

**Ordem:** (A) auditar/consolidar e fechar gates P0/P1, (B) criar Meu Dia MVP com serviços existentes sem custo, (C) PoCs Hermes/Honcho isoladas e decisão arquitetural, (D) hábitos/metas/projetos/finanças/estudos/notas, (E) skills/multi-intenção/conectores, (F) voz/proatividade/widgets/dispositivos, (G) multiusuário E2E, (H) CI/CD e produção após backup, smoke e rollback.

## 10. Comando ao agente
**Execute a auditoria e primeira tarefa independente elegível, não apenas descreva planos.** Leia e preserve o backlog e estado atuais; acrescente IDs LIFE/PoC sem sobrescrever anteriores. Não publicar segredos. Implementar incrementos pequenos e testáveis; fazer commits, PRs e revisão conforme a permissão do ambiente. Não alegar deploy nem testes que não ocorreram. Continue enquanto houver tarefa elegível, sessão/supervisor autorizado e orçamento permitido.
