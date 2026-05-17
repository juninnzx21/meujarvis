# Guia Mobile/PWA do JARVIS

Status: Fase Mobile implementada.

Frontend: `https://jarvis.juninnzxtec.com.br`

API oficial: `https://apijarvis.juninnzxtec.com.br/api`

## Como instalar no Android

1. Abra o Chrome no Android.
2. Acesse `https://jarvis.juninnzxtec.com.br`.
3. Toque no menu de tres pontos.
4. Toque em `Adicionar a tela inicial` ou `Instalar app`.
5. Abra o JARVIS pelo icone instalado.

## Como usar no celular

- `Inicio`: dashboard principal.
- `Chat`: conversa com historico.
- `Voz`: botao de microfone acionado manualmente.
- `JARVIS Mobile`: tela focada de assistente com voz, texto e atalhos.
- `Tarefas`: tarefas, filtros e lembretes.
- `Financeiro`: saldos, lancamentos, importacao de extratos e relatorios.
- `Notificacoes`: alertas e pendencias.
- `Status`: saude do sistema e integracoes.

## Como deixar parecido com assistente

- Fixe o PWA na tela inicial.
- Coloque o icone em local de acesso rapido.
- Use os atalhos PWA: Voz, Chat, Tarefas, Financeiro e Status.
- Se o aparelho permitir, configure gesto/botao do launcher para abrir o JARVIS.
- Use o WhatsApp como canal de texto/voz com a frase `ei jarvis`.

## WhatsApp

Webhook Evolution API:

`https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`

Exemplos:

- `ei jarvis status do sistema`
- `ei jarvis quais tarefas tenho hoje?`
- `ei jarvis registrar entrada de R$ 120,00 cliente Joao`
- `ei jarvis importar esse extrato do Inter`
- `ei jarvis resumo financeiro do mes`

Arquivos OFX/CSV enviados pelo WhatsApp criam previa para revisao. O JARVIS nao importa direto.

## Privacidade

- O microfone so e ativado quando o usuario toca no botao.
- Nao ha escuta continua oculta.
- O service worker nao cacheia `/api/*`, Authorization, cookies, tokens ou respostas autenticadas.
- Dados sensiveis devem ser buscados online pelo backend autenticado.

## Limitacoes

- O PWA nao substitui totalmente o `Ei Google`.
- Wake word sempre ouvindo depende do Android/fabricante/permissoes e nao foi implementada.
- Push notifications reais ainda sao fase futura.
- App Android nativo ainda nao foi criado; a base esta preparada para Capacitor futuramente.

## Voz premium no mobile

O `/mobile-assistant` usa a voz original `JARVIS BR Premium` via SpeechSynthesis local do navegador. O microfone so e ativado por toque/click explicito, nao existe escuta continua oculta e audio bruto nao deve ser salvo em logs.

Para ajustar a voz no celular, abra `/settings/voice`, aplique o preset e teste rate entre `0.90` e `0.95`, pitch entre `0.75` e `0.88` e volume `1`.
