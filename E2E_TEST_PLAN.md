# Plano de testes E2E

## Ferramenta recomendada

Playwright com ambiente isolado e usuario de teste.

## Fluxos prioritarios

1. Login.
2. Dashboard.
3. Chat.
4. Memorias.
5. Tarefas.
6. Notificacoes.
7. Financeiro: contas, lancamentos, importacao e revisao.
8. n8n mock.
9. WhatsApp mock.
10. Responsividade desktop/mobile.

## Dados de teste

- Usuario admin de teste criado por `npm run create:admin`.
- Conta financeira fake `Inter PJ E2E`.
- CSV fake sem dados reais.
- Webhooks mockados.

## Criterios de aprovacao

- Login retorna dashboard.
- Chat responde sem quebrar.
- CRUDs principais persistem.
- Importacao financeira exige revisao antes de gravar.
- Logs nao exibem segredos.
- Layout mobile nao bloqueia navegacao.

## Nao fazer

- Nao usar dados bancarios reais.
- Nao enviar WhatsApp real em teste automatizado.
- Nao chamar Home Assistant sensivel.

## Status Fase 10

Status atual: planejado e documentado. A Fase 10 adicionou CI basico no GitHub Actions, mas os testes Playwright completos ainda nao foram ativados para evitar aumentar o risco operacional no mesmo pacote de mudancas.

Fluxos prioritarios para a proxima fase:

- login;
- dashboard/status;
- chat com fallback;
- tarefas;
- notificacoes;
- comandos;
- rotinas;
- financeiro;
- upload mockado OFX/CSV com revisao obrigatoria;
- WhatsApp mockado com `ei jarvis`;
- documentos/RAG;
- n8n configurado com mock;
- mobile viewport e PWA basico.

Critério de aceite futuro: `npm run e2e` deve rodar contra ambiente local isolado, com dados fake, sem credenciais reais, sem chamadas destrutivas e sem extratos reais.
- Nao rodar restore.

## Status Fase 3.0 - producao e uso diario

Status: **planejado / pendencia nao bloqueante**.

O projeto ainda nao possui `npm run e2e` no `frontend/package.json`. A decisao desta fase foi manter Playwright como plano claro em vez de instalar dependencia pesada durante a rodada de producao, porque os testes existentes ja cobrem backend e frontend por Vitest e as integracoes reais dependem de credenciais.

Fluxos que o E2E deve cobrir quando ativado:

- login e erro de login;
- dashboard e status;
- chat com modo Brain;
- `/brain`, `/brain/agents`, `/brain/tools`, `/brain/feedback`;
- voz sem iniciar microfone automaticamente;
- tarefas;
- central de integracoes e setup wizard;
- n8n com `manual_action_required` sem API key;
- WhatsApp com webhook oficial, QR mockado e regra `ei jarvis`;
- financeiro, importacao mock OFX/CSV e pagina de revisao;
- documentos/RAG com arquivo fake;
- mobile viewport e PWA basico.

Regra operacional: os E2E devem usar dados fake, ambiente local isolado, nenhum extrato real e nenhuma credencial real.
