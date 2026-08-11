import { getAppBaseUrl } from "../../lib/email-env.server";
import type { LifecycleEmailType } from "../../repositories/lifecycle-email.repository.server";
import {
  SUPPORT_EMAIL,
  toAppHomeDeepLink,
  toOnboardingDeepLink,
  toSupportMailto,
} from "./lifecycle-email.links.server";

export interface LifecycleEmailTemplateInput {
  shopDomain: string;
  shopName: string;
}

export interface RenderedLifecycleEmail {
  subject: string;
  html: string;
}

const PRIMARY = "#008060";
const TEXT = "#202223";
const MUTED = "#6d7175";
const BORDER = "#e3e3e3";
const BG = "#f6f7f8";
const CARD = "#ffffff";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function logoUrl(): string {
  return `${getAppBaseUrl()}/reviewtrix-logo.png`;
}

function ctaButton(label: string, href: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px auto 8px;">
      <tr>
        <td align="center" bgcolor="${PRIMARY}" style="border-radius:8px;">
          <a href="${escapeHtml(href)}"
             target="_blank"
             rel="noopener noreferrer"
             style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;line-height:1.25;color:#ffffff;text-decoration:none;border-radius:8px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function renderLayout(input: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
  footerExtraHtml?: string;
}): string {
  const logo = logoUrl();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>ReviewTrix</title>
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      .rx-body { background-color: #1a1a1a !important; }
      .rx-card { background-color: #2a2a2a !important; border-color: #444 !important; }
      .rx-text { color: #f1f1f1 !important; }
      .rx-muted { color: #b0b0b0 !important; }
    }
  </style>
</head>
<body class="rx-body" style="margin:0;padding:0;background-color:${BG};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(input.preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="rx-body" style="background-color:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <img src="${escapeHtml(logo)}" width="140" height="auto" alt="ReviewTrix"
                   style="display:block;border:0;max-width:140px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td class="rx-card" style="background-color:${CARD};border:1px solid ${BORDER};border-radius:12px;padding:36px 32px;">
              <h1 class="rx-text" style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;line-height:1.3;color:${TEXT};text-align:center;">
                ${escapeHtml(input.heading)}
              </h1>
              <div class="rx-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:${TEXT};">
                ${input.bodyHtml}
              </div>
              ${ctaButton(input.ctaLabel, input.ctaHref)}
              ${input.footerExtraHtml ?? ""}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 8px 0;">
              <p class="rx-muted" style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${TEXT};">
                ReviewTrix
              </p>
              <p class="rx-muted" style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:${MUTED};">
                Review management made simple.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function shopDisplayName(input: LifecycleEmailTemplateInput): string {
  const trimmed = input.shopName.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  return input.shopDomain.replace(/\.myshopify\.com$/, "");
}

function renderWelcome(input: LifecycleEmailTemplateInput): RenderedLifecycleEmail {
  const name = escapeHtml(shopDisplayName(input));
  const ctaHref = toOnboardingDeepLink(input.shopDomain);

  return {
    subject: "Welcome to ReviewTrix 🎉",
    html: renderLayout({
      preheader: "Your store is connected. Complete setup to start collecting reviews.",
      heading: "Welcome to ReviewTrix 🎉",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${name},</p>
        <p style="margin:0 0 16px;">Welcome to ReviewTrix!</p>
        <p style="margin:0 0 16px;">
          Your store is now connected and you're ready to start collecting and
          displaying customer reviews.
        </p>
        <p style="margin:0;">Let's get your review experience set up.</p>
      `,
      ctaLabel: "Complete setup",
      ctaHref,
    }),
  };
}

function renderReminder24h(
  input: LifecycleEmailTemplateInput,
): RenderedLifecycleEmail {
  const name = escapeHtml(shopDisplayName(input));
  const ctaHref = toOnboardingDeepLink(input.shopDomain);

  return {
    subject: "Your ReviewTrix setup is waiting",
    html: renderLayout({
      preheader: "Finish setup to start getting more value from customer reviews.",
      heading: "Your setup is waiting",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${name},</p>
        <p style="margin:0 0 16px;">You're almost there.</p>
        <p style="margin:0;">
          Your ReviewTrix setup hasn't been completed yet. Finish the remaining
          steps and start getting more value from your customer reviews.
        </p>
      `,
      ctaLabel: "Continue setup",
      ctaHref,
    }),
  };
}

function renderReminder3d(
  input: LifecycleEmailTemplateInput,
): RenderedLifecycleEmail {
  const name = escapeHtml(shopDisplayName(input));
  const ctaHref = toOnboardingDeepLink(input.shopDomain);
  const supportHref = toSupportMailto(input.shopDomain);

  return {
    subject: "Need help getting ReviewTrix live?",
    html: renderLayout({
      preheader: "We're here to help you finish ReviewTrix setup.",
      heading: "Need a hand getting live?",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${name},</p>
        <p style="margin:0 0 16px;">
          We noticed your ReviewTrix setup isn't complete yet.
        </p>
        <p style="margin:0;">
          If you ran into a problem or aren't sure what to do next, we're here
          to help.
        </p>
      `,
      ctaLabel: "Continue setup",
      ctaHref,
      footerExtraHtml: `
        <p class="rx-muted" style="margin:24px 0 0;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:${MUTED};">
          Need help?
          <a href="${escapeHtml(supportHref)}" style="color:${PRIMARY};text-decoration:underline;">
            Contact support
          </a>
          (${escapeHtml(SUPPORT_EMAIL)})
        </p>
      `,
    }),
  };
}

function renderCompleted(
  input: LifecycleEmailTemplateInput,
): RenderedLifecycleEmail {
  const name = escapeHtml(shopDisplayName(input));
  const ctaHref = toAppHomeDeepLink(input.shopDomain);

  return {
    subject: "You're all set with ReviewTrix 🎉",
    html: renderLayout({
      preheader: "Your ReviewTrix setup is complete.",
      heading: "You're all set 🎉",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${name},</p>
        <p style="margin:0 0 16px;">Your ReviewTrix setup is complete.</p>
        <p style="margin:0;">
          Your store is ready to collect, manage and display customer reviews.
        </p>
      `,
      ctaLabel: "Open ReviewTrix",
      ctaHref,
    }),
  };
}

export function renderLifecycleEmail(
  type: LifecycleEmailType,
  input: LifecycleEmailTemplateInput,
): RenderedLifecycleEmail {
  switch (type) {
    case "WELCOME":
      return renderWelcome(input);
    case "ONBOARDING_REMINDER_24H":
      return renderReminder24h(input);
    case "ONBOARDING_REMINDER_3D":
      return renderReminder3d(input);
    case "ONBOARDING_COMPLETED":
      return renderCompleted(input);
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown lifecycle email type: ${_exhaustive}`);
    }
  }
}

export function lifecycleIdempotencyKey(
  type: LifecycleEmailType,
  shopId: string,
): string {
  switch (type) {
    case "WELCOME":
      return `welcome:${shopId}`;
    case "ONBOARDING_REMINDER_24H":
      return `reminder24:${shopId}`;
    case "ONBOARDING_REMINDER_3D":
      return `reminder3d:${shopId}`;
    case "ONBOARDING_COMPLETED":
      return `completed:${shopId}`;
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown lifecycle email type: ${_exhaustive}`);
    }
  }
}
