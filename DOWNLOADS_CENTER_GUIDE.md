# Central de Downloads JARVIS 2.0.0

Página autenticada: `https://jarvis.juninnzxtec.com.br/downloads`.

## Downloads

- Windows x64: `JARVIS-2.0.0-Desktop-Setup-x64.exe` (~106 MiB), publicado como asset da release pública `v2.0.0`.
- Android: `JARVIS-2.0.0-Android.apk` (1.185.087 bytes), pacote TWA 2.0.0 assinado para instalação direta.
- SHA-256 de ambos: `SHA256SUMS.txt`, ligado na Central e na release.
- O QR code da Central aponta diretamente para o APK Android.

O APK foi validado com `apksigner` (assinatura v2 válida), application id `br.com.juninnzxtec.jarvis.twa`, version name `2.0.0` e version code `20000`. O fingerprint SHA-256 do certificado é o mesmo registrado em `frontend/public/.well-known/assetlinks.json`.

O instalador Windows não tem assinatura Authenticode e pode mostrar o aviso SmartScreen de editor desconhecido. O checksum detecta corrupção, mas não substitui uma assinatura de publicador. O companion requer login no JARVIS e internet.

## Publicação

A tag `v2.0.0` aciona `.github/workflows/release-downloads.yml`: o Windows runner valida e compila o EXE, o job de release agrega o APK assinado, gera os checksums e cria a release pública no GitHub. O frontend aponta os botões da Central para os assets versionados. A publicação dos arquivos no GitHub não implanta automaticamente a página atualizada na VPS.

Para conferir no Windows:

```powershell
Get-FileHash .\JARVIS-2.0.0-Desktop-Setup-x64.exe -Algorithm SHA256
Get-FileHash .\JARVIS-2.0.0-Android.apk -Algorithm SHA256
```

Compare os hashes com `SHA256SUMS.txt` antes de instalar. Não envie os arquivos de chave ou senha em `.private-release/` ao GitHub ou ao site.

Este APK é para instalação direta e não é submissão da Play Store. Para a loja, use o AAB e a chave/identidade da Play Console. O EXE ainda não está assinado para Microsoft Store.
