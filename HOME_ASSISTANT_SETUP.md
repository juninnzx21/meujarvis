# Home Assistant - configuracao pelo JARVIS

Status: **preparado / manual_action_required sem token real**.

## Objetivo

Permitir que o JARVIS consulte entidades e prepare acoes seguras no Home Assistant sem expor token real ao frontend.

## Como configurar

1. Acesse `/settings/integrations` ou `/integrations/setup-wizard`.
2. Informe a URL do Home Assistant.
3. Informe o token de longa duracao.
4. Salve a configuracao.
5. Rode o teste de conexao.
6. Liste entidades para confirmar que a integracao esta operacional.

O frontend deve mostrar apenas `configured`, mascara/status e ultimo erro redigido. O token real nunca deve voltar na resposta da API.

## Regras de seguranca

- `light` e `switch` podem ser preparados/testados como acoes seguras.
- `lock`, `alarm`, `cover`, `garage` e portao exigem confirmacao explicita.
- Scheduler nao deve executar acao sensivel sem confirmacao.
- Logs devem conter apenas metadados redigidos.
- Sem token real, retornar `not_configured` ou `manual_action_required`.

## Validacao

- `GET /api/home-assistant/status`
- `POST /api/home-assistant/test-connection`
- `GET /api/home-assistant/entities`, somente se configurado
- Acao sensivel deve retornar `confirmation_required`
