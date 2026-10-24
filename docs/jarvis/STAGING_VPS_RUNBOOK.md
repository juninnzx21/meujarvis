# JARVIS 3.0 — staging isolado na VPS Ubuntu

## Status
**CONFIGURAÇÃO PREPARADA, NÃO IMPLANTADA.** Os commits no PR #2 não autorizam acesso SSH, deploy, migrations ou publicação. Nenhuma VPS foi acessada na criação destes arquivos.

## Por que não reutilizar o docker-compose.yml de produção?
O Compose existente inclui nomes globais de containers, senhas de desenvolvimento e rede Home Assistant externa. Executá-lo uma segunda vez pode colidir com serviços e volumes reais. Este arquivo `docker-compose.staging.yml` usa projeto dedicado `jarvis3staging`, serviços sem `container_name`, volume próprio e porta do gateway presa a `127.0.0.1:18080` por padrão. Não inicia n8n, Home Assistant, Piper, WhatsApp ou scheduler.

## Segurança prévia — obrigatório
1. Inventário **somente leitura** da VPS em conta SSH não-root; confirmar host key SHA256 por canal confiável e o espaço/CPU/memória de sobra. Não transmitir senha, token ou chave privada ao chat; usar secret manager do runner aprovado.
2. Confirmar se a VPS executa a API e onde está a publicação de frontend (há indicação histórica de Fabweb/DirectAdmin). A staging proposta é **privada** por padrão, acessível via túnel SSH autorizado (sem domínio público).
3. Garantir que o usuário de implantação tenha acesso apenas ao diretório/staging e a comandos previamente aprovados. Não dar root, sudo genérico ou acesso ao Docker socket para agentes de IA. Para operação Docker, usar executor/runner controlado pelo administrador, nunca ferramenta irrestrita do LLM.
4. Configurar GitHub Environment `staging` com aprovadores, proteções e segredos específicos. **Nenhuma credencial de produção** deve ser copiada. Bloquear serviços de envio, automações ou IA paga.
5. Verificar antes do deploy uso de CPU/RAM/disco, disponibilidade de imagens, ocupação de porta 18080, backups e restauração.
6. Gerar quatro segredos distintos, somente no ambiente de staging: `STAGING_POSTGRES_PASSWORD`, `STAGING_DATABASE_URL` (URL do serviço `postgres`, com senha corretamente percent-encoded), `STAGING_JWT_SECRET`, `STAGING_SETTINGS_ENCRYPTION_KEY`, `STAGING_TOTP_ENCRYPTION_KEY`. Usar valores fortes (>=32 caracteres para chaves). Não versionar `.env` e não registrar valores em logs.
7. NÃO inserir segredos reais nos comandos de GitHub Actions abaixo. O workflow `staging-preflight.yml` usa dados fictícios de CI apenas para validar o YAML/Compose.

## Revisão da configuração, sem container nem VPS
```sh
docker compose --project-name jarvis3staging -f docker-compose.staging.yml config --quiet
```

Sem variáveis definidas, este comando deve falhar fechado. Para a CI, o workflow fornece exclusivamente valores sintéticos.

## Plano de execução **após** liberação operacional
1. Criar worktree/diretório isolado para o SHA exato aprovado; executar o preflight e validar que não há `container_name` nem rede externa.
2. Criar e testar backup e restauração do banco **de staging**. Não tocar no banco existente de produção.
3. Fazer build usando apenas os contextos `backend` e `frontend` aprovados, executado por runner confiável. Configurar segredos exclusivos de staging sem exibi-los.
4. Iniciar apenas `postgres`; confirmar health.
5. Executar `prisma migrate deploy` **somente** no banco de staging e somente após validação de URL/identidade, never em banco real de produção. Não rodar seed com dados pessoais ou seed de admin demo.
6. Iniciar backend/frontend/gateway e aguardar readiness. O serviço web fica vinculado a loopback. Acesso externo apenas por túnel SSH autenticado ou proxy privado aprovado.
7. Smoke local: `curl --fail-with-body --silent --show-error http://127.0.0.1:18080/api/health/public`; acessar homepage pelo túnel e executar testes E2E com usuário sintético criado por processo de QA autorizado.
8. Verificar logs sanitizados, auth, tarefas, Meu Dia, notificações, limites cross-user, tempo de resposta e uso de recursos. Registrar SHA da imagem e evidências; qualquer falha bloqueia avanço.
9. Ensaiar rollback **na staging**, incluindo restauração de backup e configuração anterior. Nunca usar `docker compose down -v`, `system prune` ou comandos de limpeza indiscriminados.
10. Somente em etapa posterior, elaborar workflow de **deploy** com autenticação SSH/runner, pinagem de host key, environment protegido e aprovação explícita. Esse workflow ainda não existe, por decisão de segurança.

## CI e limites
`.github/workflows/staging-preflight.yml` faz unicamente `docker compose config` e verificações de isolamento, sem sockets remotos, SSH, secrets verdadeiros ou migração. O GitHub Actions de CI existente continua responsável por builds/testes backend, frontend, desktop e Android.

## Checkpoint de configuração — 2026-10-22

- O Compose de staging agora declara health checks para PostgreSQL, backend (`/api/health` com readiness e banco), frontend e gateway; define limites máximos de 384 MiB/0,50 CPU para PostgreSQL, 512 MiB/0,60 CPU para backend, 192 MiB/0,25 CPU para frontend e 128 MiB/0,15 CPU para gateway. PostgreSQL/backend/frontend ficam numa rede `internal: true`; somente gateway também participa de uma bridge separada para publicar `127.0.0.1:18080`. O volume não é externo e fica no namespace `jarvis3staging`.
- Preflight local em Docker Compose 5.6.0 passou com valores sintéticos: quatro serviços esperados, limites, health checks, integração externa/scheduler desativados, rede interna, volume e bind loopback. Sem variáveis, `docker compose config` falhou fechado. Nenhum container foi iniciado.
- O daemon Docker Linux deste PC está indisponível (`dockerDesktopLinuxEngine` ausente). Portanto imagem/build, health runtime, DB, migration, autenticação, E2E, backup/restore e rollback não foram testados.
- A configuração SSH local não existe. Há entradas de host conhecidas, mas sua origem de confiança não foi confirmada por canal administrativo independente. Nenhuma conexão SSH foi tentada; endpoint/usuário fornecidos no texto não comprovam a identidade do host nem as permissões efetivas.
- Antes de iniciar, confirmar a fingerprint no painel Contabo, validar a conta não-root e fazer inventário remoto somente leitura. Mesmo com os limites do Compose, verificar RAM disponível e carga atual; os valores de recursos previamente relatados no texto não foram auditados ao vivo. Construir imagens na VPS pode causar pressão de recursos, então preferir runner confiável e imagens imutáveis por SHA.
- Túnel Windows, após a confirmação independente: `ssh -N -L 127.0.0.1:18080:127.0.0.1:18080 -o StrictHostKeyChecking=yes -o IdentitiesOnly=yes -p 22014 -i "$env:USERPROFILE\.ssh\jarvis_vps" ubuntu@207.180.219.253`. Só abrir `http://127.0.0.1:18080` depois de o túnel e o health check remoto responderem. Interromper o túnel com Ctrl+C.

**Gate de conclusão:** a staging só será marcada operacional quando houver: execução de CI verde por SHA, recursos livres atestados na VPS, SSH não-root e fingerprint confirmado, credenciais independentes armazenadas no ambiente protegido, aplicação implantada, smoke E2E e rollback observado. A existência deste documento/Compose não equivale a isso.
