import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "imports");

async function ensureShopDirectory(shopId: string): Promise<string> {
  const directory = path.join(STORAGE_ROOT, shopId);
  await mkdir(directory, { recursive: true });
  return directory;
}

export function hashImportContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function saveImportFile(input: {
  shopId: string;
  importId: string;
  content: Buffer;
}): Promise<string> {
  const directory = await ensureShopDirectory(input.shopId);
  const fileName = `${input.importId}.csv`;
  const absolutePath = path.join(directory, fileName);
  await writeFile(absolutePath, input.content);

  return path.posix.join(input.shopId, fileName);
}

export async function saveImportErrorReport(input: {
  shopId: string;
  importId: string;
  content: string;
}): Promise<string> {
  const directory = await ensureShopDirectory(input.shopId);
  const fileName = `${input.importId}-errors.csv`;
  const absolutePath = path.join(directory, fileName);
  await writeFile(absolutePath, input.content, "utf8");

  return path.posix.join(input.shopId, fileName);
}

export async function readStoredImportFile(fileKey: string): Promise<Buffer> {
  const absolutePath = path.join(STORAGE_ROOT, fileKey);
  return readFile(absolutePath);
}
