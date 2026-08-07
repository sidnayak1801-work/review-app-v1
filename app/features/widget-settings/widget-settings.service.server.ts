import { parseWithSchema } from "../../lib/validation";
import {
  DEFAULT_WIDGET_SETTINGS,
  widgetSettingsRepository,
  type WidgetSettingsRecord,
  type WidgetSettingsRepository,
} from "../../repositories/widget-settings.repository.server";
import { logger } from "../../services/logger.server";
import { widgetSettingsSchema } from "./widget-settings.schema";

function isUniqueConstraintError(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return true;
  }

  return error instanceof Error && error.message.includes("Unique constraint");
}

export class WidgetSettingsService {
  constructor(private readonly settings: WidgetSettingsRepository) {}

  async getForShop(shopId: string): Promise<WidgetSettingsRecord> {
    const existing = await this.settings.findByShopId(shopId);

    if (existing) {
      return existing;
    }

    try {
      return await this.settings.upsert({
        shopId,
        ...DEFAULT_WIDGET_SETTINGS,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const raced = await this.settings.findByShopId(shopId);
        if (raced) {
          return raced;
        }
      }

      logger.error("widget_settings_ensure_failed", { shopId }, error);
      throw error;
    }
  }

  async updateForShop(
    shopId: string,
    input: unknown,
  ): Promise<WidgetSettingsRecord> {
    const data = parseWithSchema(
      widgetSettingsSchema,
      input,
      "Invalid widget settings",
    );

    const settings = await this.settings.upsert({
      shopId,
      ...data,
    });

    logger.info("Widget settings updated", { shopId });

    return settings;
  }
}

export const widgetSettingsService = new WidgetSettingsService(
  widgetSettingsRepository,
);
