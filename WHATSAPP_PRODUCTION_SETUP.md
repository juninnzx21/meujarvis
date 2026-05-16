# WhatsApp / Evolution API em producao

Data: 2026-05-16

Status: preparado para configuracao real.

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

## Testes seguros

Texto:

`ei jarvis status do sistema`

Financeiro:

`ei jarvis entrada pix recebido R$ 120,00 cliente Joao`

Arquivo:

`ei jarvis importar esse extrato do Inter`

Envie OFX ou CSV como anexo com essa legenda. O resultado esperado e uma previa para revisao no painel, nao importacao direta.

## Diagnostico

Se `GET /api/whatsapp/status` retornar `not_configured`, falta URL, API key ou instancia.

Se OFX/CSV for tratado como audio, atualize a producao para o commit `b229550` ou posterior.

Se audio falhar, a midia pode nao ter vindo em base64, a URL pode estar expirada/inacessivel ou OpenAI audio pode estar indisponivel. A resposta segura deve orientar envio em texto ou reenvio do audio.
