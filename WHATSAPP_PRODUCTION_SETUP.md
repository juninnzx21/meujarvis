# WhatsApp / Evolution API em producao

Data: 2026-05-16

Status: preparado para configuracao real e validacao segura.

## API oficial

Frontend: `https://jarvis.juninnzxtec.com.br`

API oficial: `https://apijarvis.juninnzxtec.com.br/api`

Webhook Evolution API:

`https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`

Observacao: o dominio principal `jarvis.juninnzxtec.com.br/api/*` pode retornar HTML do frontend. Use `apijarvis` como API publica ate uma mudanca operacional explicita de Caddy/DNS.

## Regras de seguranca

- O JARVIS so deve responder ou executar tarefas no WhatsApp quando a mensagem tiver a frase `ei jarvis`.
- Mensagens sem `ei jarvis` devem ser registradas/ignoradas, sem acao automatica.
- Mensagens de grupo devem ser ignoradas por padrao.
- Mensagens marcadas como `fromMe` devem ser ignoradas para evitar loop.
- `WHATSAPP_AUTO_REPLY` deve continuar `false` por padrao.
- A Evolution API key fica criptografada em `Setting`; o frontend nunca deve exibir o valor real.
- Extratos OFX/CSV enviados pelo WhatsApp devem virar `StatementImport` e linhas de revisao. Nunca importar direto.

## Como configurar no painel

1. Acesse `https://jarvis.juninnzxtec.com.br`.
2. Entre no painel.
3. Abra `WhatsApp`.
4. Informe URL da Evolution API, API key e nome da instancia.
5. Clique em testar conexao.
6. Configure no manager da Evolution o webhook `https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`.

Campos no painel JARVIS:

- URL da Evolution API: exemplo `https://evolution.seudominio.com.br`.
- Instancia: nome exato criado no manager da Evolution.
- API Key: chave global/instancia da Evolution API. O valor e criptografado no backend e nunca volta para o frontend.
- Resposta automatica: deixe `false` ate concluir os testes. Quando ativar, o JARVIS ainda exige `ei jarvis`.

## Como configurar na Evolution API

No manager da Evolution:

1. Abra a instancia conectada ao numero do bot.
2. Va em Webhook/Eventos.
3. Cole a URL oficial:

   `https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`

4. Ative eventos de mensagens recebidas. Conforme a interface da Evolution, procure nomes equivalentes a:
   - `messages.upsert`
   - `MESSAGES_UPSERT`
   - mensagens recebidas
   - documentos/anexos recebidos
   - audios recebidos, se for testar audio
5. Salve e envie uma mensagem de teste.

Nao use `https://jarvis.juninnzxtec.com.br/api/...` no webhook. A API oficial em producao e `apijarvis`.

## Validacao esperada dos endpoints

- `GET /api/whatsapp/status`: retorna `configured` quando URL, instancia e API key estao configuradas; retorna `not_configured` sem quebrar quando faltam credenciais.
- `GET /api/whatsapp/config`: retorna status, mascara e flags; nunca retorna a API key real.
- `PUT /api/whatsapp/config`: salva URL, instancia, auto reply e API key criptografada.
- `POST /api/whatsapp/test-connection`: testa a Evolution sem expor credenciais.
- `POST /api/whatsapp/webhook`: recebe eventos da Evolution. So processa comandos com `ei jarvis`.

## Testes seguros

Texto:

`ei jarvis status do sistema`

Financeiro:

`ei jarvis entrada pix recebido R$ 120,00 cliente Joao`

Arquivo:

`ei jarvis importar esse extrato do Inter`

Envie OFX ou CSV como anexo com essa legenda. O resultado esperado e uma previa para revisao no painel, nao importacao direta.

## Como enviar OFX/CSV pelo WhatsApp

1. Exporte o extrato do banco, preferencialmente em OFX. CSV tambem e aceito.
2. Envie o arquivo como documento/anexo para o numero conectado na Evolution.
3. Use legenda ou mensagem junto do anexo:

   `ei jarvis importar esse extrato do Inter`

4. O JARVIS deve responder que recebeu o extrato e preparou uma previa.
5. Abra o painel em `/finance/import/:id/review`.
6. Revise linhas, categorias, duplicatas e pendencias.
7. Importe somente as linhas aprovadas.

PDF e aceito apenas como conferencia/fallback. Para importacao em massa, use OFX ou CSV.

## Regras de execucao pelo WhatsApp

- Sem `ei jarvis`: o webhook registra/ignora e nao executa comando.
- Com `ei jarvis`: o webhook pode processar texto, audio transcrito ou anexo permitido.
- `fromMe`: ignorado para evitar loop.
- Grupos: ignorados por padrao.
- Auto reply: `false` por padrao. Habilite somente depois do teste de conexao.
- OFX/CSV: criam `StatementImport` e `StatementImportRow`, nunca `FinancialTransaction` direto.
- Importacao real: sempre exige revisao em `/finance/import/:id/review`.

## Validar logs

No painel `Logs`, filtre por modulo `whatsapp` e `finance`. Os logs devem mostrar status, tipo de arquivo, contagem de linhas e erros amigaveis, sem API key, token, Authorization, cookies, conteudo bruto do extrato ou midia base64.

## Diagnostico

Se `GET /api/whatsapp/status` retornar `not_configured`, falta URL, API key ou instancia.

Passos para resolver `not_configured`:

1. Confira se a URL da Evolution abre no navegador.
2. Confira se a instancia existe no manager.
3. Cole a API key correta no painel JARVIS.
4. Clique em `Testar conexao`.
5. Se ainda falhar, confirme se a Evolution usa header `apikey` e se a instancia esta conectada ao WhatsApp.

Se OFX/CSV for tratado como audio, atualize a producao para o commit `b229550` ou posterior.

Se audio falhar, a midia pode nao ter vindo em base64, a URL pode estar expirada/inacessivel ou OpenAI audio pode estar indisponivel. A resposta segura deve orientar envio em texto ou reenvio do audio.
