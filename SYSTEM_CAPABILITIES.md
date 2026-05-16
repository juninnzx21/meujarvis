# Capacidades Atuais do JARVIS Home AI

Data: 2026-05-16  
Diretorio: `E:\jarvis-home-assistant`

## URLs

- Frontend producao: `https://jarvis.juninnzxtec.com.br`
- API dedicada: `https://apijarvis.juninnzxtec.com.br/api`
- API pelo dominio principal: atualmente nao roteada; `https://jarvis.juninnzxtec.com.br/api` retorna o frontend.
- Local frontend, quando iniciado: `http://localhost:5173`
- Local backend, quando iniciado: `http://localhost:3001/api`

## Login demo

- Email: `admin@jarvis.local`
- Senha: `12345678`

Para producao real, trocar/desativar credenciais demo.

## O que o sistema faz hoje

- Login JWT com senha hash bcrypt.
- Dashboard com status do sistema.
- Chat com historico persistido.
- IA com OpenAI, fallback Gemini e fallback local seguro.
- Memorias CRUD e criacao por frase como "lembre que".
- Tarefas CRUD, status, prioridade, prazos, lembretes e vencidas.
- Automacoes manuais com logs e bloqueio de acoes perigosas.
- Central de comandos.
- Rotinas manuais e agendadas.
- Scheduler interno para rotinas, lembretes e notificacoes.
- Relatorios: resumo diario, tarefas, sistema e atividade.
- Notificacoes internas.
- Logs estruturados com filtros.
- Configuracoes por usuario.
- Voz basica no navegador via Web Speech API quando disponivel.
- WhatsApp/Evolution configuravel pelo painel.
- Webhook WhatsApp para texto/audio quando a Evolution entrega midia.
- Controle financeiro por painel e comandos de WhatsApp.
- n8n configuravel pelo painel com teste de webhook.
- Home Assistant preparado com status, entidades e acoes seguras.
- Scripts PowerShell para start, stop, status, backup, restore e validacao.
- Backup PostgreSQL via `backup-jarvis.ps1`.

## Exemplos de uso

Chat:

- "Qual o status do sistema?"
- "Lembre que eu gosto de automacoes com n8n."
- "Crie uma tarefa para testar o sistema amanha as 9h."
- "Liste minhas tarefas."
- "Testar n8n."

WhatsApp financeiro:

- "entrada pix recebido R$ 120,00 cliente Joao"
- "saida pix enviado R$ 80,00 fornecedor X"
- "atualizar saldo"
- "resumo financeiro do mes"

Tarefas:

- Criar, editar, concluir e cancelar tarefas.
- Ver tarefas vencidas e tarefas de hoje.

n8n:

- Acessar `/n8n`.
- Colar a Production URL do webhook.
- Salvar configuracao.
- Testar webhook seguro.

WhatsApp:

- Acessar `/whatsapp`.
- Configurar URL da Evolution, instancia, API key e auto reply.
- Copiar webhook do JARVIS para Evolution.
- Testar conexao e envio individual com confirmacao.

Financeiro:

- Acessar `/finance`.
- Vincular conta do controle financeiro.
- Testar conexao.
- Parsear texto financeiro.
- Consultar resumo mensal.

Home Assistant:

- Acessar `/smart-home`.
- Ver status.
- Listar entidades quando configurado.
- Executar acoes seguras de luz/switch.

## Limitacoes atuais

- Wake word "Ei Jarvis" ainda nao existe.
- Sem escuta continua, por seguranca.
- Voz depende do navegador.
- Sem app mobile nativo.
- Sem push notification real fora do painel.
- Sem pgvector/memoria semantica real.
- Streaming do chat ainda e fallback SSE simples, nao token a token real.
- Health global nao reflete totalmente configuracoes por usuario.
- Integracoes reais dependem de credenciais externas.
- Controle financeiro depende de conta existente no sistema externo para vinculo perfeito.
- API no dominio principal `/api` nao esta roteada para backend.

## Comandos uteis

Raiz:

```powershell
.\start-jarvis.ps1
.\status-jarvis.ps1
.\validate-jarvis.ps1
.\backup-jarvis.ps1
```

Backend:

```powershell
cd E:\jarvis-home-assistant\backend
npm run validate
```

Frontend:

```powershell
cd E:\jarvis-home-assistant\frontend
npm run validate
```

Docker:

```powershell
cd E:\jarvis-home-assistant
docker compose ps
docker compose up -d
```
# Atualizacao hardening Fase 7

- API publica oficial: `https://apijarvis.juninnzxtec.com.br/api`.
- Frontend publico: `https://jarvis.juninnzxtec.com.br`.
- Health publico minimo: `/api/health/public`.
- Tokens de integracoes salvos por usuario em `Setting` sao criptografados no backend.
- Login demo pode ser bloqueado em producao por `ALLOW_DEMO_LOGIN=false`.
- Admin real pode ser criado por `npm run create:admin`.
## Capacidades reais auditadas - 2026-05-16

### O sistema possui hoje

- Autenticação JWT com bcrypt, usuário admin/local e bloqueio configurável do login demo em produção.
- Dashboard, status operacional, health simples/full/public.
- Chat com histórico, memória, detecção simples de intenções, fallback OpenAI/Gemini/local.
- Voz via navegador com Web Speech API/SpeechSynthesis quando disponível.
- Memórias estruturadas, base pessoal, busca textual e criação via chat.
- Tarefas, lembretes, status, prioridade, vencidas e scheduler.
- Automações seguras com allowlist, logs e bloqueio de ações perigosas.
- Comandos, rotinas manuais/agendadas, relatórios e notificações.
- Logs estruturados com redaction.
- Configurações com criptografia de tokens sensíveis em `Setting`.
- Integrações preparadas: n8n, WhatsApp/Evolution API, Home Assistant.
- Módulo financeiro com contas, categorias, lançamentos, importação/revisão de extrato, relatórios e assistente guiado.
- Scripts PowerShell: start, stop, status, validate, backup, restore e backup offsite planejado.
- Documentação operacional, segurança, deploy, monitoramento e roadmap.

### O que dá para fazer hoje

- Entrar no painel, navegar pelas telas e usar os módulos principais.
- Conversar com o JARVIS e criar tarefas/memórias via chat.
- Gerenciar tarefas, lembretes, notificações, rotinas, automações e logs.
- Configurar integrações pelo painel quando houver credenciais.
- Preparar WhatsApp/Evolution e n8n com testes seguros.
- Consultar status da aplicação e da API dedicada.
- Criar contas financeiras, lançar entradas/saídas, importar CSV simulado/revisar/importar e consultar relatórios.
- Fazer backup local do PostgreSQL via script.

### Limitações atuais

- A API oficial pública é `https://apijarvis.juninnzxtec.com.br/api`; `https://jarvis.juninnzxtec.com.br/api/*` ainda retorna frontend.
- Sem credenciais reais, n8n, WhatsApp/Evolution e Home Assistant ficam em `not_configured`.
- Não há wake word real nem escuta contínua.
- Não há push notification externo.
- Não há app mobile nativo.
- Memória semântica/pgvector ainda é planejada.
- Testes E2E com navegador real ainda são plano, não suíte ativa.
- Hardening SSH/firewall e backup offsite real dependem de ação manual na VPS.

### URLs úteis

- Frontend produção: `https://jarvis.juninnzxtec.com.br`
- API dedicada produção: `https://apijarvis.juninnzxtec.com.br/api`
- Health API dedicada: `https://apijarvis.juninnzxtec.com.br/api/health`
- Health full API dedicada: `https://apijarvis.juninnzxtec.com.br/api/health/full`
- Local frontend, quando iniciado: `http://localhost:5173`
- Local backend, quando iniciado: `http://localhost:3001/api`

### Login demo

O login demo existe para desenvolvimento/local, mas deve ficar bloqueado em produção com `ALLOW_DEMO_LOGIN=false`. Para produção real, usar `npm run create:admin` e criar um admin próprio.
