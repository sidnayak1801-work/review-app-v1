import { LazyMotion } from "framer-motion";

import { CtaSection } from "./components/cta-section";
import { DashboardPreview } from "./components/dashboard-preview";
import { FaqSection } from "./components/faq-section";
import { FeaturesSection } from "./components/features-section";
import { HeroSection } from "./components/hero-section";
import { HowItWorks } from "./components/how-it-works";
import { LogoMarquee } from "./components/logo-marquee";
import { PricingSection } from "./components/pricing-section";
import { SiteFooter } from "./components/site-footer";
import { SiteNavbar } from "./components/site-navbar";
import { SocialProofSection } from "./components/social-proof-section";
import { marketingMotionFeatures } from "./lib/motion";
import { ThemeProvider, useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

interface MarketingLandingProps {
  showForm: boolean;
}

function MarketingShell({ showForm }: MarketingLandingProps) {
  const { theme, ready } = useTheme();

  return (
    <div
      id="marketing-root"
      data-theme={theme}
      className={cn(
        "mkt-site bg-background text-foreground antialiased",
        ready && "mkt-theme-ready",
      )}
    >
      <LazyMotion features={marketingMotionFeatures}>
        <SiteNavbar />
        <main>
          <HeroSection />
          <LogoMarquee />
          <FeaturesSection />
          <DashboardPreview />
          <SocialProofSection />
          <HowItWorks />
          <PricingSection />
          <FaqSection />
          <CtaSection showForm={showForm} />
        </main>
        <SiteFooter />
      </LazyMotion>
    </div>
  );
}

export function MarketingLanding({ showForm }: MarketingLandingProps) {
  return (
    <ThemeProvider>
      <MarketingShell showForm={showForm} />
    </ThemeProvider>
  );
}
