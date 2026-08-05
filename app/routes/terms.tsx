import type { ReactNode } from "react";
import type { LinksFunction, MetaFunction } from "react-router";

import legalStyles from "../styles/legal.css?url";

export const meta: MetaFunction = () => [
  { title: "Terms of Service — ReviewTrix" },
  {
    name: "description",
    content: "Terms of use for the ReviewTrix Shopify application.",
  },
];

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: legalStyles },
];

function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="legalPage">
      <h1>{title}</h1>
      <p className="legalUpdated">Last updated {updated}</p>
      {children}
    </main>
  );
}

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="July 25, 2026">
      <p>
        By installing or using ReviewTrix on Shopify, you agree to these terms.
        This is an MVP placeholder and should be finalized with counsel before
        public App Store launch.
      </p>
      <h2>The service</h2>
      <p>
        ReviewTrix provides product-review collection, moderation, storefront
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
          You must not use ReviewTrix to submit or display fraudulent, unlawful, or
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
        Questions: <a href="mailto:support@reviewtrix.algorithmtrix.com">support@reviewtrix.algorithmtrix.com</a>
      </p>
    </LegalLayout>
  );
}
