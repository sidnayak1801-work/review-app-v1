import { parseWithSchema } from "../../lib/validation";
import {
  shopRepository,
  type ShopRecord,
  type ShopRepository,
} from "../../repositories/shop.repository.server";
import { logger } from "../../services/logger.server";
import { lifecycleEmailService } from "../lifecycle-emails/lifecycle-email.service.server";
import { onboardingService } from "../onboarding/onboarding.service.server";
import {
  createShopSchema,
  installShopSchema,
  shopDomainSchema,
} from "./shop.schema";

export class ShopService {
  constructor(private readonly shops: ShopRepository) {}

  async create(input: unknown): Promise<ShopRecord> {
    const validatedInput = parseWithSchema(
      createShopSchema,
      input,
      "Invalid shop",
    );
    const shop = await this.shops.create(validatedInput);

    logger.info("Shop record created", {
      shopId: shop.id,
      shopDomain: shop.shopDomain,
    });

    await onboardingService.ensureForShop(shop.id);

    return shop;
  }

  async install(input: unknown): Promise<ShopRecord> {
    const validatedInput = parseWithSchema(
      installShopSchema,
      input,
      "Invalid shop install",
    );
    const shop = await this.shops.install(validatedInput);

    logger.info("Shop installed", {
      shopId: shop.id,
      shopDomain: shop.shopDomain,
      status: shop.status,
    });

    await onboardingService.ensureForShop(shop.id);
    await lifecycleEmailService.scheduleForInstall(shop);

    return shop;
  }

  async uninstall(shopDomain: unknown): Promise<ShopRecord | null> {
    const validatedDomain = parseWithSchema(
      shopDomainSchema,
      shopDomain,
      "Invalid shop domain",
    );
    const shop = await this.shops.markUninstalled(validatedDomain);

    if (!shop) {
      logger.warn("Uninstall ignored for unknown shop", {
        shopDomain: validatedDomain,
      });
      return null;
    }

    await lifecycleEmailService.cancelPendingForShop(shop.id);

    logger.info("Shop marked uninstalled", {
      shopId: shop.id,
      shopDomain: shop.shopDomain,
      status: shop.status,
    });

    return shop;
  }

  async findByDomain(shopDomain: unknown): Promise<ShopRecord | null> {
    const validatedDomain = parseWithSchema(
      shopDomainSchema,
      shopDomain,
      "Invalid shop domain",
    );

    return this.shops.findByDomain(validatedDomain);
  }
}

export const shopService = new ShopService(shopRepository);
