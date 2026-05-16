# Base de Conhecimento Pessoal do JARVIS

## Objetivo

A base pessoal ensina o JARVIS sobre Junior Rodrigues / Juninnzx sem guardar segredos. Ela alimenta memórias estruturadas sobre identidade, carreira, projetos, stack, preferências, infraestrutura, padrões de trabalho, validações, deploys, domínios, roadmap e contexto técnico duradouro.

## Arquivos

- Dados versionados: `backend/prisma/personal-profile/profile-data.ts`
- Importador: `backend/prisma/seed-personal-profile.ts`
- Script: `npm run seed:personal`

## Categorias

A base cobre identidade, contato profissional público, formação, experiência, stack, ambiente local, preferências de resposta, prompts Codex, validação, segurança, infraestrutura, marca pessoal, JARVIS, n8n, WhatsApp/Evolution, financeiro, mobile/PWA, Meta Locadora, Controle Financeiro, Controle de Mercado, sites comerciais, deploy Laravel, deploy Node/Docker, documentação e prioridades futuras.

## Quantidade Atual

Total planejado: 47 memórias.

## Como Rodar

```powershell
Set-Location E:\jarvis-home-assistant\backend
npx prisma db seed
npm run seed:personal
```

O importador procura o usuário `admin@jarvis.local`, cria ou atualiza memórias e registra um resumo em `SystemLog`.

## Idempotência

O seed usa chave natural `userId + title + type`. Quando encontra títulos antigos equivalentes, ele atualiza para o título canônico e remove duplicatas antigas daquele mesmo item. Rodar o comando novamente não deve criar novas cópias.

## Segurança

O importador bloqueia padrões sensíveis associados a senha, password, token, api key, secret, jwt, bearer, private key, chave privada, CPF, cartão, banco completo, credencial, root password, DirectAdmin password e database password.

Exceção controlada: memórias `system` que ensinam o que não salvar podem citar esses termos sem valores reais.

Nunca salvar senhas reais, tokens reais, API keys reais, chaves SSH privadas, credenciais de VPS, DirectAdmin, banco, GitHub, OpenAI, Gemini, n8n, Evolution API, Home Assistant, dados bancários sensíveis, dumps ou backups em `Memory`. Se houver necessidade futura de guardar segredo, usar `.env`, vault ou gerenciador de senhas.

## Como Validar No Painel

1. Acesse `https://jarvis.juninnzxtec.com.br`.
2. Entre com usuário admin.
3. Abra `Memória`.
4. Pesquise por `Junior Rodrigues`, `JARVIS`, `Meta Locadora`, `Controle Financeiro`, `n8n`, `WhatsApp`, `deploy` e `validação`.

## Como Validar No Chat

Pergunte:

- `Jarvis, o que você sabe sobre mim?`
- `Jarvis, quais são meus projetos?`
- `Jarvis, qual minha stack?`
- `Jarvis, como eu gosto que você responda?`
- `Jarvis, qual meu padrão de deploy?`
- `Jarvis, o que falta no meu JARVIS?`
- `Jarvis, quais são minhas prioridades?`
- `Jarvis, como validar um projeto meu?`

O orquestrador carrega memórias relevantes por busca textual/semântica local e inclui o contexto no prompt com segurança.

## Como Atualizar

Edite `backend/prisma/personal-profile/profile-data.ts` e rode:

```powershell
Set-Location E:\jarvis-home-assistant\backend
npm run seed:personal
```

## Como Remover Ou Editar Memórias

Pelo painel, abra `Memória`, busque pelo título e edite ou exclua. Pela API, use apenas rotas autenticadas. Não remova em massa sem backup.

## Endpoint Administrativo

Nesta fase o caminho oficial segue sendo `npm run seed:personal`. O endpoint `POST /api/memories/import-personal-profile` permanece documentado como opcional para fase futura, porque os arquivos `prisma/` ficam fora do build TypeScript de produção e acoplar o backend compilado a eles aumentaria risco operacional.
