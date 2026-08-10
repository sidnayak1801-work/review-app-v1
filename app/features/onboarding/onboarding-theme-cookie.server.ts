import { createCookie } from "react-router";

export type OnboardingSelectedTheme = {
  id: string;
  name: string;
};

const onboardingThemeCookie = createCookie("rx_onboarding_theme", {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
});

function isSelectedTheme(value: unknown): value is OnboardingSelectedTheme {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as OnboardingSelectedTheme).id === "string" &&
    typeof (value as OnboardingSelectedTheme).name === "string" &&
    (value as OnboardingSelectedTheme).id.startsWith(
      "gid://shopify/OnlineStoreTheme/",
    )
  );
}

export async function readOnboardingThemeCookie(
  request: Request,
): Promise<OnboardingSelectedTheme | null> {
  const value = await onboardingThemeCookie.parse(
    request.headers.get("Cookie"),
  );
  return isSelectedTheme(value) ? value : null;
}

export async function serializeOnboardingThemeCookie(
  theme: OnboardingSelectedTheme,
): Promise<string> {
  return onboardingThemeCookie.serialize(theme);
}
