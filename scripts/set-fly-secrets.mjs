import { spawnSync } from "node:child_process";
import fs from "node:fs";

function parseEnvFile(path) {
  const values = {};
  if (!fs.existsSync(path)) {
    return values;
  }

  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    values[key] = value;
  }

  return values;
}

function parseShopifyEnvShow() {
  const result = spawnSync("shopify", ["app", "env", "show"], {
    encoding: "utf8",
    shell: true,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || "shopify app env show failed");
  }

  const values = {};
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.trim().match(/^(SHOPIFY_API_KEY|SHOPIFY_API_SECRET|SCOPES)=(.*)$/);
    if (match) {
      values[match[1]] = match[2].trim();
    }
  }
  return values;
}

const appUrl = process.argv[2];
if (!appUrl?.startsWith("https://")) {
  console.error("Usage: node scripts/set-fly-secrets.mjs <https://app.fly.dev>");
  process.exit(1);
}

const fileEnv = parseEnvFile(".env");
const shopifyEnv = parseShopifyEnvShow();

const required = {
  DATABASE_URL: fileEnv.DATABASE_URL || process.env.DATABASE_URL,
  DIRECT_URL: fileEnv.DIRECT_URL || process.env.DIRECT_URL,
  SHOPIFY_API_KEY: shopifyEnv.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET:
    shopifyEnv.SHOPIFY_API_SECRET || process.env.SHOPIFY_API_SECRET,
  SHOPIFY_APP_URL: appUrl,
  SCOPES: shopifyEnv.SCOPES || fileEnv.SCOPES || "read_orders",
  BILLING_TEST_MODE: fileEnv.BILLING_TEST_MODE || "true",
};

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error(`Missing required values: ${missing.join(", ")}`);
  process.exit(1);
}

const optional = {};
if (fileEnv.RESEND_API_KEY) {
  optional.RESEND_API_KEY = fileEnv.RESEND_API_KEY;
}
if (fileEnv.EMAIL_FROM) {
  optional.EMAIL_FROM = fileEnv.EMAIL_FROM;
}

const pairs = Object.entries({ ...required, ...optional }).map(
  ([key, value]) => `${key}=${value}`,
);

console.log(`Setting ${pairs.length} Fly secrets (values not printed)...`);
const result = spawnSync("flyctl", ["secrets", "set", ...pairs], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    Path: `${process.env.USERPROFILE}\\.fly\\bin;${process.env.Path}`,
  },
});

process.exit(result.status ?? 1);
