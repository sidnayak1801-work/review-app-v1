/**
 * Best-effort Theme App Extension / app-block detection via Admin GraphQL.
 * Requires `read_themes`. Failures return false without throwing.
 * When `themeId` is set, inspect that theme; otherwise fall back to MAIN.
 */
export async function detectThemeExtensionEnabled(
  admin: {
    graphql: (
      query: string,
      options?: { variables?: Record<string, unknown> },
    ) => Promise<Response>;
  },
  themeId?: string | null,
): Promise<boolean> {
  const query = themeId
    ? `#graphql
    query OnboardingAppEmbedByTheme($id: ID!) {
      theme(id: $id) {
        files(filenames: ["config/settings_data.json"], first: 1) {
          nodes {
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
            }
          }
        }
      }
    }
  `
    : `#graphql
    query OnboardingAppEmbed {
      themes(first: 1, roles: [MAIN]) {
        nodes {
          files(filenames: ["config/settings_data.json"], first: 1) {
            nodes {
              body {
                ... on OnlineStoreThemeFileBodyText {
                  content
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(
      query,
      themeId ? { variables: { id: themeId } } : undefined,
    );
    const payload = (await response.json()) as {
      data?: {
        theme?: {
          files?: {
            nodes?: Array<{ body?: { content?: string } }>;
          };
        };
        themes?: {
          nodes?: Array<{
            files?: {
              nodes?: Array<{ body?: { content?: string } }>;
            };
          }>;
        };
      };
      errors?: unknown[];
    };

    if (payload.errors?.length) {
      return false;
    }

    const content =
      (themeId
        ? payload.data?.theme?.files?.nodes?.[0]?.body?.content
        : payload.data?.themes?.nodes?.[0]?.files?.nodes?.[0]?.body?.content) ??
      "";
    const lower = content.toLowerCase();

    // App embeds appear under blocks with the extension handle / type.
    return (
      lower.includes("review-widget") ||
      lower.includes("review_widget") ||
      lower.includes("app-embed") ||
      (lower.includes('"disabled":false') && lower.includes("review"))
    );
  } catch {
    return false;
  }
}

/**
 * Detect shipped ReviewTrix app blocks in product (or index) JSON templates.
 */
export async function detectWidgetBlocksPresent(
  admin: {
    graphql: (
      query: string,
      options?: { variables?: Record<string, unknown> },
    ) => Promise<Response>;
  },
  themeId?: string | null,
): Promise<boolean> {
  const query = themeId
    ? `#graphql
    query OnboardingThemeFilesById($id: ID!) {
      theme(id: $id) {
        files(filenames: ["templates/product.json", "templates/index.json"], first: 5) {
          nodes {
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
            }
          }
        }
      }
    }
  `
    : `#graphql
    query OnboardingMainThemeFiles {
      themes(first: 1, roles: [MAIN]) {
        nodes {
          files(filenames: ["templates/product.json", "templates/index.json"], first: 5) {
            nodes {
              body {
                ... on OnlineStoreThemeFileBodyText {
                  content
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(
      query,
      themeId ? { variables: { id: themeId } } : undefined,
    );
    const payload = (await response.json()) as {
      data?: {
        theme?: {
          files?: {
            nodes?: Array<{ body?: { content?: string } }>;
          };
        };
        themes?: {
          nodes?: Array<{
            files?: {
              nodes?: Array<{ body?: { content?: string } }>;
            };
          }>;
        };
      };
      errors?: unknown[];
    };

    if (payload.errors?.length) {
      return false;
    }

    const files = themeId
      ? (payload.data?.theme?.files?.nodes ?? [])
      : (payload.data?.themes?.nodes?.[0]?.files?.nodes ?? []);
    const blob = files
      .map((file) => file.body?.content ?? "")
      .join("\n")
      .toLowerCase();

    return (
      blob.includes("star-rating") ||
      blob.includes("review-list") ||
      blob.includes("review-summary") ||
      blob.includes("review-widget")
    );
  } catch {
    return false;
  }
}
