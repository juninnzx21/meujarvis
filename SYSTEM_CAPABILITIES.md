# Capacidades Atuais do JARVIS Home AI

Data: 2026-05-16

Diretorio: `E:\jarvis-home-assistant`

Status: **APROVADO COM RESSALVAS**

Atualizacao operacional: API publica oficial `https://apijarvis.juninnzxtec.com.br/api`; frontend publico `https://jarvis.juninnzxtec.com.br`.

WhatsApp/Evolution deve usar `https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook` e a frase obrigatoria `ei jarvis`.

OFX/CSV enviados pelo WhatsApp devem criar previa em `/finance/import/:id/review`; importacao direta sem revisao permanece bloqueada.

## URLs

- Frontend producao: `https://jarvis.juninnzxtec.com.br`
- API publica operacional: `https://apijarvis.juninnzxtec.com.br/api`
- Health dedicado: `https://apijarvis.juninnzxtec.com.br/api/health`
- Health full dedicado: `https://apijarvis.juninnzxtec.com.br/api/health/full`

Observacao: `https://jarvis.juninnzxtec.com.br/api/*` retornou HTML do frontend durante a auditoria. Use `apijarvis` como API publica ate corrigir ou oficializar o roteamento.

## O que o sistema possui hoje

- Autenticacao com JWT, bcrypt e usuario admin/demo em ambiente local.
- Dashboard premium dark.
- Chat com historico, memoria, tarefas, intencoes e fallback seguro.
- Voz via navegador e estrutura de voice no backend.
- Memorias estruturadas, incluindo base pessoal importavel.
- Tarefas com prioridade, status, vencimento, lembrete e filtros.
- Automacoes seguras com logs.
- Central de comandos.
- Rotinas manuais/agendadas.
- Scheduler seguro.
- Relatorios operacionais.
- Notificacoes internas.
- Logs estruturados e redaction.
- Settings com suporte a integracoes.
- Health e status full.
- n8n preparado.
- WhatsApp/Evolution preparado.
- Home Assistant preparado.
- Modulo financeiro com contas, categorias, lancamentos, assistente guiado e importacao de extratos.
- Importacao OFX/CSV com revisao obrigatoria.
- Webhook WhatsApp com exigencia da frase `ei jarvis`.
- Scripts PowerShell de start, stop, status, backup, restore e validate.
- Docker Compose com PostgreSQL.
- Documentacao operacional e de seguranca.

## Exemplos de uso no painel

- Entrar no sistema.
- Ver status geral no Dashboard.
- Conversar no Chat.
- Criar memoria manual.
- Criar tarefa com prazo/lembrete.
- Rodar automacao segura.
- Ver logs por modulo/nivel.
- Configurar integracoes.
- Ver notificacoes.
- Rodar rotina.
- Importar extrato financeiro e revisar linhas antes de gravar.

## Exemplos de uso no chat

- `status do sistema`
- `crie uma tarefa para revisar o financeiro amanha`
- `lembre que eu prefiro validar tudo antes de publicar`
- `quais tarefas tenho hoje?`
- `o que esta atrasado?`
- `quanto entrou esse mes?`
- `qual meu saldo total?`
- `registre entrada de R$ 120,00 na conta PJ DO INTER`

## WhatsApp

Quando Evolution API estiver configurada, o webhook deve aceitar mensagens e arquivos. A partir do commit atual, o JARVIS so deve responder/executar quando a mensagem, legenda ou transcricao tiver a frase:

`ei jarvis`

Exemplos:

- `ei jarvis status do sistema`
- `ei jarvis entrada pix recebido R$ 120,00 cliente Joao`
- `ei jarvis importar esse extrato do Inter`

Sem a frase, a mensagem deve ser registrada/ignorada sem resposta automatica.

## Financeiro

O modulo financeiro permite:

- Cadastrar contas bancarias.
- Cadastrar categorias.
- Criar lancamentos manuais.
- Usar fluxo guiado pelo assistente.
- Atualizar saldo por entrada/saida.
- Importar OFX/CSV.
- Criar `StatementImport` e `StatementImportRow`.
- Revisar linhas antes de importar.
- Detectar duplicatas.
- Ver relatorios financeiros.

Melhor formato de extrato: OFX.

CSV e fallback confiavel.

PDF e apenas conferencia/fallback, nao fonte principal de importacao em massa.

## Comandos uteis

Na raiz:

```powershell
Set-Location E:\jarvis-home-assistant
.\status-jarvis.ps1
.\validate-jarvis.ps1
.\backup-jarvis.ps1
```

Backend:

```powershell
Set-Location E:\jarvis-home-assistant\backend
npm install
npm run test
npm run validate
```

Frontend:

```powershell
Set-Location E:\jarvis-home-assistant\frontend
npm install
npm run test
npm run validate
```

Subir localmente:

```powershell
Set-Location E:\jarvis-home-assistant
powershell -ExecutionPolicy Bypass -File .\start-jarvis.ps1
```

## Limitacoes atuais

- API do dominio principal `/api/*` retornou frontend; API real operacional e `apijarvis`.
- IA externa em producao retornou status `configured` para OpenAI e Gemini na validacao atual.
- n8n, WhatsApp/Evolution e Home Assistant aparecem `not_configured` em producao.
- Sem wake word de audio continuo.
- Sem app mobile nativo.
- Sem push notification real.
- Sem pgvector/memoria semantica vetorial.
- Sem E2E completo com navegador real.
- Hardening final de VPS/SSH/firewall/offsite backup ainda exige execucao operacional.

## Login demo

O login demo existe para ambiente local/desenvolvimento quando permitido por configuracao. Em producao, recomenda-se manter `ALLOW_DEMO_LOGIN=false`, criar admin real e rotacionar qualquer senha compartilhada.

