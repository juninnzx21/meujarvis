# FASE 3.0 - Deploy real e operacao em producao

Status: **preparado para execucao manual segura**.

Este guia consolida os passos para publicar a versao atual do JARVIS em producao sem expor credenciais. Nao cole valores de `.env`, tokens, senhas ou chaves em logs, prints, issues ou prompts.

## VPS

Executar na VPS, dentro do diretorio oficial:

```bash
cd /opt/jarvis-home-assistant
git pull origin main
git log --oneline -n 10
docker compose ps
docker compose up -d --build backend n8n n8n-postgres
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma generate
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 n8n
curl -fsS https://apijarvis.juninnzxtec.com.br/api/health
curl -fsS https://apijarvis.juninnzxtec.com.br/api/health/public
curl -fsS https://apijarvis.juninnzxtec.com.br/api/health/full
curl -I https://n8njarvis.juninnzxtec.com.br
```

## Caddy para n8n

Bloco esperado:

```caddy
n8njarvis.juninnzxtec.com.br {
    reverse_proxy 127.0.0.1:15678
}
```

Validar e recarregar:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
curl -I https://n8njarvis.juninnzxtec.com.br
```

## Frontend / Fabweb / DirectAdmin

Gerar build local de producao:

```powershell
Set-Location E:\jarvis-home-assistant\frontend
$env:VITE_API_URL="https://apijarvis.juninnzxtec.com.br/api"
npm run build
```

Publicar o conteudo de `frontend/dist` na hospedagem estatica. Nao publicar `.env`, `node_modules`, arquivos de backup, dumps ou credenciais.

## Checklist pos-deploy

- Frontend abre em `https://jarvis.juninnzxtec.com.br`.
- API oficial responde JSON em `https://apijarvis.juninnzxtec.com.br/api/health`.
- `health/public` nao exibe segredos.
- `health/full` nao exibe segredos.
- n8n responde em `https://n8njarvis.juninnzxtec.com.br`.
- Portas internas continuam presas em `127.0.0.1`.
- `ALLOW_DEMO_LOGIN=false` em producao.
- Segredos reais ficam apenas em `.env`, vault ou `Setting` criptografado.
- Backups ficam fora do Git.

## Ressalvas

Este arquivo nao executa deploy remoto por conta propria. A execucao depende de acesso seguro a VPS/Fabweb e das credenciais reais mantidas fora do repositorio.
