ALTER TABLE "User"
  ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "totpSecretEncrypted" TEXT,
  ADD COLUMN "totpPendingSecretEncrypted" TEXT,
  ADD COLUMN "totpRecoveryCodeHashes" JSONB,
  ADD COLUMN "totpLastCounter" BIGINT,
  ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;
