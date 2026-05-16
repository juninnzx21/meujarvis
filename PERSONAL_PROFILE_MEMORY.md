# Base de Conhecimento Pessoal do JARVIS

## Objetivo

A Base de Conhecimento Pessoal permite que o JARVIS conheca melhor Junior Rodrigues / Juninnzx sem guardar segredos. Ela alimenta memorias estruturadas sobre identidade, carreira, projetos, stack, infraestrutura, preferencias de trabalho, padroes de deploy, seguranca e roadmap.

## Arquivos

- Dados versionados: `backend/prisma/personal-profile/profile-data.ts`
- Importador: `backend/prisma/seed-personal-profile.ts`
- Script: `npm run seed:personal`

## Categorias

A base cobre identidade, contato profissional publico, formacao, experiencia, stack, ambiente, preferencias, prompts Codex, seguranca, infraestrutura, dominios, JARVIS, Meta Locadora, Controle Financeiro, Controle de Mercado, outros projetos, deploy, rotinas, roadmap, pendencias, linguagem, relacao com IA e dados que nao devem ser salvos.

## Quantidade atual

Total planejado: 47 memorias.

## Como rodar

```powershell
Set-Location E:\jarvis-home-assistant\backend
npx prisma db seed
npm run seed:personal
```

O importador procura o usuario `admin@jarvis.local`, cria ou atualiza memorias e registra um resumo em `SystemLog`.

## Idempotencia

O seed usa chave natural `userId + title + type`. Se a memoria nao existe, cria. Se existe e mudou, atualiza. Se esta igual, nao duplica.

## Seguranca

O importador bloqueia padroes sensiveis como `senha:`, `password:`, `token:`, `api key:`, `secret:`, `jwt:`, `private key`, `bearer`, `cpf:`, `cartao:`, `banco:`, `acesso root:`, `directadmin password` e `database password`.

Excecao controlada: memorias `system` que ensinam o que nao salvar podem citar esses termos sem valores reais.

Nunca salvar senhas reais, tokens reais, API keys reais, chave privada SSH, credenciais, dados bancarios, dumps ou backups em `Memory`. Se houver necessidade futura de guardar segredo, usar vault/gerenciador de senhas.

## Como validar no painel

1. Acesse `https://jarvis.juninnzxtec.com.br`.
2. Entre com usuario admin.
3. Abra `Memorias`.
4. Pesquise por `Junior Rodrigues`, `JARVIS`, `Meta Locadora`, `validacao` e `infraestrutura`.

## Como validar por API local

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/auth/login -ContentType 'application/json' -Body '{"email":"admin@jarvis.local","password":"12345678"}'
$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Uri "http://localhost:3001/api/memories?q=JARVIS" -Headers $headers
```

## Como o JARVIS usa essas memorias

O orquestrador de IA carrega memorias relevantes por busca textual e inclui o contexto no prompt. Isso melhora respostas sobre projetos, padroes de deploy, stack, preferencias, validacoes e proximos passos.

## Como atualizar

Edite `backend/prisma/personal-profile/profile-data.ts` e rode:

```powershell
Set-Location E:\jarvis-home-assistant\backend
npm run seed:personal
```

## Como remover ou editar memorias

Pelo painel, abra `Memorias`, busque pelo titulo e edite ou exclua. Por banco/API, use apenas rotas autenticadas e nunca remova em massa sem backup.

## Decisao sobre endpoint administrativo

Nesta fase foi implementado apenas `npm run seed:personal`. O endpoint `POST /api/memories/import-personal-profile` foi adiado para evitar acoplar o backend compilado a arquivos dentro de `prisma/`, que hoje ficam fora do build TypeScript.
