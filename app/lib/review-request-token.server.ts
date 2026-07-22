import { createHash, randomBytes } from "node:crypto";

export function createSubmissionToken(): {
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSubmissionToken(token);

  return { token, tokenHash };
}

export function hashSubmissionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
