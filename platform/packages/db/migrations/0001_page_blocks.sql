ALTER TABLE "content"."pages" ALTER COLUMN "body" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "content"."pages" ADD COLUMN "blocks" jsonb DEFAULT '[]'::jsonb NOT NULL;