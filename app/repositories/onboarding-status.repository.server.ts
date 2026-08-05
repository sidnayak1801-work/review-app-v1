import type { PrismaClient } from "@prisma/client";

import prisma from "../db.server";

export interface OnboardingStatusRecord {
  id: string;
  shopId: string;
  themeEnabled: boolean;
  widgetAdded: boolean;
  reviewsImported: boolean;
  emailConfigured: boolean;
  completed: boolean;
  skipped: boolean;
  currentStep: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type OnboardingStepFlags = Partial<
  Pick<
    OnboardingStatusRecord,
    | "themeEnabled"
    | "widgetAdded"
    | "reviewsImported"
    | "emailConfigured"
    | "currentStep"
  >
>;

const SELECT = {
  id: true,
  shopId: true,
  themeEnabled: true,
  widgetAdded: true,
  reviewsImported: true,
  emailConfigured: true,
  completed: true,
  skipped: true,
  currentStep: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface OnboardingStatusRepository {
  findByShopId(shopId: string): Promise<OnboardingStatusRecord | null>;
  ensureForShop(shopId: string): Promise<OnboardingStatusRecord>;
  update(
    shopId: string,
    data: OnboardingStepFlags & {
      completed?: boolean;
      skipped?: boolean;
      completedAt?: Date | null;
    },
  ): Promise<OnboardingStatusRecord>;
}

type OnboardingModel = {
  findUnique(args: {
    where: { shopId: string };
    select: typeof SELECT;
  }): Promise<OnboardingStatusRecord | null>;
  create(args: {
    data: { shopId: string };
    select: typeof SELECT;
  }): Promise<OnboardingStatusRecord>;
  update(args: {
    where: { shopId: string };
    data: Record<string, unknown>;
    select: typeof SELECT;
  }): Promise<OnboardingStatusRecord>;
};

function model(database: PrismaClient): OnboardingModel {
  return (
    database as unknown as { onboardingStatus: OnboardingModel }
  ).onboardingStatus;
}

export class PrismaOnboardingStatusRepository
  implements OnboardingStatusRepository
{
  constructor(private readonly db: PrismaClient = prisma) {}

  async findByShopId(shopId: string): Promise<OnboardingStatusRecord | null> {
    return model(this.db).findUnique({
      where: { shopId },
      select: SELECT,
    });
  }

  async ensureForShop(shopId: string): Promise<OnboardingStatusRecord> {
    const existing = await this.findByShopId(shopId);
    if (existing) {
      return existing;
    }

    return model(this.db).create({
      data: { shopId },
      select: SELECT,
    });
  }

  async update(
    shopId: string,
    data: OnboardingStepFlags & {
      completed?: boolean;
      skipped?: boolean;
      completedAt?: Date | null;
    },
  ): Promise<OnboardingStatusRecord> {
    await this.ensureForShop(shopId);
    return model(this.db).update({
      where: { shopId },
      data,
      select: SELECT,
    });
  }
}

export const onboardingStatusRepository =
  new PrismaOnboardingStatusRepository();
