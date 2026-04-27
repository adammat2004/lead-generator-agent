DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ActivityType'
      AND e.enumlabel = 'FOLLOW_UP_SCHEDULED'
  ) THEN
    ALTER TYPE "ActivityType" ADD VALUE 'FOLLOW_UP_SCHEDULED';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ActivityType'
      AND e.enumlabel = 'FOLLOW_UP_MESSAGE_CREATED'
  ) THEN
    ALTER TYPE "ActivityType" ADD VALUE 'FOLLOW_UP_MESSAGE_CREATED';
  END IF;
END
$$;
