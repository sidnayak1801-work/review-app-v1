import type { ReactNode } from "react";

import { OnboardingBrand } from "./onboarding-brand";

type OnboardingShellProps = {
  /** Pass `null` to omit the page heading (welcome / celebration use their own H1). */
  title?: string | null;
  subtitle?: string;
  children: ReactNode;
};

export function OnboardingShell({
  title,
  subtitle,
  children,
}: OnboardingShellProps) {
  const heading = title === null ? "\u00A0" : (title ?? "Onboarding");

  return (
    <s-page heading={heading}>
      <s-stack direction="block" gap="large">
        <OnboardingBrand />
        {subtitle ? <s-text color="subdued">{subtitle}</s-text> : null}
        {children}
      </s-stack>
    </s-page>
  );
}
