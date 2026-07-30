import type { PrismaClient } from "@prisma/client";

import prisma from "../db.server";

export interface UninstallFeedbackRecord {
  id: string;
  shopId: string;
  reasons: string[];
  details: string | null;
  createdAt: Date;
}

export type CreateUninstallFeedbackInput = {
  shopId: string;
  reasons: string[];
  details: string | null;
};

const FEEDBACK_SELECT = {
  id: true,
  shopId: true,
  reasons: true,
  details: true,
  createdAt: true,
} as const;

function feedbackModel(database: PrismaClient) {
  // Model available after `prisma generate` + migration apply.
  return (
    database as PrismaClient & {
      uninstallFeedback: {
        create: (args: {
          data: CreateUninstallFeedbackInput;
          select: typeof FEEDBACK_SELECT;
        }) => Promise<UninstallFeedbackRecord>;
      };
    }
  ).uninstallFeedback;
}

export class UninstallFeedbackRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async create(
    input: CreateUninstallFeedbackInput,
  ): Promise<UninstallFeedbackRecord> {
    return feedbackModel(this.db).create({
      data: {
        shopId: input.shopId,
        reasons: input.reasons,
        details: input.details,
      },
      select: FEEDBACK_SELECT,
    });
  }
}

export const uninstallFeedbackRepository = new UninstallFeedbackRepository();
