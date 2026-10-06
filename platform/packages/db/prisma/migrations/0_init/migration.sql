-- Исходное состояние базы платформы (схемы admin, content, leads, search).
-- Сгенерировано prisma migrate diff --from-empty и дополнено вручную тем,
-- что Prisma не описывает: расширение pg_trgm (индекс по триграммам
-- заголовков поиска) и вычисляемый столбец search.documents.tsv.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "admin";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "content";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "leads";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "search";

-- CreateTable
CREATE TABLE "content"."pages" (
    "id" SERIAL NOT NULL,
    "path" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'page',
    "template" TEXT NOT NULL DEFAULT 'page',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "body" TEXT,
    "css_templates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "style_hashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preload_image" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "extra_meta" JSONB NOT NULL DEFAULT '{}',
    "published_at" TIMESTAMPTZ(6),
    "modified_at" TIMESTAMPTZ(6),
    "lastmod_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."style_blocks" (
    "hash" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "css" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "style_blocks_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "content"."redirects" (
    "id" SERIAL NOT NULL,
    "from_path" TEXT NOT NULL,
    "to_path" TEXT NOT NULL,
    "code" INTEGER NOT NULL DEFAULT 301,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redirects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."stock_items" (
    "id" SERIAL NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL,
    "qty" INTEGER,
    "shipping" TEXT,
    "note" TEXT,
    "title" TEXT,
    "image" TEXT,
    "specs" JSONB,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "content"."assets" (
    "key" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "etag" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "leads"."leads" (
    "id" SERIAL NOT NULL,
    "request_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "page_url" TEXT,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "task" TEXT,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "utm" JSONB NOT NULL DEFAULT '{}',
    "consent" TEXT,
    "b24_trace" TEXT,
    "b24_trace_valid" BOOLEAN NOT NULL DEFAULT false,
    "ym_uid" TEXT,
    "roistat_visit" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "attachment_key" TEXT,
    "attachment_name" TEXT,
    "attachment_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "mail_status" TEXT NOT NULL DEFAULT 'pending',
    "mail_error" TEXT,
    "mail_sent_at" TIMESTAMPTZ(6),
    "b24_status" TEXT NOT NULL DEFAULT 'pending',
    "b24_lead_id" INTEGER,
    "b24_http" INTEGER,
    "b24_trace_status" TEXT,
    "b24_trace_id" INTEGER,
    "b24_error" TEXT,
    "delivered_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."lead_rejects" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "source" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "lead_rejects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search"."documents" (
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "image" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "tsv" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('russian'::regconfig, COALESCE(title, ''::text)), 'A'::"char") || setweight(to_tsvector('russian'::regconfig, COALESCE(body, ''::text)), 'C'::"char")) STORED,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("path")
);

-- CreateTable
CREATE TABLE "admin"."users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."audit_log" (
    "id" SERIAL NOT NULL,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,
    "user_email" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "details" JSONB,
    "ip" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pages_path_unique" ON "content"."pages"("path");

-- CreateIndex
CREATE INDEX "pages_template_idx" ON "content"."pages"("template");

-- CreateIndex
CREATE INDEX "pages_kind_idx" ON "content"."pages"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "redirects_from_path_unique" ON "content"."redirects"("from_path");

-- CreateIndex
CREATE UNIQUE INDEX "leads_request_id_unique" ON "leads"."leads"("request_id");

-- CreateIndex
CREATE INDEX "leads_created_idx" ON "leads"."leads"("created_at");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"."leads"("status");

-- CreateIndex
CREATE INDEX "documents_tsv_idx" ON "search"."documents" USING GIN ("tsv");

-- CreateIndex
CREATE INDEX "documents_title_trgm_idx" ON "search"."documents" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_unique" ON "admin"."users"("email");

-- CreateIndex
CREATE INDEX "audit_at_idx" ON "admin"."audit_log"("at");

-- CreateIndex
CREATE INDEX "audit_target_idx" ON "admin"."audit_log"("target");
