ALTER TABLE "WhatsAppMessage"
ADD COLUMN "externalMessageId" TEXT;

CREATE UNIQUE INDEX "WhatsAppMessage_externalMessageId_key"
ON "WhatsAppMessage"("externalMessageId");
