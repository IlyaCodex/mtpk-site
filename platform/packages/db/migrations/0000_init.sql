CREATE SCHEMA "content";
--> statement-breakpoint
CREATE SCHEMA "leads";
--> statement-breakpoint
CREATE SCHEMA "search";
--> statement-breakpoint
CREATE TABLE "content"."assets" (
	"key" text PRIMARY KEY NOT NULL,
	"size" bigint NOT NULL,
	"etag" text NOT NULL,
	"content_type" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"kind" text DEFAULT 'page' NOT NULL,
	"template" text DEFAULT 'page' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"body" text NOT NULL,
	"css_templates" text[] DEFAULT '{}'::text[] NOT NULL,
	"style_hashes" text[] DEFAULT '{}'::text[] NOT NULL,
	"preload_image" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"extra_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"modified_at" timestamp with time zone,
	"lastmod_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_hash" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "content"."redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"code" integer DEFAULT 301 NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_from_path_unique" UNIQUE("from_path")
);
--> statement-breakpoint
CREATE TABLE "content"."stock_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"url" text NOT NULL,
	"qty" integer,
	"shipping" text,
	"note" text,
	"title" text,
	"image" text,
	"specs" jsonb,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."style_blocks" (
	"hash" text PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"css" text NOT NULL,
	"bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads"."lead_rejects" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text NOT NULL,
	"phone" text,
	"name" text,
	"source" text,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "leads"."leads" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text,
	"page_url" text,
	"phone" text NOT NULL,
	"name" text,
	"email" text,
	"task" text,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"utm" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"consent" text,
	"b24_trace" text,
	"b24_trace_valid" boolean DEFAULT false NOT NULL,
	"ym_uid" text,
	"roistat_visit" text,
	"ip" text,
	"user_agent" text,
	"attachment_key" text,
	"attachment_name" text,
	"attachment_note" text,
	"status" text DEFAULT 'received' NOT NULL,
	"mail_status" text DEFAULT 'pending' NOT NULL,
	"mail_error" text,
	"mail_sent_at" timestamp with time zone,
	"b24_status" text DEFAULT 'pending' NOT NULL,
	"b24_lead_id" integer,
	"b24_http" integer,
	"b24_trace_status" text,
	"b24_trace_id" integer,
	"b24_error" text,
	"delivered_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "search"."documents" (
	"path" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"image" text,
	"weight" integer DEFAULT 1 NOT NULL,
	"tsv" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('russian', coalesce("search"."documents"."title", '')), 'A') || setweight(to_tsvector('russian', coalesce("search"."documents"."body", '')), 'C')) STORED NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "pages_template_idx" ON "content"."pages" USING btree ("template");--> statement-breakpoint
CREATE INDEX "pages_kind_idx" ON "content"."pages" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "leads"."leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads"."leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_tsv_idx" ON "search"."documents" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "documents_title_trgm_idx" ON "search"."documents" USING gin ("title" gin_trgm_ops);