import type { PrismaClient } from "@prisma/client";

import prisma from "../db.server";

export const DEFAULT_REVIEW_REQUEST_EMAIL_BODY = `
<p>Thanks for your recent purchase{{shop_name_suffix}}.</p>
<p>We would love to hear what you think about what you received.</p>
{{review_links}}
<p>Each link is unique to your order.</p>
`.trim();

export const DEFAULT_REMINDER_EMAIL_BODY = `
<p>Just a friendly reminder{{shop_name_suffix}}.</p>
<p>If you have a moment, please share a quick review of your purchase.</p>
{{review_links}}
`.trim();

export interface ReviewRequestSettingsRecord {
  id: string;
  shopId: string;
  requestDelayDays: number;
  domesticDelayDays: number;
  internationalDelayDays: number;
  homeCountryCode: string;
  emailSubject: string;
  emailBodyHtml: string;
  reminderEnabled: boolean;
  reminderDelayDays: number;
  reminderSubject: string;
  reminderBodyHtml: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UpsertReviewRequestSettingsInput = {
  shopId: string;
  requestDelayDays: number;
  domesticDelayDays: number;
  internationalDelayDays: number;
  homeCountryCode: string;
  emailSubject: string;
  emailBodyHtml: string;
  reminderEnabled: boolean;
  reminderDelayDays: number;
  reminderSubject: string;
  reminderBodyHtml: string;
};

export interface ReviewRequestSettingsRepository {
  findByShopId(shopId: string): Promise<ReviewRequestSettingsRecord | null>;
  upsert(
    input: UpsertReviewRequestSettingsInput,
  ): Promise<ReviewRequestSettingsRecord>;
}

const SETTINGS_SELECT = {
  id: true,
  shopId: true,
  requestDelayDays: true,
  domesticDelayDays: true,
  internationalDelayDays: true,
  homeCountryCode: true,
  emailSubject: true,
  emailBodyHtml: true,
  reminderEnabled: true,
  reminderDelayDays: true,
  reminderSubject: true,
  reminderBodyHtml: true,
  createdAt: true,
  updatedAt: true,
} as const;

type SettingsModel = {
  findUnique(args: {
    where: { shopId: string };
    select: typeof SETTINGS_SELECT;
  }): Promise<ReviewRequestSettingsRecord | null>;
  upsert(args: {
    where: { shopId: string };
    create: UpsertReviewRequestSettingsInput & {
      createdAt?: Date;
      updatedAt?: Date;
    };
    update: Omit<UpsertReviewRequestSettingsInput, "shopId"> & {
      updatedAt?: Date;
    };
    select: typeof SETTINGS_SELECT;
  }): Promise<ReviewRequestSettingsRecord>;
};

function settingsModel(database: PrismaClient): SettingsModel {
  return (
    database as unknown as { reviewRequestSettings: SettingsModel }
  ).reviewRequestSettings;
}

export function defaultReviewRequestSettings(
  shopId: string,
): UpsertReviewRequestSettingsInput {
  return {
    shopId,
    requestDelayDays: 3,
    domesticDelayDays: 3,
    internationalDelayDays: 3,
    homeCountryCode: "US",
    emailSubject: "How was your purchase?",
    emailBodyHtml: DEFAULT_REVIEW_REQUEST_EMAIL_BODY,
    reminderEnabled: true,
    reminderDelayDays: 7,
    reminderSubject: "Reminder: share your review",
    reminderBodyHtml: DEFAULT_REMINDER_EMAIL_BODY,
  };
}

export class PrismaReviewRequestSettingsRepository
  implements ReviewRequestSettingsRepository
{
  constructor(private readonly database: PrismaClient = prisma) {}

  async findByShopId(
    shopId: string,
  ): Promise<ReviewRequestSettingsRecord | null> {
    return settingsModel(this.database).findUnique({
      where: { shopId },
      select: SETTINGS_SELECT,
    });
  }

  async upsert(
    input: UpsertReviewRequestSettingsInput,
  ): Promise<ReviewRequestSettingsRecord> {
    const { shopId, ...update } = input;
    const now = new Date();
    return settingsModel(this.database).upsert({
      where: { shopId },
      create: { ...input, createdAt: now, updatedAt: now },
      update: { ...update, updatedAt: now },
      select: SETTINGS_SELECT,
    });
  }
}

export const reviewRequestSettingsRepository =
  new PrismaReviewRequestSettingsRepository();
