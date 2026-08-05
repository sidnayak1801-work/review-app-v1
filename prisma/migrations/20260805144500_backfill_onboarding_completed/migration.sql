-- Existing merchants should not be forced through onboarding.
INSERT INTO "OnboardingStatus" (
  "id",
  "shopId",
  "themeEnabled",
  "widgetAdded",
  "reviewsImported",
  "emailConfigured",
  "completed",
  "skipped",
  "currentStep",
  "completedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text),
  s."id",
  true,
  true,
  true,
  true,
  true,
  false,
  5,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Shop" s
WHERE NOT EXISTS (
  SELECT 1 FROM "OnboardingStatus" o WHERE o."shopId" = s."id"
);
