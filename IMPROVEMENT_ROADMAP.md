# Roadmap de Melhorias do JARVIS Home AI

Data: 2026-05-16  
Status base: aprovado com ressalvas

## Prioridade 0 - Seguranca imediata

1. Rotacionar credenciais compartilhadas anteriormente.
   - Impacto: critico.
   - Inclui VPS/root, DirectAdmin/FTP, banco, JWT_SECRET, OpenAI, Gemini, Evolution, webhooks.

2. Remover/desativar login demo em producao.
   - Impacto: alto.
   - Criar usuario administrador real e exigir troca de senha.

3. Criptografar tokens salvos em `Setting`.
   - Impacto: alto.
   - Usar chave de criptografia no `.env`, nunca no frontend.

4. Corrigir roteamento `jarvis.juninnzxtec.com.br/api`.
   - Impacto: alto.
   - Opcao: manter API dedicada como oficial ou configurar proxy do dominio principal.

## Prioridade 1 - Estabilidade operacional

1. Monitoramento externo.
   - Health check periodico para frontend, API, banco, scheduler e Evolution.
   - Alertas por email/WhatsApp/Telegram.

2. Backup offsite com retencao.
   - Guardar backup fora da VPS/local.
   - Definir retencao diaria/semanal/mensal.
   - Testar restore em ambiente separado.

3. Ajustar health por usuario/admin.
   - Mostrar integracoes configuradas via painel, nao apenas env global.

4. Recriar container local do Postgres para garantir bind em `127.0.0.1`.
   - O compose atual ja esta correto; container antigo ainda mostrou `0.0.0.0`.

5. Investigar erros recentes do scheduler.
   - Health atual esta OK, mas logs mostram tick_error recente.

## Prioridade 2 - Produto para uso diario

1. Melhorar fluxo financeiro.
   - Criar/selecionar conta `PJ DO INTER` diretamente pelo painel.
   - Sincronizar contas do controle financeiro.
   - Mostrar ultimos lancamentos.
   - Confirmar lancamentos ambiguos antes de salvar.

2. Melhorar WhatsApp.
   - Tela com QR/status da instancia Evolution se API permitir.
   - Historico mais claro de mensagens.
   - Reprocessamento manual seguro de mensagens com erro.

3. Melhorar n8n.
   - Templates prontos de workflow.
   - Historico de chamadas.
   - Reenvio manual seguro.

4. Melhorar Home Assistant.
   - Mapeamento amigavel de comodos.
   - Permissoes por tipo de dispositivo.
   - Confirmacao forte para locks, alarmes, portoes e garagem.

5. Memoria semantica.
   - pgvector.
   - embeddings.
   - busca por relevancia real.

## Prioridade 3 - Producao comercial

1. Multi-tenant real.
   - Organizacoes/contas.
   - Isolamento de dados.
   - RBAC completo.

2. Auditoria e compliance.
   - Logs imutaveis para acoes sensiveis.
   - Exportacao LGPD.
   - Politica de retencao.

3. Pipeline CI/CD.
   - GitHub Actions.
   - Testes automáticos em PR.
   - Deploy automatizado com rollback.

4. Testes e2e.
   - Playwright para login, dashboard, chat, financeiro, WhatsApp mockado e responsividade.

5. Observabilidade profissional.
   - Metricas.
   - Traces.
   - Dashboard externo.
   - Sentry/OpenTelemetry ou equivalente.

6. Hardening da VPS.
   - Usuario deploy sem root.
   - SSH por chave.
   - Root password desabilitado.
   - Firewall com 22/80/443 apenas.
   - Atualizacoes automatizadas de seguranca.

## Ordem recomendada por fase

Fase 7:

- Rotacionar segredos.
- Corrigir roteamento `/api`.
- Criptografar tokens no banco.
- Remover demo em producao.
- Monitoramento externo basico.

Fase 8:

- Financeiro robusto: contas, categorias, reprocessamento e confirmacao.
- WhatsApp com QR/status e historico melhor.
- n8n com templates reais.

Fase 9:

- pgvector e memoria semantica.
- Streaming real token a token.
- e2e com navegador.

Fase 10:

- Multi-tenant, CI/CD, RBAC, auditoria comercial e observabilidade avancada.
# Roadmap atualizado apos hardening Fase 7

## Critico

- Rotacionar todos os segredos compartilhados.
- Definir `SETTINGS_ENCRYPTION_KEY` dedicado em producao.
- Manter `ALLOW_DEMO_LOGIN=false` em producao.
- Criar usuario `deploy` com chave SSH e desabilitar root por senha apos validar acesso.

## Importante

- Conectar monitor externo nas URLs de health.
- Implementar backup offsite criptografado.
- Criar testes E2E Playwright em ambiente isolado.

## Futuro

- Parser financeiro PDF/XLSX confiavel.
- Alertas reais por n8n/WhatsApp/Telegram.
- Rotacao automatizada de tokens por integracao.
