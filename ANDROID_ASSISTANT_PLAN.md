# Plano Android do JARVIS

## O que e possivel agora

- Instalar o JARVIS como PWA.
- Usar atalho na tela inicial.
- Abrir Chat, Voz, Tarefas, Financeiro e Status pelos shortcuts do PWA.
- Usar o WhatsApp como canal de texto, audio e arquivos com a frase `ei jarvis`.
- Usar microfone dentro do app quando o usuario toca no botao.

## Limites reais

- Substituir 100% o `Ei Google` nativo nao e garantido.
- Hotword sempre ouvindo depende de Android, fabricante, permissoes e APIs disponiveis.
- Um app comum nao deve ficar gravando microfone em segundo plano sem consentimento claro.
- Esta fase nao implementa escuta continua oculta.

## Fase futura recomendada

1. Capacitor Android.
2. Intent share/upload de arquivos para enviar extratos ao JARVIS.
3. Atalho de voz para abrir `/mobile-assistant`.
4. Push notifications.
5. Widgets Android.
6. Quick Settings Tile.
7. Foreground service opcional somente com consentimento claro.
8. Integracao com API de assistente do Android se viavel.

## Preparacao Capacitor

Ainda nao foi instalado nesta fase para reduzir risco e preservar o PWA/web atual.

Comandos planejados para fase futura:

```powershell
Set-Location E:\jarvis-home-assistant\frontend
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "JARVIS Home AI" "br.com.juninnzxtec.jarvis"
npx cap add android
npm run build
npx cap sync android
```

## Politica de microfone

O microfone so deve ligar por acao explicita do usuario. Qualquer modo persistente futuro deve exibir aviso claro, consentimento e indicador visual permanente.
