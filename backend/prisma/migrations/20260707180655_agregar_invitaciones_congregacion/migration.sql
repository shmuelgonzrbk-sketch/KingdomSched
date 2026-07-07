-- CreateTable
CREATE TABLE "InvitacionCongregacion" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "congregacionId" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitacionCongregacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvitacionCongregacion_token_key" ON "InvitacionCongregacion"("token");

-- AddForeignKey
ALTER TABLE "InvitacionCongregacion" ADD CONSTRAINT "InvitacionCongregacion_congregacionId_fkey" FOREIGN KEY ("congregacionId") REFERENCES "Congregacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
