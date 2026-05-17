# VOICE_ASSISTANT_GUIDE

## JARVIS BR Premium

`JARVIS BR Premium` e uma voz original do projeto JARVIS Home AI. Ela nao clona voz de ator real, nao copia voz de personagem de filme, nao usa amostras de audio de obras protegidas e nao depende de identidade vocal de terceiros.

O objetivo e uma voz masculina ou neutra grave quando disponivel, calma, elegante, confiante, tecnologica e natural em portugues brasileiro claro.

## Como funciona

O frontend usa `SpeechSynthesis` local do navegador. A qualidade e a lista de vozes dependem do sistema operacional e do navegador instalado.

Rotas principais:

- `/voice`: conversa por voz com botao explicito de microfone.
- `/jarvis-mode`: central premium de comando com resposta falada e atalhos.
- `/settings/voice`: ajustes de voz, idioma, velocidade, pitch e volume.
- `/mobile-assistant`: uso rapido no celular com voz e comandos curtos.

## Configuracao recomendada

- Preset: `JARVIS BR Premium`
- Idioma: `pt-BR`
- Velocidade: `0.90` a `0.95`
- Pitch: `0.75` a `0.88`
- Volume: `1`
- Voz preferida: masculina/neutra `pt-BR`; se nao houver, testar `en-GB` manualmente.

## Privacidade

- O microfone so ativa quando o usuario clica no botao.
- Nao existe escuta continua oculta.
- Audio bruto nao deve ser salvo em logs.
- O backend recebe apenas texto/transcricao para processar.

## Limitacoes reais

- `SpeechSynthesis` varia por navegador e sistema operacional.
- Alguns navegadores nao oferecem voz masculina/neutra em `pt-BR`.
- Reconhecimento de voz pode nao existir em todos os navegadores.
- Um TTS premium licenciado pode ser integrado futuramente, desde que use voz propria/licenciada e consentimento adequado.

## Teste rapido

1. Acesse `/settings/voice`.
2. Clique em `Aplicar preset`.
3. Ajuste `rate` entre `0.90` e `0.95`.
4. Ajuste `pitch` entre `0.75` e `0.88`.
5. Clique em `Testar voz`.
6. Acesse `/voice` e clique em `Falar com JARVIS`.

## Fase 14 - JARVIS Super Intelligence Core

O JARVIS agora possui um Brain interno em `/api/brain/*` e painel em `/brain`, com agentes especialistas, roteador de intencoes, ferramentas internas seguras, contexto por memorias/documentos/financeiro/status, feedback/aprendizado e verificador de resposta. O Brain nao treina modelo do zero; ele orquestra OpenAI/Gemini/fallback local com limites de seguranca.

Rotas principais: `/brain`, `/brain/agents`, `/brain/tools`, `/brain/memory`, `/brain/feedback`. Chat e voz usam o Brain mantendo compatibilidade. WhatsApp continua exigindo `ei jarvis` e OFX/CSV continuam exigindo revisao.
