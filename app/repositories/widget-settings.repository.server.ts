import type { PrismaClient } from "@prisma/client";

import prisma from "../db.server";

export type WidgetLayout = "STACKED" | "COMPACT" | "GRID";

export interface WidgetSettingsRecord {
  id: string;
  shopId: string;
  widgetEnabled: boolean;
  accentColor: string;
  primaryButtonColor: string;
  starColor: string;
  borderRadius: number;
  cardShadow: boolean;
  layout: WidgetLayout;
  showCustomerName: boolean;
  showReviewDate: boolean;
  showProductImages: boolean;
  showCustomerPhotos: boolean;
  autoPublishReviews: boolean;
  darkMode: boolean;
  showReviewForm: boolean;
  reviewsPerPage: number;
  createdAt: Date;
  updatedAt: Date;
}

export type UpsertWidgetSettingsInput = Omit<
  WidgetSettingsRecord,
  "id" | "createdAt" | "updatedAt"
> & { shopId: string };

export interface WidgetSettingsRepository {
  findByShopId(shopId: string): Promise<WidgetSettingsRecord | null>;
  upsert(input: UpsertWidgetSettingsInput): Promise<WidgetSettingsRecord>;
}

const WIDGET_SELECT = {
  id: true,
  shopId: true,
  widgetEnabled: true,
  accentColor: true,
  primaryButtonColor: true,
  starColor: true,
  borderRadius: true,
  cardShadow: true,
  layout: true,
  showCustomerName: true,
  showReviewDate: true,
  showProductImages: true,
  showCustomerPhotos: true,
  autoPublishReviews: true,
  darkMode: true,
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
    const { shopId, ...update } = input;
    return widgetSettingsModel(this.database).upsert({
      where: { shopId },
      create: input,
      update,
      select: WIDGET_SELECT,
    });
  }
}

export const widgetSettingsRepository = new PrismaWidgetSettingsRepository();

export const DEFAULT_WIDGET_SETTINGS = {
  widgetEnabled: true,
  accentColor: "#111111",
  primaryButtonColor: "#111111",
  starColor: "#22c55e",
  borderRadius: 8,
  cardShadow: true,
  layout: "STACKED" as WidgetLayout,
  showCustomerName: true,
  showReviewDate: true,
  showProductImages: false,
  showCustomerPhotos: true,
  autoPublishReviews: false,
  darkMode: false,
  showReviewForm: true,
  reviewsPerPage: 5,
} as const;
