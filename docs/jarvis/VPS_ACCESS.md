# Acesso seguro de agentes à VPS

## Estado da preparação — 2026-10-19

Preparação local apenas. Nenhuma conexão SSH foi aberta e nenhum arquivo ou serviço da VPS foi alterado.

- A chave dedicada `jarvis_vps` e sua chave pública correspondente existem em `%USERPROFILE%\.ssh\`. Foram verificados apenas existência, tamanho e ACL; o conteúdo privado não foi lido, copiado ou registrado.
- A ACL da chave privada concede acesso ao usuário atual, SYSTEM e Administradores. `ssh.exe` está disponível em `C:\Windows\System32\OpenSSH\ssh.exe`.
- Não existe `%USERPROFILE%\.ssh\config` no momento.
- Endpoint confirmado pelo usuário: `[VPS_ENDPOINT_REDACTED]:22014`. A conta operacional não-root e o fingerprint SHA256 da host key obtido por canal confiável ainda não foram informados; o SSH permanece bloqueado.
- O usuário autorizou uma conexão SSH exclusivamente para diagnóstico de leitura. A autorização não inclui criar contas, instalar chaves na VPS, conceder sudo, criar wrapper ou alterar produção.
- O Agent Sync e o scheduler permanecem pausados.

## Configuração local proposta

Depois de confirmar o destino e criar a conta de menor privilégio na VPS, adicionar este bloco ao `%USERPROFILE%\.ssh\config`:

```sshconfig
Host jarvis-vps
    HostName [VPS_ENDPOINT_REDACTED]
    Port 22014
    User jarvis-ops
    IdentityFile ~/.ssh/jarvis_vps
    IdentitiesOnly yes
    BatchMode yes
    ForwardAgent no
    ClearAllForwardings yes
    StrictHostKeyChecking yes
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

O alias não fica operacional até preencher o destino confirmado e instalar a chave pública correspondente em `authorized_keys` da conta `jarvis-ops`. Não habilitar fallback de senha, encaminhamento de agente ou encaminhamento de portas. Manter host key verification; validar o fingerprint do host por canal confiável durante a primeira autorização.

## Privilégios e superfície de leitura

Não adicionar `jarvis-ops` ao grupo `docker`: acesso ao socket Docker equivale, na prática, a root e não é somente leitura. Não conceder shell root, sudo genérico, acesso a `.env`, arquivos de configuração com credenciais, dumps ou diretórios de dados.

Para consultar logs, estado de serviços, containers e recursos, preferir um comando de diagnóstico root-owned, sem argumentos arbitrários, que exponha somente operações fixas e redija segredos. O SSH desse usuário deve restringir encaminhamentos e TTY; o sudoers, se necessário, deve permitir exclusivamente esse wrapper revisado. O wrapper deve omitir variáveis de ambiente, argumentos sensíveis, conteúdo de configurações e payloads de log que possam conter credenciais. Até esse wrapper existir e ser revisado, conceder apenas os comandos de leitura disponíveis sem privilégios, sem ampliar permissões para “fazer funcionar”.

Qualquer ação de escrita em produção — inclusive restart/stop de container, alteração de serviço, firewall, SSH, SSL, dados ou permissões — requer autorização explícita específica, plano de impacto e rollback. Esta preparação não autoriza essas ações.

## Procedimento para autorizar

1. Confirmar que a conta operacional não-root já existe e informar seu nome. Se ainda não existir, criação da conta e instalação da chave pública exigem autorização específica separada; não enviar a chave privada.
2. Informar o fingerprint SHA256 da host key obtido no console/painel confiável da Contabo. Não aceitar uma chave observada pela primeira vez na rede sem verificação independente.
3. Aprovar separadamente a instalação de um wrapper de diagnóstico e a regra sudoers estritamente limitada, caso as leituras necessárias dependam de root. Não conceder o grupo `docker`.
4. Após confirmação do destino, conta, host key e privilégio aprovado, criar o alias acima e testar somente conexão não interativa e os comandos de leitura autorizados.
5. Aplicar o mesmo alias aos processos Codex e OpenCode por configuração SSH do usuário; não copiar chaves entre perfis, hosts ou repositórios.
6. Manter Codex e OpenCode em branches e worktrees físicas distintas. Nunca abrir a mesma pasta de trabalho nos dois agentes. Um único responsável integra alterações revisadas entre worktrees.
7. Manter Agent Sync e execução recorrente desativados até autorização própria; o acesso SSH não concede autorização de execução automática.

## Separação Codex/OpenCode

Cada agente terá checkout/worktree distinto e branch própria. A branch não substitui isolamento de diretório: duas aplicações nunca podem editar a mesma worktree. Alterações devem ser revisadas e integradas por uma única worktree de integração, com validação antes de qualquer publicação. Nenhum agente publica, faz merge ou implanta sem autorização separada.

## Estado da tentativa — 2026-10-23

O usuário confirmou endpoint/porta, conta `ubuntu`, fingerprint ED25519 via Contabo e autorizou somente leitura. A fingerprint foi comparada à entrada local de host conhecida sem ler chave privada. A tentativa SSH com `StrictHostKeyChecking=yes` conectou no TCP, mas não recebeu banner e expirou; a tentativa seguinte foi resetada antes da autenticação. Isso não indica se usuário/chave são válidos, pois a autenticação não começou. Nenhum comando remoto foi executado. O próximo passo é executar o diagnóstico read-only pelo console Contabo; não reiniciar SSH nem alterar firewall/Fail2ban sem causa comprovada e autorização específica.
