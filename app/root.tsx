import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

import { shopifyApiKey } from "./shopify.server";

export const loader = () => ({ apiKey: shopifyApiKey });

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <html
      lang="en"
      style={{
        height: "100%",
        overflowX: "hidden",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="shopify-api-key" content={apiKey} />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body
        style={{
          minHeight: "100%",
          height: "auto",
          margin: 0,
          overflowX: "hidden",
          paddingBottom: "2.5rem",
        }}
      >
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
