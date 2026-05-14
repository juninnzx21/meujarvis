# Plano de banco de dados do JARVIS

## Estado atual

O JARVIS Home AI usa Prisma com PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Em producao, o banco operacional fica na VPS em container PostgreSQL.

## Banco recebido da Fabweb

Foi informado um banco da hospedagem Fabweb/DirectAdmin com host `localhost`.

Esse tipo de banco normalmente e MySQL/MariaDB da hospedagem compartilhada. Ele nao deve ser colocado diretamente no `DATABASE_URL` atual do JARVIS, porque:

- o Prisma esta configurado para PostgreSQL;
- as migrations existentes foram geradas para PostgreSQL;
- o host `localhost` so significa "a propria hospedagem Fabweb", nao a VPS;
- trocar isso em producao quebraria backend, login, chat, tarefas, memorias, logs e scheduler.

## Decisao segura

Nao aplicar o banco Fabweb diretamente no backend atual.

Manter:

- Frontend estatico na Fabweb;
- API/backend/scheduler na VPS;
- PostgreSQL na VPS.

## Se for obrigatorio usar o banco Fabweb

Abrir uma fase propria de migracao PostgreSQL -> MySQL/MariaDB:

1. Confirmar no DirectAdmin se o banco e MySQL ou MariaDB.
2. Confirmar se conexao remota a partir da VPS esta liberada.
3. Trocar Prisma provider de `postgresql` para `mysql`.
4. Revisar todos os campos `Json`, enums e migrations.
5. Gerar migrations novas para MySQL em ambiente de teste.
6. Rodar seed em banco vazio.
7. Rodar testes automatizados backend/frontend.
8. Validar login, chat, memorias, tarefas, automacoes, logs, scheduler e notificacoes.
9. Somente depois alterar `.env` remoto.

Formato esperado da URL, com placeholders:

```env
DATABASE_URL=mysql://USUARIO:SENHA@HOST:3306/BANCO
```

Nunca versionar a URL real.

## Recomendacao

Para uso real do JARVIS, PostgreSQL na VPS continua sendo a opcao recomendada porque:

- ja esta validado;
- suporta melhor Prisma/migrations atuais;
- fica perto do backend;
- evita depender de restricoes da hospedagem compartilhada;
- facilita backup/restore via Docker.

## Seguranca

Como credenciais foram compartilhadas em conversa humana, rotacione a senha do banco no DirectAdmin antes de usar em producao.
