import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { DomainError } from "../lib/domain-error";

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface MediaStorage {
  putObject(input: PutObjectInput): Promise<{ url: string; key: string }>;
  isConfigured(): boolean;
  readObject?(key: string): Promise<{ body: Buffer; contentType: string } | null>;
}

interface R2Config {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  region: string;
}

const LOCAL_MEDIA_ROOT = path.join(process.cwd(), "storage", "media");

function readR2Config(
  environment: NodeJS.ProcessEnv = process.env,
): R2Config | null {
  const bucket = environment.MEDIA_S3_BUCKET?.trim();
  const endpoint = environment.MEDIA_S3_ENDPOINT?.trim();
  const accessKeyId = environment.MEDIA_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = environment.MEDIA_S3_SECRET_ACCESS_KEY?.trim();
  const publicBaseUrl = environment.MEDIA_PUBLIC_BASE_URL?.trim();

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    return null;
  }

  return {
    bucket,
    endpoint: endpoint.replace(/\/$/, ""),
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicBaseUrl.replace(/\/$/, ""),
    region: environment.MEDIA_S3_REGION?.trim() || "auto",
  };
}

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function signingKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function contentTypeFromKey(key: string): string {
  const ext = path.extname(key).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    default:
      return "application/octet-stream";
  }
}

/** Local disk fallback for development when R2 is not configured. */
export class LocalDiskMediaStorage implements MediaStorage {
  constructor(private readonly rootDir: string = LOCAL_MEDIA_ROOT) {}

  isConfigured(): boolean {
    return true;
  }

  private resolvePath(key: string): string {
    const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
    if (
      normalized.includes("..") ||
      path.isAbsolute(normalized) ||
      normalized.length === 0
    ) {
      throw new DomainError("Invalid media key.", "MEDIA_INVALID_KEY");
    }
    return path.join(this.rootDir, normalized);
  }

  async putObject(input: PutObjectInput): Promise<{ url: string; key: string }> {
    const filePath = this.resolvePath(input.key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.body);
    return {
      key: input.key,
      // Path-only so tunnel host changes do not break stored rows.
      url: `/api/media/${input.key}`,
    };
  }

  async readObject(
    key: string,
  ): Promise<{ body: Buffer; contentType: string } | null> {
    try {
      const filePath = this.resolvePath(key);
      const body = await readFile(filePath);
      return {
        body,
        contentType: contentTypeFromKey(key),
      };
    } catch {
      return null;
    }
  }
}

/** Minimal S3 PutObject (R2-compatible) without the AWS SDK. */
export class R2MediaStorage implements MediaStorage {
  constructor(private readonly config: R2Config) {}

  isConfigured(): boolean {
    return true;
  }

  async putObject(input: PutObjectInput): Promise<{ url: string; key: string }> {
    const { bucket, endpoint, accessKeyId, secretAccessKey, publicBaseUrl, region } =
      this.config;
    const url = new URL(`${endpoint}/${bucket}/${input.key}`);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(input.body);
    const canonicalHeaders =
      `content-type:${input.contentType}\n` +
      `host:${url.host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = [
      "PUT",
      url.pathname,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join("\n");
    const signature = hmac(
      signingKey(secretAccessKey, dateStamp, region, "s3"),
      stringToSign,
    ).toString("hex");
    const authorization =
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "content-type": input.contentType,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        authorization,
      },
      body: new Uint8Array(input.body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new DomainError(
        `Media storage upload failed (${response.status}). ${detail}`.trim(),
        "MEDIA_UPLOAD_FAILED",
      );
    }

    return {
      key: input.key,
      url: `${publicBaseUrl}/${input.key}`,
    };
  }
}

export function createMediaStorage(
  environment: NodeJS.ProcessEnv = process.env,
): MediaStorage {
  const config = readR2Config(environment);
  if (config) {
    return new R2MediaStorage(config);
  }
  return new LocalDiskMediaStorage();
}

export const mediaStorage = createMediaStorage();

export function getLocalMediaRoot(): string {
  return LOCAL_MEDIA_ROOT;
}
