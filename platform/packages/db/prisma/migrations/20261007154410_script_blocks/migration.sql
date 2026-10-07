-- CreateTable
CREATE TABLE "content"."script_blocks" (
    "hash" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "js" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "script_blocks_pkey" PRIMARY KEY ("hash")
);
