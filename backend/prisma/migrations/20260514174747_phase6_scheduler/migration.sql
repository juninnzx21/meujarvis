-- AlterTable
ALTER TABLE "Routine" ADD COLUMN     "lastRunAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "overdueNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);
