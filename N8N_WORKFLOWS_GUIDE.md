# Workflows n8n padrao do JARVIS

Os workflows importaveis ficam em `n8n/workflows/`.

## Workflows criados

1. `jarvis-system-alert.json`
2. `jarvis-daily-summary.json`
3. `jarvis-task-created.json`
4. `jarvis-task-overdue.json`
5. `jarvis-backup-completed.json`
6. `jarvis-finance-transaction.json`
7. `jarvis-statement-import.json`
8. `jarvis-whatsapp-command.json`
9. `jarvis-health-monitor.json`
10. `jarvis-evolution-test.json`

Nenhum workflow contem credencial real.

## Como importar

1. Abra o n8n.
2. Va em `Import from file`.
3. Selecione um JSON de `n8n/workflows/`.
4. Configure credenciais reais dentro do n8n quando necessario.
5. Ative o workflow somente depois de testar.

## Eventos JARVIS

Templates suportados no backend:

- `task.created`
- `task.completed`
- `task.overdue`
- `routine.run`
- `backup.completed`
- `system.alert`
- `finance.transaction.created`
- `finance.statement.import.created`
- `whatsapp.command.received`
- `whatsapp.statement.received`
- `jarvis.daily.summary`
- `jarvis.weekly.report`
- `integration.failed`
- `scheduler.tick_error`

Os payloads enviados pelo JARVIS devem ser redigidos e nao devem conter tokens, Authorization, cookies, senhas, API keys, conteudo bruto de extrato ou documento sensivel.

## Teste pelo painel

No JARVIS:

1. Abra `/n8n`.
2. Salve URL/token do webhook.
3. Clique em `Testar webhook n8n`.
4. Use os botoes de template.

Se o n8n estiver ausente, o JARVIS retorna `not_configured` sem quebrar.
# Central de Integracoes

Os workflows podem ser vistos no painel `/n8n` e na Central `/integrations`.

Endpoints relacionados:

- `GET /api/n8n/workflows/local`
- `POST /api/n8n/workflows/import/:name`
- `POST /api/n8n/workflows/import-all`
- `POST /api/n8n/workflows/test/:name`

Quando a API key do n8n nao estiver configurada, o JARVIS retorna `manual_action_required` e orienta importacao manual pelo editor do n8n.
