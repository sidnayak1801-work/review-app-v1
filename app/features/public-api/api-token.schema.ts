import { createHash, randomBytes } from "node:crypto";

import { z } from "zod";

export const API_TOKEN_PREFIX = "rvw_";
export const MAX_ACTIVE_API_TOKENS_PER_SHOP = 5;

export const createApiTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const revokeApiTokenSchema = z.object({
  tokenId: z.string().trim().min(1),
});

export const rotateApiTokenSchema = z.object({
  tokenId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80).optional(),
});

export function createApiTokenSecret(): {
  token: string;
  tokenPrefix: string;
  tokenHash: string;
} {
  const secret = randomBytes(32).toString("base64url");
  const token = `${API_TOKEN_PREFIX}${secret}`;
  return {
    token,
    tokenPrefix: secret.slice(0, 8),
    tokenHash: hashApiToken(token),
  };
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type CreateApiTokenInput = z.output<typeof createApiTokenSchema>;
export type RevokeApiTokenInput = z.output<typeof revokeApiTokenSchema>;
export type RotateApiTokenInput = z.output<typeof rotateApiTokenSchema>;
