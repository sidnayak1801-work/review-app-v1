import type { LinksFunction, MetaFunction } from "react-router";

import { LegalPageShell } from "../features/marketing/components/legal-page-shell";
import marketingStyles from "../styles/marketing.css?url";

export const meta: MetaFunction = () => [
  { title: "Terms of Service — ReviewX" },
  {
    name: "description",
    content: "Terms of use for the ReviewX Shopify application.",
  },
];

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: marketingStyles },
  {
    rel: "stylesheet",
    href: "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap",
  },
];

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" updated="July 25, 2026">
      <p>
        By installing or using ReviewX on Shopify, you agree to these terms.
        This is an MVP placeholder and should be finalized with counsel before
        public App Store launch.
      </p>
      <h2>The service</h2>
      <p>
        ReviewX provides product-review collection, moderation, storefront
        widgets, review requests, imports, and related merchant tools subject to
        your Shopify plan allowances (Free or Pro).
      </p>
      <h2>Your responsibilities</h2>
      <ul>
        <li>
          You must have authority to install apps on the Shopify store you
          connect.
        </li>
        <li>
          You are responsible for review content published on your storefront
          and for complying with applicable consumer and advertising laws.
        </li>
        <li>
          You must not use ReviewX to submit or display fraudulent, unlawful, or
          infringing content.
        </li>
      </ul>
      <h2>Billing</h2>
      <p>
        Paid plans are charged through Shopify App Pricing. Shopify is the
        subscription source of truth. Usage limits for published reviews and
        review requests are enforced server-side.
      </p>
      <h2>Disclaimer</h2>
      <p>
        The service is provided “as is.” To the fullest extent permitted by law,
        we disclaim warranties of merchantability, fitness for a particular
        purpose, and non-infringement. We are not liable for indirect or
        consequential damages arising from use of the app.
      </p>
      <h2>Contact</h2>
      <p>
        Questions:{" "}
        <a className="text-brand hover:underline" href="mailto:support@reviewx.app">
          support@reviewx.app
        </a>
      </p>
    </LegalPageShell>
  );
}
