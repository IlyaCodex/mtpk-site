-- AlterTable: категорию, подкатегорию и товар можно скрыть с сайта тумблером в админке «Каталог»
-- (вместе со всем, что внутри; данные и страницы не удаляются)
ALTER TABLE "content"."categories" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "content"."subcategories" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "content"."products" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;
