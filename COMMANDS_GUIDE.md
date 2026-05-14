# Guia de comandos

A Central de Comandos fica em `/commands`.

## Comandos iniciais

| Comando | Exemplo | Seguranca |
| --- | --- | --- |
| Status do sistema | `status do sistema` | Seguro |
| Criar tarefa | `crie uma tarefa para revisar pendencias` | Seguro |
| Criar memoria | `lembre que prefiro relatórios objetivos` | Seguro, exceto dados sensiveis |
| Listar tarefas | `liste minhas tarefas` | Seguro |
| Listar memorias | `liste minhas memorias` | Seguro |
| Testar n8n | `testar n8n` | Seguro |
| Testar WhatsApp | `testar WhatsApp` | Seguro |
| Testar Home Assistant | `testar Home Assistant` | Seguro |
| Ligar luz | `ligar luz light.sala` | Seguro para `light.*` |
| Desligar luz | `desligar luz light.sala` | Seguro para `light.*` |
| Resumo do dia | `gerar resumo do dia` | Seguro |
| Relatorio de pendencias | `resuma minhas pendencias` | Seguro |
| Preparar WhatsApp | `preparar mensagem para 5511999999999` | Exige confirmacao |

## Regras

- Comandos sensiveis nao sao executados sem confirmacao.
- WhatsApp prepara mensagem, mas nao envia automaticamente.
- Logs registram a execucao com redaction.
- Comandos perigosos, destrutivos ou shell arbitrario sao bloqueados.
