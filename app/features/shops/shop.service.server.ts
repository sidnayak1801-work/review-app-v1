import { parseWithSchema } from "../../lib/validation";
import {
  shopRepository,
  type ShopRecord,
  type ShopRepository,
} from "../../repositories/shop.repository.server";
import { logger } from "../../services/logger.server";
import {
  createShopSchema,
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
