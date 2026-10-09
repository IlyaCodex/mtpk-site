-- AlterTable
ALTER TABLE "content"."stock_items" ADD COLUMN     "group_key" TEXT,
ADD COLUMN     "photos" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "url" SET DEFAULT '';

-- CreateTable
CREATE TABLE "content"."stock_groups" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'equipment',
    "title" TEXT NOT NULL,
    "image" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_groups_key_unique" ON "content"."stock_groups"("key");

