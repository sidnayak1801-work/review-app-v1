import type { OnboardingPublicStatus, OnboardingScreen } from "../onboarding.types";
import type { WidgetSettingsInput } from "../../widget-settings/widget-settings.schema";
import { BrandingScreen } from "./branding-screen";
import { CelebrationScreen } from "./celebration-screen";
import { ImportReviewsScreen } from "./import-reviews-screen";
import { LaunchChecklist } from "./launch-checklist";
import { ReviewAutomationScreen } from "./review-automation-screen";
import { StoreHealthCheck, type StoreHealthSnapshot } from "./store-health-check";
import { ThemeEnableScreen } from "./theme-enable-screen";
import { WelcomeScreen } from "./welcome-screen";

export type OnboardingActionData = {
  ok: boolean;
  message?: string;
  status?: OnboardingPublicStatus;
};

type OnboardingPageProps = {
  screen: OnboardingScreen;
  status: OnboardingPublicStatus;
  shopDomain: string;
  health: StoreHealthSnapshot;
  themeEditorUrl: string;
  storeUrl: string;
  search: string;
  emailSettings: {
    requestDelayDays: number;
    reminderEnabled: boolean;
    reminderDelayDays: number;
    emailSubject: string;
  } | null;
  widgetSettings: WidgetSettingsInput | null;
  actionData?: OnboardingActionData;
};

export function OnboardingPage({
  screen,
  status,
  shopDomain,
  health,
  themeEditorUrl,
  storeUrl,
  search,
  emailSettings,
  widgetSettings,
  actionData,
}: OnboardingPageProps) {
  const message = actionData?.message;
  const ok = actionData?.ok;
  const liveStatus = actionData?.status ?? status;

  switch (screen) {
    case "welcome":
      return <WelcomeScreen shopDomain={shopDomain} />;
    case "health":
      return <StoreHealthCheck health={health} />;
    case "checklist":
      return <LaunchChecklist status={liveStatus} search={search} />;
    case "theme":
      return (
        <ThemeEnableScreen
          themeEditorUrl={themeEditorUrl}
          status={liveStatus}
          search={search}
          message={message}
        />
      );
    case "import":
      return (
        <ImportReviewsScreen search={search} message={message} ok={ok} />
      );
    case "automation":
      if (!emailSettings) {
        return <LaunchChecklist status={liveStatus} search={search} />;
      }
      return (
        <ReviewAutomationScreen
          search={search}
          settings={emailSettings}
          message={message}
          ok={ok}
        />
      );
    case "branding":
      if (!widgetSettings) {
        return <LaunchChecklist status={liveStatus} search={search} />;
      }
      return (
        <BrandingScreen
          search={search}
          settings={widgetSettings}
          message={message}
          ok={ok}
        />
      );
    case "celebration":
      return (
        <CelebrationScreen
          status={liveStatus}
          storeUrl={storeUrl}
          search={search}
        />
      );
    default:
      return <LaunchChecklist status={liveStatus} search={search} />;
  }
}
