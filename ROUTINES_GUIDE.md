# Guia de rotinas

Rotinas ficam em `/routines` e tambem podem ser acessadas via API.

## Rotinas seed

- Resumo diario
- Revisao de tarefas pendentes
- Checagem do sistema
- Teste de integracoes

## Endpoints

- `GET /api/routines`
- `POST /api/routines`
- `PUT /api/routines/:id`
- `DELETE /api/routines/:id`
- `POST /api/routines/:id/run`
- `GET /api/routines/:id/runs`

## Configuracao

O campo `config.report` define qual relatorio a rotina executa:

- `daily-summary`
- `tasks`
- `system`
- `activity`
- `integrations`

## Scheduler

Rotinas com `triggerType: schedule` rodam automaticamente quando `SCHEDULER_ENABLED=true`.

Exemplos:

```json
{ "report": "daily-summary", "schedule": { "type": "daily", "time": "08:00" } }
```

```json
{ "report": "tasks", "schedule": { "type": "weekly", "dayOfWeek": 1, "time": "09:00" } }
```

```json
{ "report": "system", "schedule": { "type": "interval_minutes", "minutes": 30 } }
```

O scheduler usa `lastRunAt` para evitar execucao duplicada.

## Seguranca

- Rotinas desativadas nao rodam.
- Execucoes geram `RoutineRun`.
- Execucoes agendadas tambem geram `Notification`.
- Logs de rotina nao devem incluir segredos.
- Rotinas de WhatsApp ou casa inteligente devem preservar confirmacao para acoes sensiveis.
