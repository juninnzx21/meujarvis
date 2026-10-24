# VPS — verificação somente leitura das host keys

Use este procedimento no console autenticado da Contabo, diretamente na VPS esperada. A sessão anterior pode ter alterado `/etc/ssh/ssh_host_rsa_key.pub`; o incidente ainda não foi confirmado. Não conecte por SSH até conferir a identidade do host por esse canal.

O script abaixo não altera arquivos nem serviços e não imprime chaves privadas. Ele deriva a chave pública de cada chave privada de host apenas em memória via pipe, compara fingerprints SHA-256 e informa metadados. Rode-o como root na sessão já autenticada do console. Não compartilhe arquivos de chave.

```bash
set +x
printf '%s\n' '=== Host keys: fingerprints e correspondência ==='
for private in /etc/ssh/ssh_host_*_key; do
  [ -f "$private" ] || continue
  public="${private}.pub"
  private_fp="$(ssh-keygen -y -P '' -f "$private" 2>/dev/null | ssh-keygen -lf /dev/stdin -E sha256 2>/dev/null | awk '{print $2}')"
  if [ -f "$public" ]; then
    public_fp="$(ssh-keygen -lf "$public" -E sha256 2>/dev/null | awk '{print $2}')"
  else
    public_fp='MISSING'
  fi
  if [ -n "$private_fp" ] && [ "$private_fp" = "$public_fp" ]; then
    pair='MATCH'
  elif [ -n "$private_fp" ] && [ "$public_fp" = 'MISSING' ]; then
    pair='PUBLIC_FILE_MISSING'
  else
    pair='MISMATCH_OR_UNREADABLE'
  fi
  printf '%s private=%s public=%s pair=%s\n' "$(basename "$private")" "${private_fp:-UNREADABLE}" "${public_fp:-UNREADABLE}" "$pair"
  stat -c 'mode=%a owner=%U:%G path=%n' "$private" 2>/dev/null
  if [ -f "$public" ]; then stat -c 'mode=%a owner=%U:%G path=%n' "$public" 2>/dev/null; fi
done

printf '%s\n' '=== Arquivos .pub que parecem conter chave privada (somente caminhos) ==='
find /etc/ssh -type f -name '*.pub' -exec sh -c '
  for f do
    if grep -IqE "^-----BEGIN ([A-Z0-9 ]+ )?PRIVATE KEY-----" "$f"; then
      printf "SUSPECT_PRIVATE_MATERIAL_IN_PUBLIC_PATH %s\n" "$f"
    fi
  done
' sh {} +

printf '%s\n' '=== Configuração SSH ==='
if sshd -t; then printf '%s\n' 'sshd_config=VALID'; else printf '%s\n' 'sshd_config=INVALID'; fi
printf 'service_ssh='; systemctl is-active ssh 2>/dev/null || systemctl is-active sshd 2>/dev/null || true
```

**Atenção:** se qualquer par indicar `MISMATCH_OR_UNREADABLE`, `PUBLIC_FILE_MISSING`, se houver caminho suspeito ou `sshd_config=INVALID`, pare e envie apenas a saída sanitizada. Não derive arquivos temporários, sobrescreva chaves públicas, altere permissões, reinicie SSH, troque fingerprints ou desbloqueie firewall automaticamente. Se a chave privada estiver suspeita/exposta, isso requer plano de rotação aprovado.

Após confirmação da correspondência pelo console, compare a fingerprint Ed25519 observada com a fingerprint previamente confirmada na Contabo. Se a fingerprint original não estiver registrada, não confie silenciosamente na primeira observada: registre a nova identidade via Contabo e só então faça pin no `known_hosts` local com `StrictHostKeyChecking yes`.
