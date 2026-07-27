import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { DomainError } from "./domain-error";

const KEY_VERSION = 1;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function resolveKeyBytes(
  environment: NodeJS.ProcessEnv = process.env,
): Buffer {
  const raw = environment.INTEGRATIONS_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new DomainError(
      "INTEGRATIONS_ENCRYPTION_KEY is not configured.",
      "INTEGRATIONS_ENCRYPTION_UNAVAILABLE",
    );
  }

  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }

  if (key.length !== 32) {
    throw new DomainError(
      "INTEGRATIONS_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64).",
      "INTEGRATIONS_ENCRYPTION_INVALID",
    );
  }

  return key;
}

export function getIntegrationsKeyVersion(): number {
  return KEY_VERSION;
}

export function encryptIntegrationCredentials(
  plaintextJson: string,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const key = resolveKeyBytes(environment);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintextJson, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptIntegrationCredentials(
  ciphertextBase64: string,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const key = resolveKeyBytes(environment);
  const payload = Buffer.from(ciphertextBase64, "base64");

  if (payload.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new DomainError(
      "Stored integration credentials are corrupt.",
      "INTEGRATIONS_CREDENTIALS_CORRUPT",
    );
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

export function isIntegrationsEncryptionConfigured(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  try {
    resolveKeyBytes(environment);
    return true;
  } catch {
    return false;
  }
}
