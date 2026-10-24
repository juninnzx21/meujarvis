# JARVIS QA — qa.jarvis.juninnzxtec.com.br

**Estado: preparação em branch, NÃO PUBLICADO.** Este plano não altera DNS, Contabo, certificados TLS, SSH nem produção.

## Objetivo e isolamento
- `https://jarvis.juninnzxtec.com.br`: produção existente, deve permanecer intacta.
- `https://qa.jarvis.juninnzxtec.com.br`: subdomínio reservado para **staging isolado** e **revisão de releases**; NÃO redirecionar à mesma API ou banco da produção.
- Reaproveitar `docker-compose.staging.yml`, projeto `jarvis3staging`, banco isolado, rede interna e gateway no loopback `127.0.0.1:18080`.
- A rota frontend `/qa/releases` nesta branch é **UI de preparação, somente leitura**, disponível a administradores autenticados no host QA. Botões de aprovação/rejeição ainda bloqueados por segurança.

## Requisitos externos (ainda não executados)
1. Resolver acesso administrativo à VPS; a porta SSH 22014 foi relatada como timeout/reset antes do banner. Validar pelo console da Contabo, sem reiniciar serviços sem diagnóstico.
2. Descobrir o provedor DNS *autoritativo* para `juninnzxtec.com.br`. Criar registro `A` para host `qa.jarvis` apontando ao IP público correto do proxy da VPS (ou `CNAME` apropriado se a topologia confirmada usar outro host). **Não presumir que frontend de produção e backend estão no mesmo lugar.**
3. Configurar certificado HTTPS válido para o FQDN QA no proxy reverso efetivo (DirectAdmin, Nginx, Caddy ou outro identificado no inventário). O `deploy/qa/qa-vhost.nginx.conf.example` é exemplo comentado: não instalar sem verificar conflitos e acesso.
4. Aplicar controle de acesso na borda para administradores permitidos, além do login/MFA na aplicação; bloquear indexação e monitorar acessos. Usar cabeçalhos HSTS/CSP coerentes com a topologia real.
5. Verificar RAM/disco/CPU; não iniciar imagens ou rodar migrations antes de backup, revisão de recursos e identidade comprovada do banco de staging. Não copiar o banco, sessões nem chaves de produção.
6. Aprovar e executar staging após CI e gates; executar teste `/api/health/public` pelo hostname QA e testes autenticados com usuário admin QA sintético.
7. Somente quando os itens anteriores estiverem comprovados marcar `QA_ONLINE` e entregar ao proprietário o URL real funcionando.

## Aprovação versus publicação
O objetivo futuro é visualizar candidato, CI, SHA/digest, diff e evidências de staging; **aprovar** deve consumir uma autorização curta, vinculada ao SHA+digest, com admin/MFA step-up e auditoria; **rejeitar** deve manter a produção inalterada. A UI scaffold não publica e não persiste decisões. Implementar o contrato descrito em `docs/jarvis/RELEASE_APPROVAL_DESIGN.md`, revisar segurança e testar E2E (inclusive autorização indevida, race, replay, expirado, rejeição e rollback).

Nenhum evento de aprovação pode mandar comandos shell/Docker direto do navegador. O deploy real deve ser executado por workflow de produção protegido, com imagens verificadas, backup/restauração, smoke e rollback. A publicação na main é um gate separado.

## Checklist de aceitação
- DNS QA aponta para a borda correta, sem alterar registros atuais.
- TLS válido para QA.
- Host QA não compartilha banco/segredos/integrações externas da produção.
- QA protegido na borda e app; admin + MFA.
- SHA da staging provado, health e E2E aprovados.
- Aprovação/rejeição transacionais e trilha auditável (somente após implementação).
- Pipeline protegido revisa CI, SHA+digest, backups e executa rollback ensaiado.
- A rejeição e a ausência de resposta **nunca** geram deploy.

Até lá, não apresentar os botões como operacionais nem afirmar que o domínio está ativo.
