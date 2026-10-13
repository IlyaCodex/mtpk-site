-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "mailing";

-- CreateTable
CREATE TABLE "mailing"."contacts" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "phone" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'active',
    "unsubscribed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing"."lists" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing"."list_members" (
    "list_id" INTEGER NOT NULL,
    "contact_id" INTEGER NOT NULL,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_members_pkey" PRIMARY KEY ("list_id","contact_id")
);

-- CreateTable
CREATE TABLE "mailing"."campaigns" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "preheader" TEXT NOT NULL DEFAULT '',
    "from_name" TEXT NOT NULL DEFAULT 'УралИндуктор',
    "html" TEXT NOT NULL DEFAULT '',
    "list_id" INTEGER,
    "utm_campaign" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "transport" TEXT,
    "scheduled_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "compiled" TEXT,
    "total" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing"."recipients" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "contact_id" INTEGER,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "locked_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "opened_at" TIMESTAMPTZ(6),
    "opens" INTEGER NOT NULL DEFAULT 0,
    "clicked_at" TIMESTAMPTZ(6),
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing"."links" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "utm_content" TEXT NOT NULL DEFAULT '',
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "unique_clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing"."clicks" (
    "id" BIGSERIAL NOT NULL,
    "link_id" INTEGER NOT NULL,
    "recipient_id" INTEGER,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,

    CONSTRAINT "clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing"."imports" (
    "id" SERIAL NOT NULL,
    "list_id" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "processed" INTEGER NOT NULL DEFAULT 0,
    "added" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mail_contacts_email_unique" ON "mailing"."contacts"("email");

-- CreateIndex
CREATE INDEX "mail_contacts_status_idx" ON "mailing"."contacts"("status");

-- CreateIndex
CREATE INDEX "mail_list_members_contact_idx" ON "mailing"."list_members"("contact_id");

-- CreateIndex
CREATE INDEX "mail_campaigns_status_idx" ON "mailing"."campaigns"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mail_recipients_token_unique" ON "mailing"."recipients"("token");

-- CreateIndex
CREATE INDEX "mail_recipients_campaign_status_idx" ON "mailing"."recipients"("campaign_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mail_recipients_campaign_email_unique" ON "mailing"."recipients"("campaign_id", "email");

-- CreateIndex
CREATE INDEX "mail_links_campaign_idx" ON "mailing"."links"("campaign_id");

-- CreateIndex
CREATE INDEX "mail_clicks_link_idx" ON "mailing"."clicks"("link_id");

-- CreateIndex
CREATE INDEX "mail_clicks_recipient_idx" ON "mailing"."clicks"("recipient_id");

-- CreateIndex
CREATE INDEX "mail_clicks_at_idx" ON "mailing"."clicks"("at");

-- AddForeignKey
ALTER TABLE "mailing"."list_members" ADD CONSTRAINT "list_members_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "mailing"."lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing"."list_members" ADD CONSTRAINT "list_members_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "mailing"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing"."campaigns" ADD CONSTRAINT "campaigns_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "mailing"."lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing"."recipients" ADD CONSTRAINT "recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "mailing"."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing"."links" ADD CONSTRAINT "links_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "mailing"."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing"."clicks" ADD CONSTRAINT "clicks_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "mailing"."links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing"."clicks" ADD CONSTRAINT "clicks_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "mailing"."recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing"."imports" ADD CONSTRAINT "imports_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "mailing"."lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
