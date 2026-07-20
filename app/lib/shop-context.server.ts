import { billingSyncService } from "../features/billing/billing-sync.service.server";
import type { ShopifyBillingClient } from "../features/billing/billing-sync.service.server";
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

export async function requireShopWithBillingSync(input: {
  shopDomain: string;
  billing: ShopifyBillingClient;
  isTest?: boolean;
  forceSync?: boolean;
}): Promise<ShopRecord> {
  const shop = await requireShopRecord(input.shopDomain);

  return billingSyncService.resolvePlanForShop({
    shop,
    billing: input.billing,
    isTest: input.isTest,
    forceSync: input.forceSync,
  });
}
