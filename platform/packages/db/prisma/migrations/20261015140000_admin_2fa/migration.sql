-- 2FA в админке: секрет кодов из приложения (TOTP), дата включения, хеши резервных кодов
-- AlterTable
ALTER TABLE "admin"."users" ADD COLUMN     "recovery_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "totp_enabled_at" TIMESTAMPTZ(6),
ADD COLUMN     "totp_secret" TEXT;
