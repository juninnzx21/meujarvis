# SCHEDULER GUIDE

## Visao geral

O scheduler da Fase 6 roda dentro do backend e executa verificacoes seguras em intervalo configuravel. Ele nao executa comandos shell, nao envia WhatsApp sem confirmacao, nao executa acoes sensiveis do Home Assistant e nao repete notificacoes ja enviadas.

## Variaveis

```env
SCHEDULER_ENABLED=true
SCHEDULER_INTERVAL_SECONDS=60
```

Se `SCHEDULER_ENABLED=false`, o servico nao executa ticks automaticos.

## O que ele verifica

- Rotinas ativas com `triggerType: schedule`.
- Tarefas com `reminderAt` vencido e `reminderSentAt` vazio.
- Tarefas vencidas com `dueDate` passado e `overdueNotifiedAt` vazio.
- Registro de `SystemLog` a cada tick executado.

## Formatos de agenda

```json
{ "schedule": { "type": "daily", "time": "08:00" } }
```

```json
{ "schedule": { "type": "weekly", "dayOfWeek": 1, "time": "09:00" } }
```

```json
{ "schedule": { "type": "interval_minutes", "minutes": 30 } }
```

## Deduplicacao

- Rotina: usa `Routine.lastRunAt`.
- Lembrete: usa `Task.reminderSentAt`.
- Vencimento: usa `Task.overdueNotifiedAt`.

## Seguranca

O scheduler bloqueia acoes sensiveis declaradas como `whatsapp.send`, `home_assistant.sensitive`, `shell` e `mass_message`. Qualquer erro e registrado com redaction antes de persistir logs.
