/*
  Warnings:

  - You are about to drop the column `telefono` on the `Grupo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Grupo" DROP COLUMN "telefono";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "congregacionId" TEXT;

-- CreateTable
CREATE TABLE "Congregacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Congregacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Congregacion_codigo_key" ON "Congregacion"("codigo");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_congregacionId_fkey" FOREIGN KEY ("congregacionId") REFERENCES "Congregacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
