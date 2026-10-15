-- AlterTable: цена позиции склада — на карточке /nalichie/ (нет — «по запросу»), «от» перед ценой и пояснение («с НДС»)
ALTER TABLE "content"."stock_items" ADD COLUMN     "price" INTEGER,
ADD COLUMN     "price_from" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "price_note" TEXT;
