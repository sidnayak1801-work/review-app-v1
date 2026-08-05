export type OnboardingPublicStatus = {
  themeEnabled: boolean;
  widgetAdded: boolean;
  reviewsImported: boolean;
  emailConfigured: boolean;
  completed: boolean;
  skipped: boolean;
  currentStep: number;
  completedAt: string | null;
  needsOnboarding: boolean;
};

export type OnboardingAnalyticsEvent =
  | "Onboarding Started"
  | "Theme Enabled"
  | "Widget Added"
  | "Import Started"
  | "Import Completed"
  | "Email Configured"
  | "Onboarding Completed"
  | "Skipped Import"
  | "Skipped Emails"
  | "Skipped Onboarding"
  | "Skipped Widget";
