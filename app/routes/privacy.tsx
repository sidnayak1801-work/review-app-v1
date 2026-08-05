import type { ReactNode } from "react";
import type { LinksFunction, MetaFunction } from "react-router";

import legalStyles from "../styles/legal.css?url";

export const meta: MetaFunction = () => [
  { title: "Privacy Policy — ReviewTrix" },
  {
    name: "description",
    content: "How ReviewTrix handles merchant and customer data on Shopify.",
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

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="July 25, 2026">
      <p>
        ReviewTrix (“we”, “us”) is a Shopify product-review application. This
        summary explains how we handle data for merchants who install the app
        and for shoppers who submit reviews. It is an MVP placeholder and should
        be reviewed by counsel before public App Store launch.
      </p>
      <h2>Data we process</h2>
      <ul>
        <li>
          Shop identifiers and OAuth session data required to authenticate
          merchants via Shopify.
        </li>
        <li>
          Review content (rating, text, optional media, author name/email when
          provided) and moderation state.
        </li>
        <li>
          Order/fulfillment identifiers needed to schedule review requests and
          verify purchases, stored as limited snapshots.
        </li>
      </ul>
      <h2>How we use data</h2>
      <p>
        We use data solely to operate review collection, moderation, display,
        imports, review requests, billing entitlements, and related merchant
        tools. We do not sell personal data.
      </p>
      <h2>Shopify and subprocessors</h2>
      <p>
        Authentication and shop lifecycle are handled through Shopify. Hosting,
        email, and storage providers may process data as subprocessors under our
        instructions. Merchants remain responsible for their storefront privacy
        disclosures to customers.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        We honor Shopify GDPR webhooks (
        <code>customers/data_request</code>, <code>customers/redact</code>,{" "}
        <code>shop/redact</code>) and merchant-initiated deletion workflows
        documented in the app.
      </p>
      <h2>Contact</h2>
      <p>
        Privacy questions:{" "}
        <a href="mailto:support@reviewtrix.algorithmtrix.com">support@reviewtrix.algorithmtrix.com</a>
      </p>
    </LegalLayout>
  );
}
