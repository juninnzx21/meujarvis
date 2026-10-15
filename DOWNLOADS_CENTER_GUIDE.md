# Central de Downloads JARVIS

Página autenticada: `https://jarvis.juninnzxtec.com.br/downloads`.

## Windows x64

- Versão publicada: `1.0.0` (14/10/2026).
- Arquivo: `JARVIS-Desktop-Setup-x64.exe` (111.131.660 bytes).
- SHA-256: `0248fb9d25173d54b882c1d410c6964e174de00597971925db2b1d13e27d4291`.
- Assinatura Authenticode: ausente. O Windows pode apresentar aviso de editor desconhecido.

Para conferir o arquivo pelo PowerShell depois do download:

```powershell
Get-FileHash .\JARVIS-Desktop-Setup-x64.exe -Algorithm SHA256
```

Compare o campo `Hash` com o valor acima ou com o arquivo de checksum ligado na Central. Se não forem iguais, não execute o arquivo. O checksum confirma integridade em relação ao arquivo publicado, mas não substitui uma assinatura de editor.

O companion exige login JARVIS e internet. Ações locais têm allowlist e confirmação; veja `DESKTOP_COMPANION_GUIDE.md`.

## Android

Não há APK/AAB nativo publicado nesta release. Use o PWA em `https://jarvis.juninnzxtec.com.br/install`; o QR da Central aponta para essa página. No Android, abra no Chrome e escolha instalar/adicionar à tela inicial. O PWA requer interação visível para iniciar o microfone.

## Estado de publicação

A Central é um catálogo dos artefatos verificados, não um painel administrativo de publicação. Ainda não há API de releases para publicar beta/estável, histórico de rollout, atualização automática do companion ou retenção de versões. Também não há módulo SMTP no backend, e a integração WhatsApp aparece como não configurada no health da instalação; portanto esta release não é enviada automaticamente por e-mail ou WhatsApp.

# Preparação de lojas — 2026-10-14

Há artefatos locais JARVIS 2.0.0 em `desktop/release/` e `android/release/`. Eles não estão publicados na Central online.

- Android Play: use o AAB, não o APK de teste. Antes da experiência TWA em produção, publique `frontend/public/.well-known/assetlinks.json` na origem JARVIS e acrescente o SHA-256 do certificado App Signing exibido pela Play Console.
- Microsoft Store: o NSIS EXE foi construído, mas está sem assinatura Authenticode. A rota EXE/MSI do Store pede assinatura confiável e hospedagem de instalador offline em URL HTTPS estável. A rota MSIX depende da identidade exata reservada no Partner Center.
- Não envie os arquivos de chave em `.private-release/` ao GitHub ou ao site de downloads.
