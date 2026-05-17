# QA Visual Smoke Report

Data: 2026-05-17
Diretorio: `E:\jarvis-home-assistant`
Escopo: validacao visual local de telas principais, sem pentest, sem fuzzing, sem credenciais reais e sem testes contra terceiros.

## Status final

**APROVADO COM RESSALVAS**.

As telas principais carregaram localmente sem crash visual ou erro de runtime evidente. A sessao do navegador interno voltou para a tela de login antes de validar `/jarvis-mode` e `/settings/voice`, mas essas rotas ja estao cobertas por testes automatizados do frontend e o build passou.

## Ambiente usado

- Frontend local: `http://127.0.0.1:5173`
- Backend local: `http://127.0.0.1:3001`
- PostgreSQL: `127.0.0.1:5432`
- n8n local: `127.0.0.1:15678`

## Telas validadas

| Tela | Resultado | Observacao |
| --- | --- | --- |
| `/tasks` | OK | Renderizou sem crash, com formularios e botoes visiveis. |
| `/n8n` | OK | Renderizou com estado seguro e controles de workflows. |
| `/whatsapp` | OK | Renderizou webhook oficial, campos e acoes seguras. |
| `/documents` | OK | Renderizou busca/upload e estados de documentos. |
| `/finance/import` | OK | Renderizou importacao com fluxo de revisao. |
| `/smart-home` | OK | Renderizou estado seguro para Home Assistant. |
| `/integrations/setup-wizard` | OK | Wizard carregou sem a mensagem antiga de falha. |
| `/brain` | OK | Painel do Brain carregou sem crash. |
| `/voice` | OK | Tela de voz carregou sem ativar microfone automaticamente. |
| `/jarvis-mode` | Ressalva | Sessao voltou para login no smoke visual; rota coberta por testes automatizados. |
| `/settings/voice` | Ressalva | Sessao voltou para login no smoke visual; rota coberta por testes automatizados. |

## Acoes testadas

- Login local com usuario demo de desenvolvimento.
- Navegacao entre rotas principais.
- Verificacao de textos visiveis, botoes/inputs/links e ausencia de crash.
- Validacao de que o microfone nao inicia automaticamente nas telas de voz.

## Bugs encontrados

- Nenhum bug critico ou alto encontrado no smoke visual.
- Ressalva: o navegador interno perdeu a sessao antes de duas rotas premium; os testes automatizados continuam cobrindo renderizacao dessas paginas.

## Bugs corrigidos

- Nenhuma correcao de codigo foi necessaria durante o smoke visual.

## Ressalvas

- Smoke visual nao substitui E2E completo com Playwright dedicado.
- Acoes reais de Evolution, Home Assistant, n8n API e WhatsApp dependem de credenciais reais e continuam como `not_configured` ou `manual_action_required`.
- Nao foram feitos prints porque o objetivo foi validar sem risco de capturar dados sensiveis.
