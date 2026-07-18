import { parseWithSchema } from "../../lib/validation";
import {
  DEFAULT_WIDGET_SETTINGS,
  widgetSettingsRepository,
  type WidgetSettingsRecord,
  type WidgetSettingsRepository,
} from "../../repositories/widget-settings.repository.server";
import { logger } from "../../services/logger.server";
import { widgetSettingsSchema } from "./widget-settings.schema";

export class WidgetSettingsService {
  constructor(private readonly settings: WidgetSettingsRepository) {}

  async getForShop(shopId: string): Promise<WidgetSettingsRecord> {
    const existing = await this.settings.findByShopId(shopId);

    if (existing) {
      return existing;
    }

    return this.settings.upsert({
      shopId,
      ...DEFAULT_WIDGET_SETTINGS,
    });
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
