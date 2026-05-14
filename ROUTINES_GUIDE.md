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

## Seguranca

- Rotinas desativadas nao rodam.
- Execucoes geram `RoutineRun`.
- Logs de rotina nao devem incluir segredos.
- Rotinas de WhatsApp ou casa inteligente devem preservar confirmacao para acoes sensiveis.
