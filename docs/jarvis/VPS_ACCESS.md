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
    User jarvis-codex
    IdentityFile ~/.ssh/jarvis_codex_temp
    IdentitiesOnly yes
    BatchMode yes
    ForwardAgent no
    ClearAllForwardings yes
    StrictHostKeyChecking yes
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

O alias é apenas uma proposta e não deve ser instalado até pin da host key obtido no console Contabo, geração confirmada do par dedicado e criação/validação da conta temporária `jarvis-codex`. Não habilitar fallback de senha, encaminhamento de agente ou encaminhamento de portas. Manter `StrictHostKeyChecking yes`.

## Privilégios e superfície de leitura

Não adicionar `jarvis-codex` ao grupo `docker`: acesso ao socket Docker equivale, na prática, a root e não é somente leitura. Não conceder shell root, sudo genérico, acesso a `.env`, arquivos de configuração com credenciais, dumps ou diretórios de dados.

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

## Bloqueio atual

O usuário confirmou o endpoint `[VPS_ENDPOINT_REDACTED]:22014` e autorizou acesso de diagnóstico somente leitura; o pedido atual também autoriza preparar a conta temporária e a chave dedicada após validar o host. A sessão anterior não recebeu banner/autenticação. O perfil local não tem host-key pin para esse endpoint, e a fingerprint anterior não aparece nos registros revisados. Portanto, não houve nova conexão nem mudança remota; validar as chaves pelo console Contabo antes de instalar usuário, chave pública ou alias operacional.

## Atualização — recuperação e acesso temporário, 2026-10-23

O proprietário informou que comandos PowerShell foram executados numa shell Bash da VPS como `root` e que `/etc/ssh/ssh_host_rsa_key.pub` pode ter sido sobrescrito. Ainda não há confirmação de que isso ocorreu. Tratar como incidente de integridade da host key até comparar, no console autenticado da Contabo, a chave pública com a chave privada correspondente. Procedimento somente leitura: `docs/jarvis/VPS_HOSTKEY_INCIDENT_RUNBOOK.md`. Não conectar por SSH, aceitar nova chave automaticamente, alterar chaves, reiniciar `sshd` ou mexer no firewall antes dessa verificação.

Inspeção local sem ler chaves privadas: `%USERPROFILE%\.ssh\jarvis_vps` e `.pub` existem; não há arquivo `config`; não foi encontrada entrada de `known_hosts` para o endpoint confirmado. Não há par `jarvis_codex_temp` preexistente. Foi iniciado `ssh-keygen` interativo para criar essa chave temporária, em terminal do Codex aguardando que o proprietário defina uma passphrase; até concluir, a criação não está confirmada. A chave `jarvis_vps` não foi reutilizada nem aberta.

O novo pedido autoriza preparar um usuário temporário `jarvis-codex`, chave ED25519 e validade inicial de sete dias, depois que a identidade do host for validada. Nada foi criado na VPS. O usuário não terá root, sudo genérico, grupo Docker, socket Docker, segredos ou escrita na produção. O primeiro acesso remoto só poderá ser de leitura e manterá `StrictHostKeyChecking yes`; a fingerprint numérica ainda precisa ser comparada com o valor observado no console/Contabo e fixada localmente.

Após a passphrase, exibir somente fingerprint e chave pública da chave de usuário, instalar a pública no console preservando entradas existentes e testar a sessão sem encerrar o acesso administrativo. Se houver discrepância de host key, arquivo público suspeito ou configuração inválida, parar; sem correção ou rotação automática.
