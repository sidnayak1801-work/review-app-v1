import { AppProvider } from "@shopify/shopify-app-react-router/react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

const APP_STORE_URL = "https://apps.shopify.com/reviewtrix";

/**
 * Keep login() so ?shop= still starts OAuth. Never collect a shop domain —
 * App Store install must use Shopify-owned surfaces (requirement 2.3.1).
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export default function Auth() {
  const { errors } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded={false}>
      <s-page>
        <s-section heading="Install ReviewTrix">
          <s-stack direction="block" gap="base">
            <s-text>
              Install ReviewTrix from the Shopify App Store or open it from
              Shopify Admin → Apps. Do not enter a shop domain here.
            </s-text>
            {errors.shop ? (
              <s-banner tone="critical" heading="Could not start login">
                {errors.shop}
              </s-banner>
            ) : null}
            <s-link href={APP_STORE_URL} target="_blank">
              Open ReviewTrix on the Shopify App Store
            </s-link>
          </s-stack>
        </s-section>
      </s-page>
    </AppProvider>
  );
}
