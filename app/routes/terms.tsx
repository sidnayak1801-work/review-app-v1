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

/**
 * Canonical App Store terms URL:
 * https://reviewtrix.algorithmtrix.com/terms
 */
export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="August 6, 2026">
      <p>
        These Terms govern your use of the ReviewTrix Shopify application
        operated by Algorithm Trix Private Ltd at{" "}
        <a href="https://reviewtrix.algorithmtrix.com">
          reviewtrix.algorithmtrix.com
        </a>
        . By installing or using ReviewTrix, you agree to these Terms.
      </p>

      <h2>Accounts and eligibility</h2>
      <p>
        You must have authority to install apps on the Shopify store you
        connect. You are responsible for safeguarding account access and for
        activity under your store.
      </p>

      <h2>The service</h2>
      <p>
        ReviewTrix provides product-review collection, moderation, storefront
        widgets (Theme App Extensions), review requests, imports, Q&amp;A,
        incentives, optional integrations, and related merchant tools subject to
        your plan allowances (Free or Pro).
      </p>

      <h2>Subscriptions and billing</h2>
      <p>
        ReviewTrix uses Shopify App Pricing. Plans are <strong>Free</strong> and{" "}
        <strong>Pro</strong> ($19 USD / month with a 14-day trial) as described
        in the app Billing screen and App Store listing. Shopify is the
        subscription source of truth. Published-review and review-request email
        allowances are enforced server-side. Downgrades do not delete your review
        data. Charges are accepted, declined, and can be requested again after
        reinstall through Shopify’s billing flow.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>
          You are responsible for review and Q&amp;A content published on your
          storefront and for complying with applicable consumer and advertising
          laws.
        </li>
        <li>
          You must not use ReviewTrix to submit or display fraudulent, unlawful,
          deceptive, or infringing content, or to bypass plan allowances.
        </li>
        <li>
          You remain responsible for privacy disclosures to your customers and
          for any third-party services you connect.
        </li>
      </ul>

      <h2>Customer reviews and license</h2>
      <p>
        Merchants own their review and Q&amp;A content. You grant ReviewTrix a
        license to host, process, and display that content as needed to provide
        the service (widgets, moderation, requests, imports, and integrations
        you enable).
      </p>

      <h2>Third-party services</h2>
      <p>
        Optional connectors (for example Klaviyo or Gorgias) process data
        according to those providers’ terms when you connect them. Theme
        placement uses Shopify Theme App Extensions; we do not require merchants
        to paste theme code.
      </p>

      <h2>Disclaimer and liability</h2>
      <p>
        The service is provided “as is.” To the fullest extent permitted by law,
        we disclaim warranties of merchantability, fitness for a particular
        purpose, and non-infringement. We are not liable for indirect or
        consequential damages arising from use of the app.
      </p>

      <h2>Contact</h2>
      <p>
        Questions:{" "}
        <a href="mailto:support.reviewtrix@algorithmtrix.com">
          support.reviewtrix@algorithmtrix.com
        </a>
      </p>
      <p>
        Canonical terms URL:{" "}
        <a href="https://reviewtrix.algorithmtrix.com/terms">
          https://reviewtrix.algorithmtrix.com/terms
        </a>
      </p>
    </LegalLayout>
  );
}
