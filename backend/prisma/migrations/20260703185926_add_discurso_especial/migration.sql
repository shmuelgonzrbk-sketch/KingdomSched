-- CreateTable
CREATE TABLE "DiscursoEspecial" (
    "id" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscursoEspecial_pkey" PRIMARY KEY ("id")
);
