# WhatsApp / Evolution API em producao

Data: 2026-05-16

Status: preparado para configuracao real e validacao segura.

Atualizacao 2026-05-16 16:29: validacao local e producao pela API oficial foram reexecutadas. A producao segue pronta para configuracao real, mas o status pode aparecer `not_configured` ate URL, instancia e API key da Evolution serem salvas no painel.

Atualizacao 2026-05-17: o painel `/whatsapp` passou a ter fluxo guiado para conectar a Evolution API sem abrir o manager quando a versao da Evolution disponibilizar endpoints compativeis. O JARVIS salva credenciais criptografadas, cria/seleciona instancia, gera QR Code, faz polling do estado de conexao, tenta configurar webhook automaticamente e mostra `manual_action_required` quando a API da Evolution nao suportar alguma etapa.

Atualizacao 2026-05-18: o painel `/whatsapp` ganhou reset seguro de instancia Evolution para casos em que o manager mostra erro ao deletar, nao sincroniza mensagens ou trava em estado conectado. A acao exige confirmacao textual `RESETAR EVOLUTION`, tenta logout e delete por endpoints compativeis da Evolution e retorna `manual_action_required` quando a versao/API nao permitir automacao.

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

## Conectar WhatsApp pelo proprio JARVIS

Na tela `/whatsapp`:

1. Preencha URL da Evolution API, instancia e API key.
2. Clique em `Salvar configuracao`.
3. Clique em `Testar conexao`.
4. Clique em `Criar instancia`, se a instancia ainda nao existir.
5. Clique em `Gerar QR Code`.
6. Escaneie o QR Code dentro do proprio JARVIS pelo WhatsApp do celular.
7. Aguarde o polling mostrar `connected/open`.
8. Clique em `Configurar webhook automaticamente`.
9. Teste no WhatsApp: `ei jarvis status do sistema`.

O QR Code nao e persistido como dado permanente no banco. A API key nunca volta para o frontend; a tela mostra apenas mascara/status.

Se a versao da Evolution retornar 404/unsupported para criacao de instancia, QR ou webhook, o JARVIS exibe `manual_action_required` com checklist seguro. Isso nao significa falha do JARVIS; significa que aquela versao exige etapa manual no manager.

## Reset seguro quando o Manager da Evolution trava

Use este fluxo quando o botao `Delete` do manager retornar erro como `[object Object]`, a instancia nao sincronizar mensagens ou o WhatsApp ficar preso em uma sessao antiga:

1. Abra `/whatsapp` no JARVIS.
2. Confirme que URL da Evolution API, instancia e API key estao salvas no painel.
3. Na secao `Reset seguro da Evolution`, digite exatamente `RESETAR EVOLUTION`.
4. Clique em `Resetar instancia`.
5. Se o retorno for `success`, crie uma nova instancia, gere o QR Code e escaneie novamente.
6. Configure o webhook oficial ou siga o checklist manual mostrado pelo painel.
7. Teste de outro numero ou conversa: `ei jarvis status do sistema`.

O reset tenta primeiro desconectar a sessao e depois remover a instancia por endpoints conhecidos da Evolution. Se a versao da API bloquear a remocao, o JARVIS nao forca nada: ele exibe `manual_action_required` e registra o erro redigido nos logs. Nenhuma API key real e retornada para o frontend.

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
- `POST /api/whatsapp/configure-webhook`: tenta configurar o webhook na Evolution; se a API nao suportar, retorna `manual_action_required` com instrucao.
- `GET /api/whatsapp/evolution/status`: status seguro da Evolution, sem segredo.
- `GET /api/whatsapp/evolution/instances`: tenta listar instancias.
- `POST /api/whatsapp/evolution/instances`: tenta criar/selecionar instancia.
- `POST /api/whatsapp/evolution/connect`: solicita QR Code ou pairing code.
- `GET /api/whatsapp/evolution/connection-state`: normaliza `open/close/connecting`.
- `POST /api/whatsapp/evolution/configure-webhook`: tenta configurar o webhook oficial com eventos de mensagens/anexos/audio.
- `POST /api/whatsapp/evolution/reset`: exige `confirmation: "RESETAR EVOLUTION"`, tenta logout/delete da instancia e retorna sucesso ou `manual_action_required`.
- `DELETE /api/whatsapp/evolution/instances`: exige `confirmation: "RESETAR EVOLUTION"` e tenta remover a instancia sem expor segredos.

Tambem e possivel configurar pela Central:

- `/integrations`
- `/settings/integrations`
- `/integrations/setup-wizard`

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

## Fase 14 - JARVIS Super Intelligence Core

O JARVIS agora possui um Brain interno em `/api/brain/*` e painel em `/brain`, com agentes especialistas, roteador de intencoes, ferramentas internas seguras, contexto por memorias/documentos/financeiro/status, feedback/aprendizado e verificador de resposta. O Brain nao treina modelo do zero; ele orquestra OpenAI/Gemini/fallback local com limites de seguranca.

Rotas principais: `/brain`, `/brain/agents`, `/brain/tools`, `/brain/memory`, `/brain/feedback`. Chat e voz usam o Brain mantendo compatibilidade. WhatsApp continua exigindo `ei jarvis` e OFX/CSV continuam exigindo revisao.

## Fase 3.0 - operacao real pelo painel

Status: **preparado / depende de credenciais reais**.

Fluxo esperado em `/whatsapp` e `/integrations/setup-wizard`:

1. Configurar Evolution API URL.
2. Configurar instancia.
3. Salvar API key criptografada.
4. Testar conexao.
5. Criar/listar instancia se a API permitir.
6. Gerar QR Code ou pairing code dentro do JARVIS.
7. Fazer polling de `connectionState`.
8. Confirmar estado `connected/open`.
9. Configurar webhook oficial automaticamente quando a versao da Evolution permitir.
10. Se a API nao permitir, exibir `manual_action_required` com checklist manual.

Webhook oficial: `https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`.

Testes reais apos pareamento:

- `ei jarvis status do sistema`
- `ei jarvis quais tarefas tenho hoje?`
- `ei jarvis quanto entrou esse mes?`
- `ei jarvis importar esse extrato do Inter`

Sem `ei jarvis`, o JARVIS nao deve executar comando.
