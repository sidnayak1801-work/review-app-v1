import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { DomainError } from "../lib/domain-error";

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface MediaStorage {
  putObject(input: PutObjectInput): Promise<{ url: string; key: string }>;
  deleteObject(key: string): Promise<void>;
  isConfigured(): boolean;
  readObject?(key: string): Promise<{ body: Buffer; contentType: string } | null>;
}

interface S3CompatibleConfig {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  region: string;
}

const LOCAL_MEDIA_ROOT = path.join(process.cwd(), "storage", "media");
const EMPTY_PAYLOAD_HASH = sha256Hex("");

function readS3Config(
  environment: NodeJS.ProcessEnv = process.env,
): S3CompatibleConfig | null {
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

function assertSafeKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    normalized.includes("..") ||
    path.isAbsolute(normalized) ||
    normalized.length === 0
  ) {
    throw new DomainError("Invalid media key.", "MEDIA_INVALID_KEY");
  }
  return normalized;
}

/** Local disk fallback for development when MEDIA_* S3 config is incomplete. */
export class LocalDiskMediaStorage implements MediaStorage {
  constructor(private readonly rootDir: string = LOCAL_MEDIA_ROOT) {}

  isConfigured(): boolean {
    return true;
  }

  private resolvePath(key: string): string {
    return path.join(this.rootDir, assertSafeKey(key));
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

  async deleteObject(key: string): Promise<void> {
    try {
      await unlink(this.resolvePath(key));
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: unknown }).code)
          : "";
      if (code === "ENOENT") {
        return;
      }
      throw error;
    }
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

/**
 * S3-compatible PutObject / DeleteObject (SigV4) without the AWS SDK.
 * Targets AWS S3; also works with Cloudflare R2 and other S3 APIs.
 */
export class S3MediaStorage implements MediaStorage {
  constructor(private readonly config: S3CompatibleConfig) {}

  isConfigured(): boolean {
    return true;
  }

  private objectUrl(key: string): URL {
    const safeKey = assertSafeKey(key);
    return new URL(`${this.config.endpoint}/${this.config.bucket}/${safeKey}`);
  }

  private async signedFetch(
    method: "PUT" | "DELETE",
    key: string,
    options: {
      body?: Buffer;
      contentType?: string;
      payloadHash: string;
    },
  ): Promise<Response> {
    const { accessKeyId, secretAccessKey, region } = this.config;
    const url = this.objectUrl(key);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = options.payloadHash;

    const headerLines = [
      ...(options.contentType ? [`content-type:${options.contentType}`] : []),
      `host:${url.host}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
    ];
    const signedHeaderNames = [
      ...(options.contentType ? ["content-type"] : []),
      "host",
      "x-amz-content-sha256",
      "x-amz-date",
    ];
    const canonicalHeaders = `${headerLines.join("\n")}\n`;
    const signedHeaders = signedHeaderNames.join(";");
    const canonicalRequest = [
      method,
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

    const headers: Record<string, string> = {
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      authorization,
    };
    if (options.contentType) {
      headers["content-type"] = options.contentType;
    }

    return fetch(url, {
      method,
      headers,
      body: options.body ? new Uint8Array(options.body) : undefined,
    });
  }

  async putObject(input: PutObjectInput): Promise<{ url: string; key: string }> {
    const payloadHash = sha256Hex(input.body);
    const response = await this.signedFetch("PUT", input.key, {
      body: input.body,
      contentType: input.contentType,
      payloadHash,
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
      url: `${this.config.publicBaseUrl}/${assertSafeKey(input.key)}`,
    };
  }

  async deleteObject(key: string): Promise<void> {
    const response = await this.signedFetch("DELETE", key, {
      payloadHash: EMPTY_PAYLOAD_HASH,
    });

    // 404: already gone — treat as success for rollback/cleanup.
    if (response.ok || response.status === 404) {
      return;
    }

    const detail = await response.text().catch(() => "");
    throw new DomainError(
      `Media storage delete failed (${response.status}). ${detail}`.trim(),
      "MEDIA_DELETE_FAILED",
    );
  }
}

export function createMediaStorage(
  environment: NodeJS.ProcessEnv = process.env,
): MediaStorage {
  const config = readS3Config(environment);
  if (config) {
    return new S3MediaStorage(config);
  }
  return new LocalDiskMediaStorage();
}

export const mediaStorage = createMediaStorage();

export function getLocalMediaRoot(): string {
  return LOCAL_MEDIA_ROOT;
}
