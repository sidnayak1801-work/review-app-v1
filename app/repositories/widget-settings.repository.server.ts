import type { PrismaClient } from "@prisma/client";

import prisma from "../db.server";

export interface WidgetSettingsRecord {
  id: string;
  shopId: string;
  accentColor: string;
  showReviewForm: boolean;
  reviewsPerPage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertWidgetSettingsInput {
  shopId: string;
  accentColor: string;
  showReviewForm: boolean;
  reviewsPerPage: number;
}

export interface WidgetSettingsRepository {
  findByShopId(shopId: string): Promise<WidgetSettingsRecord | null>;
  upsert(input: UpsertWidgetSettingsInput): Promise<WidgetSettingsRecord>;
}

const WIDGET_SELECT = {
  id: true,
  shopId: true,
  accentColor: true,
  showReviewForm: true,
  reviewsPerPage: true,
  createdAt: true,
  updatedAt: true,
} as const;

type WidgetSettingsModel = {
  findUnique(args: {
    where: { shopId: string };
    select: typeof WIDGET_SELECT;
  }): Promise<WidgetSettingsRecord | null>;
  upsert(args: {
    where: { shopId: string };
    create: UpsertWidgetSettingsInput;
    update: Omit<UpsertWidgetSettingsInput, "shopId">;
    select: typeof WIDGET_SELECT;
  }): Promise<WidgetSettingsRecord>;
};

function widgetSettingsModel(database: PrismaClient): WidgetSettingsModel {
  return (
    database as unknown as { widgetSettings: WidgetSettingsModel }
  ).widgetSettings;
}

export class PrismaWidgetSettingsRepository
  implements WidgetSettingsRepository
{
  constructor(private readonly database: PrismaClient = prisma) {}

  async findByShopId(shopId: string): Promise<WidgetSettingsRecord | null> {
    return widgetSettingsModel(this.database).findUnique({
      where: { shopId },
      select: WIDGET_SELECT,
    });
  }

  async upsert(
    input: UpsertWidgetSettingsInput,
  ): Promise<WidgetSettingsRecord> {
    return widgetSettingsModel(this.database).upsert({
      where: { shopId: input.shopId },
      create: input,
      update: {
        accentColor: input.accentColor,
        showReviewForm: input.showReviewForm,
        reviewsPerPage: input.reviewsPerPage,
      },
      select: WIDGET_SELECT,
    });
  }
}

export const widgetSettingsRepository = new PrismaWidgetSettingsRepository();

export const DEFAULT_WIDGET_SETTINGS = {
  accentColor: "#111111",
  showReviewForm: true,
  reviewsPerPage: 5,
} as const;
