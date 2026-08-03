import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

/**
 * App root: no marketing landing. Install traffic comes from the separate
 * Next.js marketing site → Shopify App Store. Preserve shop→/app handshake.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  throw redirect("/auth/login");
};
