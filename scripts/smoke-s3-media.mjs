/**
 * One-off S3 smoke: put + public GET + delete using app MediaStorage.
 * Does not print secrets.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) {
      process.env[m[1]] = v;
    }
  }
}

loadEnvFile(path.join(process.cwd(), ".env"));

const required = [
  "MEDIA_S3_BUCKET",
  "MEDIA_S3_ENDPOINT",
  "MEDIA_S3_ACCESS_KEY_ID",
  "MEDIA_S3_SECRET_ACCESS_KEY",
  "MEDIA_PUBLIC_BASE_URL",
  "MEDIA_S3_REGION",
];

const missing = required.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  console.error("Missing env:", missing.join(", "));
  process.exit(1);
}

const { createMediaStorage } = await import(
  pathToFileURL(
    path.join(process.cwd(), "app/services/media-storage.server.ts"),
  ).href
);

const storage = createMediaStorage();
if (!storage.isConfigured()) {
  console.error("MediaStorage is not in S3 mode (config incomplete).");
  process.exit(1);
}

const key = `shops/smoke-test/reviews/smoke-${Date.now()}.txt`;
const body = Buffer.from(`reviewx-s3-smoke ${new Date().toISOString()}\n`);

const put = await storage.putObject({
  key,
  body,
  contentType: "text/plain",
});

const publicUrl = `${process.env.MEDIA_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
let publicStatus = 0;
try {
  const res = await fetch(publicUrl, { method: "GET" });
  publicStatus = res.status;
} catch {
  publicStatus = -1;
}

await storage.deleteObject(key);

console.log(
  JSON.stringify(
    {
      mode: "s3",
      putOk: Boolean(put?.key),
      key,
      publicUrlHost: new URL(publicUrl).host,
      publicGetStatus: publicStatus,
      publicReadable: publicStatus === 200,
      cleanedUp: true,
      note:
        publicStatus === 200
          ? "Public read OK for MEDIA_PUBLIC_BASE_URL"
          : "Upload/delete OK but object not publicly readable — enable bucket public read on shops/* or use CloudFront",
    },
    null,
    2,
  ),
);

process.exit(publicStatus === 200 ? 0 : 2);
