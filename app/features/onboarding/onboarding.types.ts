export type OnboardingPublicStatus = {
  themeEnabled: boolean;
  reviewsImported: boolean;
  automationConfigured: boolean;
  brandingConfigured: boolean;
  completed: boolean;
  skipped: boolean;
  completedAt: string | null;
  needsOnboarding: boolean;
  /** 0–100 in steps of 25 (theme, automation, import, branding). */
  progress: number;
};

export type OnboardingScreen =
  | "welcome"
  | "health"
  | "checklist"
  | "theme"
  | "import"
  | "automation"
  | "branding"
  | "celebration";

export type OnboardingAnalyticsEvent =
  | "Onboarding Started"
  | "Welcome Completed"
  | "Theme Enabled"
  | "Import Started"
  | "Import Completed"
  | "Automation Enabled"
  | "Branding Customized"
  | "Checklist Completed"
  | "Onboarding Finished"
  | "Dashboard Opened"
  | "Skipped Import"
  | "Skipped Branding"
  | "Skipped Automation"
  | "Skipped Onboarding";
