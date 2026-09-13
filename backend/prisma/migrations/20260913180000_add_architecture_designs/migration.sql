-- CreateTable
CREATE TABLE "architecture_designs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cloudProvider" TEXT NOT NULL DEFAULT 'AWS',
    "ownerId" TEXT NOT NULL,
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "architecture_designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE INDEX "architecture_designs_ownerId_idx" ON "architecture_designs"("ownerId");

-- AddForeignKey
ALTER TABLE "architecture_designs" ADD CONSTRAINT "architecture_designs_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
