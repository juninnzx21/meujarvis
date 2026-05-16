# Production Security Hardening

## Escopo

Ambiente revisado:

- Painel: `https://jarvis.juninnzxtec.com.br`
- API dedicada: `https://apijarvis.juninnzxtec.com.br/api`
- Frontend estatico na Fabweb/DirectAdmin.
- VPS Ubuntu 24.04 com Docker Compose e Caddy.

## Segredos e rotacao

Rotacione todos os segredos que ja tenham sido compartilhados em canais humanos. Nao registre valores em docs, tickets, commits ou logs.

Checklist:

- [ ] DirectAdmin/hospedagem: alterar senha do usuario do painel.
- [ ] FTP/hospedagem: alterar senha ou desativar se nao for usado.
- [ ] VPS/root: alterar senha imediatamente.
- [ ] Criar usuario `deploy` com chave SSH.
- [ ] Validar login SSH por chave do usuario `deploy`.
- [ ] Desabilitar login root por senha somente depois do teste por chave.
- [ ] Desabilitar `PasswordAuthentication` somente depois de confirmar acesso por chave.
- [ ] PostgreSQL: trocar usuario/senha padrao e atualizar `.env` remoto.
- [ ] `JWT_SECRET`: gerar novo valor forte e atualizar `.env` remoto.
- [ ] `SETTINGS_ENCRYPTION_KEY`: gerar valor forte dedicado e atualizar `.env` remoto.
- [ ] OpenAI: rotacionar chave no provedor e atualizar `.env`.
- [ ] Gemini: rotacionar chave no provedor e atualizar `.env`.
- [ ] n8n: rotacionar webhook/API key quando configurado.
- [ ] Evolution API: rotacionar API key quando configurado.
- [ ] Home Assistant: rotacionar long-lived token quando configurado.
- [ ] Webhooks externos: trocar URLs/tokens se foram expostos.

## SSH seguro

Comandos recomendados na VPS, depois de criar uma chave local:

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
nano /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Teste antes de bloquear senha:

```bash
ssh deploy@45.76.251.177
sudo whoami
```

Depois de validar chave e sudo:

```bash
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.jarvis
nano /etc/ssh/sshd_config
```

Definir:

```text
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
```

Validar e recarregar:

```bash
sshd -t
systemctl reload ssh
```

Mantenha uma sessao root aberta enquanto testa o novo login.

## Login demo em producao

Configurar no `.env` remoto:

```text
ALLOW_DEMO_LOGIN=false
```

Criar administrador real:

```bash
cd /opt/jarvis-home-assistant/backend
npm run create:admin
```

Nao registrar senha em arquivo, commit, print ou documentacao.

## Criptografia de Settings

Configurar no `.env` remoto:

```text
SETTINGS_ENCRYPTION_KEY=valor-forte-gerado-fora-do-repositorio
```

Tokens salvos por usuario em `Setting` passam a ser criptografados no backend com AES-256-GCM. Valores antigos em texto puro continuam legiveis e sao criptografados ao salvar novamente.

## Firewall

Estado desejado:

- Publico: `22/tcp`, `80/tcp`, `443/tcp`.
- JARVIS interno: backend, frontend e Postgres presos em `127.0.0.1`.
- Caddy e o unico ponto publico HTTP/HTTPS.

Portas extras encontradas devem ser revisadas antes de remover, pois podem pertencer a outros projetos na VPS:

- `5678`
- `8081`

Comandos de auditoria:

```bash
ufw status verbose
ss -tulpn
docker compose ps
```

## Docker

O `docker-compose.yml` usa:

- `restart: unless-stopped`
- portas presas em `127.0.0.1`
- volume persistente para Postgres

Comandos:

```bash
cd /opt/jarvis-home-assistant
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

## Caddy e HTTPS

Caddy publica a API:

- `apijarvis.juninnzxtec.com.br`

Validar:

```bash
curl -I https://jarvis.juninnzxtec.com.br
curl https://apijarvis.juninnzxtec.com.br/api/health
curl https://apijarvis.juninnzxtec.com.br/api/health/full
```

DNS esperado:

- `jarvis.juninnzxtec.com.br` -> Fabweb (`166.0.186.20`)
- `apijarvis.juninnzxtec.com.br` -> VPS (`45.76.251.177`)

Se `apijarvis` falhar logo apos alterar DNS, aguarde o TTL. O nameserver autoritativo deve apontar para a VPS antes do Let's Encrypt emitir o certificado.

## Backup

Backup manual seguro:

```bash
cd /opt/jarvis-home-assistant
mkdir -p backups
docker compose exec -T postgres pg_dump -U jarvis -d jarvis_db > backups/jarvis_db_$(date +%Y%m%d_%H%M%S).sql
chmod 600 backups/*.sql
```

Retencao recomendada:

- manter backups diarios por 7 dias;
- manter backups semanais por 4 semanas;
- copiar para armazenamento externo seguro;
- nunca commitar `backups/` ou arquivos `.sql`.

Restore exige confirmacao manual e janela de manutencao.

## Validacao de producao

Validar sem expor token:

- login admin ou usuario real;
- dashboard;
- chat;
- voz;
- tarefas;
- comandos;
- rotinas;
- scheduler;
- notificacoes;
- relatorios;
- logs;
- fallbacks n8n/WhatsApp/Home Assistant.

## Pendencias reais

- Rotacionar senhas/chaves compartilhadas.
- Criar usuario `deploy` com chave SSH.
- Desabilitar login root por senha apos validar chave.
- Revisar regras UFW extras `5678` e `8081` para confirmar se pertencem a outros servicos.
