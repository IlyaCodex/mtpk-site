-- Каталог продукции как данные: категории, подкатегории, товары.
-- Карточки в списках строятся из этих таблиц; страницы (тексты, фото,
-- характеристики, SEO) — в content.pages, связь один к одному по page_id.

-- CreateTable
CREATE TABLE "content"."categories" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "crumb" TEXT NOT NULL,
    "cover" TEXT,
    "cover_alt" TEXT NOT NULL DEFAULT '',
    "cover_attrs" JSONB NOT NULL DEFAULT '{}',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "on_home" BOOLEAN NOT NULL DEFAULT true,
    "kind" TEXT NOT NULL DEFAULT 'equipment',
    "product_blocks" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."subcategories" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "crumb" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "cover" TEXT,
    "cover_alt" TEXT NOT NULL DEFAULT '',
    "cover_attrs" JSONB NOT NULL DEFAULT '{}',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "listed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."products" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "subcategory_id" INTEGER,
    "name" TEXT NOT NULL,
    "name_note" TEXT,
    "cover" TEXT,
    "cover_alt" TEXT NOT NULL DEFAULT '',
    "cover_attrs" JSONB NOT NULL DEFAULT '{}',
    "badge" TEXT,
    "origin" TEXT,
    "caption" TEXT,
    "label" TEXT,
    "link_text" TEXT,
    "specs" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "attrs" JSONB NOT NULL DEFAULT '{}',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "listed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_page_id_key" ON "content"."categories"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "subcategories_page_id_key" ON "content"."subcategories"("page_id");

-- CreateIndex
CREATE INDEX "subcategories_category_idx" ON "content"."subcategories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_page_id_key" ON "content"."products"("page_id");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "content"."products"("category_id");

-- CreateIndex
CREATE INDEX "products_subcategory_idx" ON "content"."products"("subcategory_id");

-- AddForeignKey
ALTER TABLE "content"."categories" ADD CONSTRAINT "categories_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "content"."pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."subcategories" ADD CONSTRAINT "subcategories_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "content"."pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."subcategories" ADD CONSTRAINT "subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "content"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."products" ADD CONSTRAINT "products_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "content"."pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "content"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."products" ADD CONSTRAINT "products_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "content"."subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

