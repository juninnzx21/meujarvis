# SEC-002 — review findings and remediation checkpoint

**Review scope:** local code and test architecture for encryption-key separation, authenticated backups and the disposable PostgreSQL gate. This is a remediation checkpoint, not final approval.

## Findings

1. **P2 — shared network:** the verifier described isolated networking but accepted Docker's default shared `bridge`. The PostgreSQL container was not attached to a dedicated network.
2. **P2 — recovery key path:** backup HMAC verification required `SETTINGS_ENCRYPTION_KEY`; recovery with only the explicitly configured previous key failed before restore.
3. **P2 — key separation:** environment validation allowed either settings key to equal `JWT_SECRET`, weakening domain separation.
4. **P2 — integration gate visibility:** the broad test command can skip database integration when no test URL is configured. The Agent Sync runner validates the DB first, but SEC-002 needed a direct mandatory command.
5. **P3 — stale requirements:** SEC-002 task text allowed generic confirmation for a non-disposable database, and CLI documentation incorrectly implied that only `--dry-run` could be passed as a valid invocation.

## Local remediation

- Require the pinned disposable PostgreSQL container to be the only member of the named Docker bridge network; retain the exact loopback-only published binding, pinned image, tmpfs, no persistent mounts and SQL identity check.
- Docker Desktop did not allow the Windows host runner to reach PostgreSQL through a published port on an `internal` network. The test container was therefore moved to a dedicated user-defined bridge with one member. It isolates the database from other Docker networks/containers, but allows egress; this remaining limit is explicit in planning and security documentation.
- Verify backup HMAC using the current dedicated key or, when absent/unavailable, only the explicitly configured previous key; restore still requires every ciphertext to decrypt and record identities to match before writes.
- Reject `SETTINGS_ENCRYPTION_KEY` and `SETTINGS_ENCRYPTION_KEY_OLD` when either equals `JWT_SECRET` in environment validation and the encryption service.
- Add `backend/npm run test:sec002:integration`, which performs Docker+SQL identity verification before running the PostgreSQL integration file and fails closed when verification is unavailable.
- Correct stale task, CLI and network documentation.

## Evidence

- `run-cycle.ps1 -ValidateOnly`: `LOCAL_VALIDATION_OK`; migrations and Docker+SQL identity passed; backend 168/168 across 22 files; frontend 49/49; Agent Sync 15/15; zero skips; typechecks, builds and `git diff --check` passed. Dry-run had no OpenAI key, no eligible task, scheduler disabled and production changes disabled.
- `npm run test:sec002:integration`: identity verified; 11/11 passed, zero skips. This includes negative gate/no-side-effect cases, valid rotation/rollback, and restoration using only the previous key. Fixtures and keys were synthetic.
- No real secrets, persistent databases, VPS or production were accessed. No paid model call, push, merge, deploy or scheduler activation occurred.

## Gate status

The fixes have not received a post-remediation independent review. SEC-002 remains `IN_PROGRESS`; the formal `reviewed_continue` gate remains pending. The dedicated bridge permits egress and is a documented limitation. No production readiness is claimed.

## Independent re-review after parser fix — 2026-10-18

- The reviewer found that `decryptSecret` and `needsReEncryption` ignored an unexpected suffix after otherwise valid v1/v2 ciphertext fields. The format acceptance criterion requires malformed structures to fail closed.
- Both functions now require exactly five colon-delimited components. A regression creates valid synthetic v1 and v2 values, appends an extra component, and checks decryption returns empty and rotation marks them for re-encryption/abort.
- The reviewer confirmed the P2 is closed and found no other code finding in this targeted review. The review was static/read-only; it did not rerun tests or access a database.
- A P3 stale-count mismatch in the security register was corrected: 142/142 is now explicitly historical; the latest recorded validation is backend 172/172, frontend 49/49, Agent Sync 17/17 and focused SEC-002 integration 11/11, zero skips.
- SEC-002 remains `IN_PROGRESS` pending the formal `reviewed_continue` gate. No real rotation or production readiness is claimed.
