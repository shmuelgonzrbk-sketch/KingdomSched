-- AlterTable
ALTER TABLE "Congregacion" ADD COLUMN     "metaAccessToken" TEXT,
ADD COLUMN     "metaPhoneNumberId" TEXT,
ADD COLUMN     "whatsappActivo" BOOLEAN NOT NULL DEFAULT false;
