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

## Plano de voz Android

O JARVIS pode ser instalado como PWA e usar `JARVIS BR Premium` com SpeechSynthesis do navegador. No Android, a qualidade depende das vozes instaladas no sistema/Chrome. O projeto nao implementa escuta continua oculta e nao substitui wake word nativa do Android nesta fase.

Futuro seguro: avaliar TTS premium licenciado, share intent, widgets e atalhos rapidos sem gravar audio bruto nem enviar documentos sensiveis para IA externa sem consentimento.

## Android TWA para Play Store — JARVIS 2.0.0

Foi criado o projeto Android em `android/` como Trusted Web Activity (TWA), usando o site HTTPS existente como experiência principal. Identificador: `br.com.juninnzxtec.jarvis.twa`; `versionName=2.0.0`; `versionCode=20000`; `minSdk=24`; `targetSdk=36`. O app exige conexão e login no JARVIS e não substitui o assistente padrão do Android nem mantém o microfone em escuta contínua.

Build assinado localmente:

```powershell
Set-Location E:\jarvis-home-assistant
pwsh -File .\android\build-release.ps1 -AndroidSdkPath E:\AndroidSdk
```

O script cria `android/release/JARVIS-2.0.0-Play-Store.aab` para Play Console e `android/release/JARVIS-2.0.0-Android-test.apk` para teste direto. A chave de upload fica em `.private-release/`, ignorada pelo Git; a senha está protegida por DPAPI e só pode ser recuperada no perfil Windows que a criou. Preserve ambos em um backup seguro do proprietário antes de trocar de computador ou perfil. Não publique nem envie a chave ao repositório.

### Associação do domínio

O arquivo-fonte `frontend/public/.well-known/assetlinks.json` contém a impressão digital da chave de upload local. O endpoint público `https://jarvis.juninnzxtec.com.br/.well-known/assetlinks.json` foi verificado e está respondendo HTML do fallback do site, não JSON; portanto, o domínio ainda não reconhece este app como TWA. Publique o arquivo na origem web. Depois de criar o app no Play Console, acrescente também à lista a impressão digital **App signing key certificate** fornecida pelo Google Play. A chave de upload e a chave de assinatura que o Play entrega aos usuários podem ser diferentes.

### Estado dos testes e da loja

- Gradle gerou AAB e APK de release assinados; `apksigner` validou o APK, `apkanalyzer` confirmou id, versão, minSdk 24 e targetSdk 36, e `jarsigner` confirmou a assinatura do AAB.
- Não havia aparelho Android conectado via ADB; instalação, login, captura de microfone e fluxo real de usuário ainda precisam ser testados em telefone.
- Bubblewrap não concluiu a auditoria PageSpeed/PWA porque o serviço respondeu HTTP 429. Isso não invalida a compilação, mas deixa a auditoria de qualidade externa pendente.
- A publicação exige uma conta Play Console, ficha da loja, política de privacidade, declarações de dados e assinatura do app vinculada ao console. Contas pessoais criadas após 13/11/2023 podem precisar do teste fechado com pelo menos 12 participantes por 14 dias antes do acesso à produção.
