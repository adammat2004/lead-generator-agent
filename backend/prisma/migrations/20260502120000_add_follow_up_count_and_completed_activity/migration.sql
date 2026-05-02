-- Follow-up counter and activity type for marking follow-ups completed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ActivityType'
      AND e.enumlabel = 'FOLLOW_UP_COMPLETED'
  ) THEN
    ALTER TYPE "ActivityType" ADD VALUE 'FOLLOW_UP_COMPLETED';
  END IF;
END
$$;

ALTER TABLE "OutreachLead" ADD COLUMN IF NOT EXISTS "followUpCount" INTEGER NOT NULL DEFAULT 0;
