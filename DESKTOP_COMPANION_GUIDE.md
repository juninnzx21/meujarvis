# JARVIS Desktop para Windows

O companion nativo usa a interface autenticada existente do JARVIS em `https://jarvis.juninnzxtec.com.br`. O atalho global `Ctrl+Shift+J` mostra a janela e o ícone de bandeja permite abri-la ou sair. Fechar a janela a oculta na bandeja; o microfone nao inicia sozinho.

## Comandos locais desta versao

- Abrir Calculadora, Bloco de Notas e Explorador de Arquivos.
- Abrir pastas pessoais conhecidas: Documentos, Downloads, Area de Trabalho, Imagens, Musicas e Videos.
- Iniciar um aplicativo/jogo quando existe um unico atalho com nome exato no menu Iniciar. O Windows pede confirmacao antes de abrir.
- Mostrar a lista de arquivos diretamente em uma janela nativa local, sem enviar os nomes a API.
- Criar pasta ou arquivo `.txt` diretamente em uma pasta pessoal. O Windows pede confirmacao; arquivo existente nunca e sobrescrito.
- Editar `.txt` com confirmacao, previa do texto e backup `.bak` do original.
- Abrir um arquivo pessoal nao executavel no aplicativo associado, com confirmacao.
- Mover arquivo pessoal para a Lixeira, com confirmacao do Windows. Pastas, links, executaveis e scripts nao sao removidos ou executados.

O companion nao oferece terminal, PowerShell, acesso administrativo, automacao arbitraria, controle de arquivos fora das pastas pessoais permitidas ou hotword permanente. Pedidos nao reconhecidos seguem para a conversa normal do JARVIS e nao causam acao local.

## Microfone

O usuario autoriza o microfone pelo menu do JARVIS na bandeja do Windows; essa autorizacao permite apenas solicitar o audio por ate um minuto. Em seguida, a captura so inicia quando o usuario clica em **Ativar conversa por voz**. Fora da conversa iniciada manualmente, nao ha escuta.

## Desenvolvimento e empacotamento

```powershell
cd E:\jarvis-home-assistant\desktop
npm install
npm run validate
npm run dist:win
```

O instalador x64 NSIS aparece em `desktop/release/` e tambem e distribuido em `https://jarvis.juninnzxtec.com.br/downloads/JARVIS-Desktop-Setup-x64.exe`; o checksum SHA-256 fica ao lado do arquivo. A versao atual e um instalador por usuario, sem assinatura de codigo, e pode mostrar aviso SmartScreen. A janela usa HTTPS no dominio oficial, sem Node.js no renderer, com sandbox, context isolation, navegacao restrita, IPC tipado e confirmacoes nativas. O companion requer conexao com a internet para autenticar e usar a IA do JARVIS.
# Microsoft Store — estado local 2026-10-14

O instalador JARVIS 2.0.0 é gerado localmente, mas ainda não está assinado por certificado confiável e não foi enviado ao Partner Center. Para publicar como EXE/MSI, a Microsoft exige que o publicador hospede um instalador offline em URL HTTPS estável e assine o binário com certificado de autoridade confiável. A alternativa MSIX exige que o `Identity Name` e o `Publisher` venham da identidade reservada na conta Partner Center; o Store assina o pacote após a submissão. Não invente esses valores antes da reserva do app.
