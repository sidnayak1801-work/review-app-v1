import type { ReactNode } from "react";
import type { LinksFunction, MetaFunction } from "react-router";

import legalStyles from "../styles/legal.css?url";

export const meta: MetaFunction = () => [
  { title: "Privacy Policy — ReviewTrix" },
  {
    name: "description",
    content:
      "How ReviewTrix handles merchant and customer data for the Shopify application.",
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
 * Canonical App Store privacy URL:
 * https://reviewtrix.algorithmtrix.com/privacy
 */
export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="August 6, 2026">
      <p>
        ReviewTrix (“we”, “us”) is a Shopify product-review application operated
        by Algorithm Trix Private Ltd. This policy explains how we collect, use,
        and share information when merchants install ReviewTrix and when shoppers
        interact with reviews, Q&amp;A, and related features on a merchant’s
        storefront.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Shopify store data</strong> — shop domain, Shopify shop
          identifiers, install status, OAuth session data, billing entitlements,
          and scopes needed to run the app.
        </li>
        <li>
          <strong>Review workflow data</strong> — ratings, titles, bodies,
          optional media, author name/email when provided, moderation state,
          merchant replies, featured flags, Q&amp;A, incentive configuration, and
          import job metadata.
        </li>
        <li>
          <strong>Order-derived snapshots</strong> — limited fulfillment and
          customer contact fields required to schedule review-request emails and
          verify purchases (Shopify remains the source of truth for orders and
          customers).
        </li>
        <li>
          <strong>Integration credentials</strong> — encrypted connection secrets
          when a merchant connects optional providers (for example Klaviyo or
          Gorgias).
        </li>
        <li>
          <strong>Operational logs</strong> — shop domain, resource IDs, and
          counts for reliability and compliance. We avoid logging review bodies,
          customer emails, access tokens, or import CSV contents.
        </li>
      </ul>

      <h2>How we use information</h2>
      <p>
        We use information solely to provide review collection, moderation,
        storefront widgets, review requests, imports, billing enforcement,
        merchant tools, and integrations the merchant enables. We do not sell
        personal information.
      </p>

      <h2>Shopify, merchants, and subprocessors</h2>
      <p>
        When installed on a Shopify store, ReviewTrix processes store and
        customer data as a service provider on behalf of the merchant. Merchants
        remain responsible for their own privacy notices to end customers.
        Shopify remains the source of truth for products, customers, orders, and
        fulfillment.
      </p>
      <p>We use infrastructure subprocessors under our instructions, including:</p>
      <ul>
        <li>Hosting / application runtime (for example Coolify or equivalent)</li>
        <li>PostgreSQL database hosting (for example Neon)</li>
        <li>Object storage for review media (for example AWS S3)</li>
        <li>
          Transactional email for review requests when configured (for example
          Resend)
        </li>
      </ul>

      <h2>Compliance webhooks</h2>
      <p>We respond to Shopify’s mandatory compliance webhooks:</p>
      <ul>
        <li>
          <code>customers/data_request</code> — locate matching review, Q&amp;A,
          and review-request records so the merchant (and operators) can fulfill
          a data subject request
        </li>
        <li>
          <code>customers/redact</code> — anonymize or clear customer identifiers
          on reviews/Q&amp;A and cancel related request emails
        </li>
        <li>
          <code>shop/redact</code> — after uninstall (~48 hours), delete
          shop-scoped application data
        </li>
        <li>
          <code>app/uninstalled</code> — mark the shop uninstalled and remove
          sessions; review data is retained until shop redaction
        </li>
      </ul>

      <h2>Retention</h2>
      <p>
        While a shop is installed, we retain review workflow data needed for
        moderation and display. We do not delete merchant data solely because of
        a Free↔Pro plan change. After shop redaction, shop-scoped data is
        hard-deleted. Media objects associated with reviews are removed when the
        related records are deleted according to our retention workflows.
      </p>

      <h2>Security</h2>
      <p>
        Merchant access is authenticated via Shopify. Production traffic is
        served over HTTPS. Integration credentials are encrypted at rest. Plan
        allowances are enforced server-side.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions:{" "}
        <a href="mailto:support.reviewtrix@algorithmtrix.com">
          support.reviewtrix@algorithmtrix.com
        </a>
      </p>
      <p>
        Canonical policy URL:{" "}
        <a href="https://reviewtrix.algorithmtrix.com/privacy">
          https://reviewtrix.algorithmtrix.com/privacy
        </a>
      </p>
    </LegalLayout>
  );
}
