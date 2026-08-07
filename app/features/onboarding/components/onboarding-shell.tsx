import type { ReactNode } from "react";

type OnboardingShellProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

export function OnboardingShell({
  title,
  subtitle,
  children,
}: OnboardingShellProps) {
  return (
    <s-page heading={title ?? "Onboarding"}>
      <s-stack direction="block" gap="large">
        {subtitle ? <s-text color="subdued">{subtitle}</s-text> : null}
        {children}
      </s-stack>
    </s-page>
  );
}
