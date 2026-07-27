import { gorgiasProvider } from "./gorgias.provider.server";
import type {
  IntegrationProvider,
  IntegrationProviderId,
} from "./integration-provider.server";
import { klaviyoProvider } from "./klaviyo.provider.server";

const providers: readonly IntegrationProvider[] = [
  klaviyoProvider,
  gorgiasProvider,
];

const byId = new Map(
  providers.map((provider) => [provider.id, provider] as const),
);

export function listIntegrationProviders(): readonly IntegrationProvider[] {
  return providers;
}

export function getIntegrationProvider(
  id: IntegrationProviderId,
): IntegrationProvider {
  const provider = byId.get(id);
  if (!provider) {
    throw new Error(`Unknown integration provider: ${id}`);
  }
  return provider;
}
