import { Form } from "react-router";

import type { AdminIntegrationCard } from "../integration.service.server";

interface IntegrationsPageProps {
  integrations: AdminIntegrationCard[];
  actionData?: {
    ok: boolean;
    message: string;
    issues?: readonly string[];
    provider?: string;
  };
  isSubmitting: boolean;
}

function statusTone(
  status: AdminIntegrationCard["status"],
): "success" | "critical" | "info" | undefined {
  if (status === "CONNECTED") return "success";
  if (status === "ERROR") return "critical";
  return "info";
}

function statusLabel(status: AdminIntegrationCard["status"]): string {
  if (status === "CONNECTED") return "Connected";
  if (status === "ERROR") return "Error";
  return "Disconnected";
}

export function IntegrationsPage({
  integrations,
  actionData,
  isSubmitting,
}: IntegrationsPageProps) {
  return (
    <s-page heading="Integrations">
      <s-stack direction="block" gap="large">
        <s-text color="subdued">
          Connect Klaviyo and Gorgias. Credentials are encrypted at rest and
          never shown back in the admin.
        </s-text>

        {actionData ? (
          <s-banner
            heading={actionData.ok ? "Success" : "Could not update"}
            tone={actionData.ok ? "success" : "critical"}
          >
            {actionData.message}
            {actionData.issues?.length ? (
              <s-unordered-list>
                {actionData.issues.map((issue) => (
                  <s-list-item key={issue}>{issue}</s-list-item>
                ))}
              </s-unordered-list>
            ) : null}
          </s-banner>
        ) : null}

        {integrations.map((card) => (
          <s-box
            key={card.provider}
            padding="base"
            border="base"
            borderRadius="large"
            background="base"
          >
            <s-stack direction="block" gap="base">
              <s-stack direction="inline" gap="base" alignItems="center">
                <s-heading>{card.displayName}</s-heading>
                <s-badge tone={statusTone(card.status)}>
                  {statusLabel(card.status)}
                </s-badge>
              </s-stack>

              {card.accountLabel ? (
                <s-text color="subdued">Account: {card.accountLabel}</s-text>
              ) : null}
              {card.lastError ? (
                <s-text tone="critical">{card.lastError}</s-text>
              ) : null}
              {card.lastSuccessAt ? (
                <s-text color="subdued">
                  Last success: {new Date(card.lastSuccessAt).toLocaleString()}
                </s-text>
              ) : null}

              {!card.encryptionConfigured ? (
                <s-banner tone="warning" heading="Encryption key required">
                  Set INTEGRATIONS_ENCRYPTION_KEY in the app environment before
                  connecting.
                </s-banner>
              ) : null}

              {card.status === "DISCONNECTED" ? (
                <Form method="post">
                  <input type="hidden" name="intent" value="connect" />
                  <input type="hidden" name="provider" value={card.provider} />
                  <s-stack direction="block" gap="base">
                    {card.provider === "klaviyo" ? (
                      <s-password-field
                        name="apiKey"
                        label="Private API key"
                        autocomplete="off"
                        details="Create a private API key in Klaviyo with Events and Accounts access."
                      />
                    ) : (
                      <>
                        <s-text-field
                          name="email"
                          label="Gorgias account email"
                          autocomplete="off"
                        />
                        <s-password-field
                          name="apiToken"
                          label="API token"
                          autocomplete="off"
                        />
                        <s-text-field
                          name="subdomain"
                          label="Subdomain"
                          autocomplete="off"
                          details="Example: your-store (from your-store.gorgias.com)"
                        />
                      </>
                    )}
                    <s-button
                      type="submit"
                      variant="primary"
                      {...(isSubmitting || !card.encryptionConfigured
                        ? { disabled: true }
                        : {})}
                    >
                      Connect
                    </s-button>
                  </s-stack>
                </Form>
              ) : (
                <s-stack direction="block" gap="base">
                  <s-stack direction="inline" gap="base">
                    <Form method="post">
                      <input type="hidden" name="intent" value="test" />
                      <input
                        type="hidden"
                        name="provider"
                        value={card.provider}
                      />
                      <s-button
                        type="submit"
                        {...(isSubmitting ? { disabled: true } : {})}
                      >
                        Test connection
                      </s-button>
                    </Form>
                    <Form method="post">
                      <input type="hidden" name="intent" value="disconnect" />
                      <input
                        type="hidden"
                        name="provider"
                        value={card.provider}
                      />
                      <s-button
                        type="submit"
                        tone="critical"
                        {...(isSubmitting ? { disabled: true } : {})}
                      >
                        Disconnect
                      </s-button>
                    </Form>
                  </s-stack>

                  <s-heading>Reconnect</s-heading>
                  <s-text color="subdued">
                    Replace stored credentials without leaving this page.
                  </s-text>
                  <Form method="post">
                    <input type="hidden" name="intent" value="connect" />
                    <input
                      type="hidden"
                      name="provider"
                      value={card.provider}
                    />
                    <s-stack direction="block" gap="base">
                      {card.provider === "klaviyo" ? (
                        <s-password-field
                          name="apiKey"
                          label="New private API key"
                          autocomplete="off"
                        />
                      ) : (
                        <>
                          <s-text-field
                            name="email"
                            label="Gorgias account email"
                            autocomplete="off"
                          />
                          <s-password-field
                            name="apiToken"
                            label="New API token"
                            autocomplete="off"
                          />
                          <s-text-field
                            name="subdomain"
                            label="Subdomain"
                            autocomplete="off"
                          />
                        </>
                      )}
                      <s-button
                        type="submit"
                        {...(isSubmitting || !card.encryptionConfigured
                          ? { disabled: true }
                          : {})}
                      >
                        Reconnect
                      </s-button>
                    </s-stack>
                  </Form>
                </s-stack>
              )}

              {card.provider === "klaviyo" ? (
                <s-text color="subdued">
                  Syncs Review Published, Review Request Sent, and Review
                  Request Completed events. SMS support is reserved for a
                  later slice.
                </s-text>
              ) : (
                <s-text color="subdued">
                  Creates a Gorgias ticket when a review is published and posts
                  merchant replies to that ticket when available. Inbound
                  Gorgias reply sync is not enabled yet.
                </s-text>
              )}
            </s-stack>
          </s-box>
        ))}
      </s-stack>
    </s-page>
  );
}
