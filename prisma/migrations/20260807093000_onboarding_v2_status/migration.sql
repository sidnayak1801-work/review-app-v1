-- Onboarding v2: launch-checklist flags; drop wizard step columns.

ALTER TABLE "OnboardingStatus" ADD COLUMN IF NOT EXISTS "automationConfigured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OnboardingStatus" ADD COLUMN IF NOT EXISTS "brandingConfigured" BOOLEAN NOT NULL DEFAULT false;

-- Backfill automation from legacy emailConfigured when present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'OnboardingStatus' AND column_name = 'emailConfigured'
  ) THEN
    EXECUTE 'UPDATE "OnboardingStatus" SET "automationConfigured" = true WHERE "emailConfigured" = true';
  END IF;
END $$;

ALTER TABLE "OnboardingStatus" DROP COLUMN IF EXISTS "emailConfigured";
ALTER TABLE "OnboardingStatus" DROP COLUMN IF EXISTS "widgetAdded";
ALTER TABLE "OnboardingStatus" DROP COLUMN IF EXISTS "currentStep";
