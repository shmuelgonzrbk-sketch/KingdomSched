-- CreateTable
CREATE TABLE "BosquejoPersonal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BosquejoPersonal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BosquejoPersonal" ADD CONSTRAINT "BosquejoPersonal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
