-- AlterTable: позиция склада может быть скрыта на сайте (остаётся в разделе «Наличие на складе» админки)
ALTER TABLE "content"."stock_items" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;
