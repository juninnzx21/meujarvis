# Guia de Ferramentas do Brain

As ferramentas internas sao consultas seguras usadas pelos agentes.

## Sistema

- `getSystemStatus`
- `getHealthFull`
- `getRecentLogs`
- `getNotifications`
- `getIntegrationStatus`

## Memorias

- `searchMemories`
- `listPersonalProfile`
- `createMemory` com confirmacao quando necessario

## Tarefas

- `listTodayTasks`
- `listOverdueTasks`
- `createTask` em modo preparado

## Financeiro

- `summarizeFinance`
- `listPendingImports`
- `detectDuplicates`
- `createTransactionDraft` com confirmacao

## Documentos

- `searchDocuments`
- `listDocuments`

## Integracoes

- `getN8nStatus`
- `listWorkflows`
- `getWhatsappStatus`
- `getEvolutionStatus`
- `getWebhookUrl`
- `getHomeStatus`
- `listEntities`
- `prepareSafeAction` com confirmacao

Nenhuma ferramenta retorna token, senha, API key, JWT_SECRET ou credencial real.

