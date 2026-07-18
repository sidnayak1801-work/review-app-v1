import { shopService } from "../features/shops/shop.service.server";
import type { ShopRecord } from "../repositories/shop.repository.server";

export async function requireShopRecord(
  shopDomain: string,
): Promise<ShopRecord> {
  const existing = await shopService.findByDomain(shopDomain);

  if (existing) {
    return existing;
  }

  return shopService.install({ shopDomain });
}
