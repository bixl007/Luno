-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferences" JSONB;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachments" JSONB;
