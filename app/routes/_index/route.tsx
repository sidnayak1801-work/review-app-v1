import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "react-router";
import { redirect, useLoaderData } from "react-router";

import { MarketingLanding } from "../../features/marketing/marketing-landing";
import { login } from "../../shopify.server";
import marketingStyles from "../../styles/marketing.css?url";

export const meta: MetaFunction = () => [
  { title: "ReviewX — Product reviews that convert" },
  {
    name: "description",
    content:
      "ReviewX helps Shopify merchants collect, moderate, and display product reviews that build trust and lift conversions. Install free on Shopify.",
  },
  { property: "og:title", content: "ReviewX — Product reviews that convert" },
  {
    property: "og:description",
    content:
      "Collect authentic reviews, moderate in minutes, and show social proof on your Shopify storefront.",
  },
];

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: marketingStyles },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function LandingPage() {
  const { showForm } = useLoaderData<typeof loader>();

  return <MarketingLanding showForm={showForm} />;
}
