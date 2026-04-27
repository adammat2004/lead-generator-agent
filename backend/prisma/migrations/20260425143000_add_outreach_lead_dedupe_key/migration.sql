-- Add dedupe key support for bulk lead import.
ALTER TABLE "OutreachLead" ADD COLUMN "dedupeKey" TEXT;

-- Backfill existing rows with deterministic fallback based on id.
UPDATE "OutreachLead"
SET "dedupeKey" = md5(concat('legacy|', "id"))
WHERE "dedupeKey" IS NULL;

ALTER TABLE "OutreachLead" ALTER COLUMN "dedupeKey" SET NOT NULL;

CREATE UNIQUE INDEX "OutreachLead_dedupeKey_key" ON "OutreachLead"("dedupeKey");
