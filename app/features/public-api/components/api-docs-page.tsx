import { Form, useFetcher } from "react-router";
import { useState } from "react";

import type { ApiTokenPublicView } from "../api-token.service.server";

export interface ApiDocsActionData {
  ok: boolean;
  message: string;
  issues?: readonly string[];
  secret?: string;
  token?: ApiTokenPublicView;
}

interface ApiDocsPageProps {
  tokens: ApiTokenPublicView[];
  appOrigin: string;
  actionData?: ApiDocsActionData;
  isSubmitting: boolean;
}

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/reviews",
    description: "List approved reviews (optional productId, cursor, limit)",
  },
  {
    method: "POST",
    path: "/api/v1/reviews",
    description: "Submit a review (created as PENDING)",
  },
  {
    method: "GET",
    path: "/api/v1/reviews/summary",
    description: "Approved count, average rating, and rating distribution",
  },
  {
    method: "GET",
    path: "/api/v1/rating",
    description: "Average rating and approved count",
  },
  {
    method: "GET",
    path: "/api/v1/products/:productId/reviews",
    description: "Approved reviews for one product",
  },
] as const;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <s-button
      variant="secondary"
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied" : label}
    </s-button>
  );
}

export function ApiDocsPage({
  tokens,
  appOrigin,
  actionData,
  isSubmitting,
}: ApiDocsPageProps) {
  const activeTokens = tokens.filter((token) => token.active);
  const revokedTokens = tokens.filter((token) => !token.active);
  const authExample = `Authorization: Bearer rvw_…`;

  return (
    <s-page heading="API">
      <s-stack direction="block" gap="large">
        <s-text color="subdued">
          Server-to-server REST API for reading and submitting reviews. Authenticate
          with a Bearer token. Tokens are shown once at creation — store them
          securely.
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

        {actionData?.ok && actionData.secret ? (
          <s-banner tone="warning" heading="Copy your token now">
            <s-stack direction="block" gap="base">
              <s-text>
                This secret will not be shown again. Treat it like a password.
              </s-text>
              <s-box padding="base" background="subdued" borderRadius="base">
                <s-text>
                  <code>{actionData.secret}</code>
                </s-text>
              </s-box>
              <CopyButton value={actionData.secret} label="Copy token" />
            </s-stack>
          </s-banner>
        ) : null}

        <s-box
          padding="base"
          border="base"
          borderRadius="large"
          background="base"
        >
          <s-stack direction="block" gap="base">
            <s-heading>Documentation</s-heading>
            <s-text>
              Base URL: <code>{appOrigin}</code>
            </s-text>
            <s-text>
              Auth: <code>{authExample}</code>
            </s-text>
            <s-text color="subdued">
              Errors use{" "}
              <code>{`{ "error": { "code": "…", "message": "…" } }`}</code>.
              Rate-limit headers:{" "}
              <code>X-RateLimit-Limit</code>,{" "}
              <code>X-RateLimit-Remaining</code>,{" "}
              <code>X-RateLimit-Reset</code>.
            </s-text>
            <s-stack direction="block" gap="small">
              {ENDPOINTS.map((endpoint) => (
                <s-box
                  key={`${endpoint.method}-${endpoint.path}`}
                  padding="small"
                  border="base"
                  borderRadius="base"
                >
                  <s-stack direction="block" gap="small">
                    <s-text>
                      <code>
                        {endpoint.method} {endpoint.path}
                      </code>
                    </s-text>
                    <s-text color="subdued">{endpoint.description}</s-text>
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          </s-stack>
        </s-box>

        <s-box
          padding="base"
          border="base"
          borderRadius="large"
          background="base"
        >
          <s-stack direction="block" gap="base">
            <s-heading>Generate token</s-heading>
            <Form method="post">
              <input type="hidden" name="intent" value="create" />
              <s-stack direction="block" gap="base">
                <s-text-field
                  label="Token name"
                  name="name"
                  placeholder="Production backend"
                  required
                  autoComplete="off"
                />
                <s-button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                >
                  Generate token
                </s-button>
              </s-stack>
            </Form>
            <s-text color="subdued">
              Up to 5 active tokens per shop. Use Rotate to replace a token
              without downtime.
            </s-text>
          </s-stack>
        </s-box>

        <s-box
          padding="base"
          border="base"
          borderRadius="large"
          background="base"
        >
          <s-stack direction="block" gap="base">
            <s-heading>Active tokens ({activeTokens.length})</s-heading>
            {activeTokens.length === 0 ? (
              <s-text color="subdued">No active tokens yet.</s-text>
            ) : (
              activeTokens.map((token) => (
                <TokenRow
                  key={token.id}
                  token={token}
                  isSubmitting={isSubmitting}
                />
              ))
            )}
          </s-stack>
        </s-box>

        {revokedTokens.length > 0 ? (
          <s-box
            padding="base"
            border="base"
            borderRadius="large"
            background="base"
          >
            <s-stack direction="block" gap="base">
              <s-heading>Revoked tokens</s-heading>
              {revokedTokens.map((token) => (
                <s-box
                  key={token.id}
                  padding="small"
                  border="base"
                  borderRadius="base"
                >
                  <s-stack direction="block" gap="small">
                    <s-text>
                      {token.name} · <code>rvw_{token.tokenPrefix}…</code>
                    </s-text>
                    <s-text color="subdued">
                      Revoked{" "}
                      {token.revokedAt
                        ? new Date(token.revokedAt).toLocaleString()
                        : "—"}
                    </s-text>
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          </s-box>
        ) : null}
      </s-stack>
    </s-page>
  );
}

function TokenRow({
  token,
  isSubmitting,
}: {
  token: ApiTokenPublicView;
  isSubmitting: boolean;
}) {
  const rotateFetcher = useFetcher<ApiDocsActionData>();
  const revokeFetcher = useFetcher<ApiDocsActionData>();

  return (
    <s-box padding="small" border="base" borderRadius="base">
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-text>
            <strong>{token.name}</strong>
          </s-text>
          <s-badge tone="success">Active</s-badge>
        </s-stack>
        <s-text color="subdued">
          Prefix: <code>rvw_{token.tokenPrefix}…</code>
        </s-text>
        <s-text color="subdued">
          Created {new Date(token.createdAt).toLocaleString()}
          {token.lastUsedAt
            ? ` · Last used ${new Date(token.lastUsedAt).toLocaleString()}`
            : " · Never used"}
        </s-text>
        <s-stack direction="inline" gap="base">
          <rotateFetcher.Form method="post">
            <input type="hidden" name="intent" value="rotate" />
            <input type="hidden" name="tokenId" value={token.id} />
            <s-button
              type="submit"
              variant="secondary"
              disabled={isSubmitting || rotateFetcher.state !== "idle"}
            >
              Rotate
            </s-button>
          </rotateFetcher.Form>
          <revokeFetcher.Form method="post">
            <input type="hidden" name="intent" value="revoke" />
            <input type="hidden" name="tokenId" value={token.id} />
            <s-button
              type="submit"
              tone="critical"
              variant="secondary"
              disabled={isSubmitting || revokeFetcher.state !== "idle"}
            >
              Revoke
            </s-button>
          </revokeFetcher.Form>
        </s-stack>
        {rotateFetcher.data?.ok && rotateFetcher.data.secret ? (
          <s-banner tone="warning" heading="New token secret">
            <s-stack direction="block" gap="base">
              <s-box padding="base" background="subdued" borderRadius="base">
                <s-text>
                  <code>{rotateFetcher.data.secret}</code>
                </s-text>
              </s-box>
              <CopyButton
                value={rotateFetcher.data.secret}
                label="Copy token"
              />
            </s-stack>
          </s-banner>
        ) : null}
        {rotateFetcher.data && !rotateFetcher.data.ok ? (
          <s-text tone="critical">{rotateFetcher.data.message}</s-text>
        ) : null}
        {revokeFetcher.data && !revokeFetcher.data.ok ? (
          <s-text tone="critical">{revokeFetcher.data.message}</s-text>
        ) : null}
      </s-stack>
    </s-box>
  );
}
