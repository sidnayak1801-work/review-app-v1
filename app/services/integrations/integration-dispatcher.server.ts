import {
  decryptIntegrationCredentials,
} from "../../lib/integrations-crypto.server";
import {
  integrationRepository,
  type IntegrationRepository,
} from "../../repositories/integration.repository.server";
import { logger } from "../logger.server";
import {
  toProviderId,
  type DecryptedCredentials,
  type IntegrationEventPayload,
  type IntegrationProviderId,
} from "./integration-provider.server";
import { getIntegrationProvider } from "./integration-registry.server";

export class IntegrationEventDispatcher {
  constructor(private readonly integrations: IntegrationRepository) {}

  /**
   * Fan-out to connected providers. Never throws to callers — failures are
   * logged and stored on the connection row.
   */
  async emit(input: {
    shopId: string;
    event: IntegrationEventPayload;
  }): Promise<void> {
    const connections = await this.integrations.listConnectedForShop(
      input.shopId,
    );

    await Promise.all(
      connections.map(async (connection) => {
        if (!connection.credentialsEncrypted) {
          return;
        }

        const providerId = toProviderId(connection.provider);
        const provider = getIntegrationProvider(providerId);

        let credentials: DecryptedCredentials;
        try {
          credentials = JSON.parse(
            decryptIntegrationCredentials(connection.credentialsEncrypted),
          ) as DecryptedCredentials;
        } catch (error) {
          logger.warn("Failed to decrypt integration credentials", {
            shopId: input.shopId,
            provider: providerId,
            errorName: error instanceof Error ? error.name : "UnknownError",
          });
          await this.integrations.markConnectionResult({
            shopId: input.shopId,
            provider: connection.provider,
            status: "ERROR",
            lastError: "Could not decrypt stored credentials.",
          });
          return;
        }

        try {
          await provider.handleEvent({
            shopId: input.shopId,
            credentials,
            event: input.event,
            saveExternalRef: async (ref) => {
              await this.integrations.upsertExternalRef({
                shopId: input.shopId,
                provider: connection.provider,
                entityType: ref.entityType,
                entityId: ref.entityId,
                externalId: ref.externalId,
                externalType: ref.externalType,
              });
            },
            findExternalRef: async (ref) => {
              const existing = await this.integrations.findExternalRef({
                shopId: input.shopId,
                provider: connection.provider,
                entityType: ref.entityType,
                entityId: ref.entityId,
                externalType: ref.externalType,
              });
              return existing?.externalId ?? null;
            },
          });

          await this.integrations.markConnectionResult({
            shopId: input.shopId,
            provider: connection.provider,
            status: "CONNECTED",
            lastError: null,
            lastSuccessAt: new Date(),
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Integration event failed";
          logger.warn("Integration provider event failed", {
            shopId: input.shopId,
            provider: providerId,
            eventType: input.event.type,
            errorMessage: message,
          });
          await this.integrations.markConnectionResult({
            shopId: input.shopId,
            provider: connection.provider,
            status: "ERROR",
            lastError: message.slice(0, 500),
          });
        }
      }),
    );
  }

  /** Fire-and-forget wrapper for domain services. */
  emitInBackground(input: {
    shopId: string;
    event: IntegrationEventPayload;
  }): void {
    void this.emit(input).catch((error) => {
      logger.warn("Integration dispatcher crashed", {
        shopId: input.shopId,
        eventType: input.event.type,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    });
  }
}

export const integrationEventDispatcher = new IntegrationEventDispatcher(
  integrationRepository,
);

export type { IntegrationProviderId };
