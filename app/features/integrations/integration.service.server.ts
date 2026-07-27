import { DomainError, ValidationError } from "../../lib/domain-error";
import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
  getIntegrationsKeyVersion,
  isIntegrationsEncryptionConfigured,
} from "../../lib/integrations-crypto.server";
import { parseWithSchema } from "../../lib/validation";
import {
  integrationRepository,
  type IntegrationConnectionRecord,
  type IntegrationRepository,
} from "../../repositories/integration.repository.server";
import type { DecryptedCredentials } from "../../services/integrations/integration-provider.server";
import {
  toProviderDbId,
  toProviderId,
} from "../../services/integrations/integration-provider.server";
import { getIntegrationProvider } from "../../services/integrations/integration-registry.server";
import { listIntegrationProviders } from "../../services/integrations/integration-registry.server";
import {
  connectIntegrationSchema,
  integrationProviderActionSchema,
} from "./integration.schema";

export interface AdminIntegrationCard {
  provider: "klaviyo" | "gorgias";
  displayName: string;
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  accountLabel: string | null;
  lastError: string | null;
  lastSuccessAt: string | null;
  connectedAt: string | null;
  encryptionConfigured: boolean;
}

function metadataLabel(
  metadata: IntegrationConnectionRecord["metadata"],
): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const label = (metadata as { accountLabel?: unknown }).accountLabel;
  return typeof label === "string" && label.trim() ? label.trim() : null;
}

function toAdminCard(
  providerId: "klaviyo" | "gorgias",
  displayName: string,
  connection: IntegrationConnectionRecord | null,
  encryptionConfigured: boolean,
): AdminIntegrationCard {
  return {
    provider: providerId,
    displayName,
    status: connection?.status ?? "DISCONNECTED",
    accountLabel: metadataLabel(connection?.metadata ?? null),
    lastError: connection?.lastError ?? null,
    lastSuccessAt: connection?.lastSuccessAt?.toISOString() ?? null,
    connectedAt: connection?.connectedAt?.toISOString() ?? null,
    encryptionConfigured,
  };
}

export class IntegrationService {
  constructor(private readonly integrations: IntegrationRepository) {}

  async listAdminCardsForShop(shopId: string): Promise<AdminIntegrationCard[]> {
    const encryptionConfigured = isIntegrationsEncryptionConfigured();
    const connections = await this.integrations.listConnectionsForShop(shopId);
    const byProvider = new Map(
      connections.map((row) => [toProviderId(row.provider), row] as const),
    );

    return listIntegrationProviders().map((provider) =>
      toAdminCard(
        provider.id,
        provider.displayName,
        byProvider.get(provider.id) ?? null,
        encryptionConfigured,
      ),
    );
  }

  async connect(shopId: string, rawInput: unknown): Promise<AdminIntegrationCard> {
    if (!isIntegrationsEncryptionConfigured()) {
      throw new DomainError(
        "Set INTEGRATIONS_ENCRYPTION_KEY before connecting integrations.",
        "INTEGRATIONS_ENCRYPTION_UNAVAILABLE",
      );
    }

    const data = parseWithSchema(
      connectIntegrationSchema,
      rawInput,
      "Invalid integration credentials",
    );

    const provider = getIntegrationProvider(data.provider);
    const credentials: DecryptedCredentials =
      data.provider === "klaviyo"
        ? { apiKey: data.apiKey }
        : {
            email: data.email,
            apiToken: data.apiToken,
            subdomain: data.subdomain.replace(/\.gorgias\.com$/i, ""),
          };

    const test = await provider.testConnection(credentials);
    if (!test.ok) {
      throw new ValidationError("Connection test failed", [
        test.errorMessage ?? "Could not verify credentials.",
      ]);
    }

    const encrypted = encryptIntegrationCredentials(
      JSON.stringify(credentials),
    );
    const now = new Date();
    const saved = await this.integrations.upsertConnection({
      shopId,
      provider: toProviderDbId(data.provider),
      status: "CONNECTED",
      credentialsEncrypted: encrypted,
      credentialsKeyVersion: getIntegrationsKeyVersion(),
      metadata: {
        accountLabel: test.accountLabel ?? provider.displayName,
        lastTestedAt: now.toISOString(),
      },
      lastError: null,
      lastSuccessAt: now,
      connectedAt: now,
    });

    return toAdminCard(
      data.provider,
      provider.displayName,
      saved,
      true,
    );
  }

  async testConnection(
    shopId: string,
    rawInput: unknown,
  ): Promise<AdminIntegrationCard> {
    const data = parseWithSchema(
      integrationProviderActionSchema,
      rawInput,
      "Invalid integration action",
    );
    const provider = getIntegrationProvider(data.provider);
    const connection = await this.integrations.findConnection(
      shopId,
      toProviderDbId(data.provider),
    );

    if (!connection?.credentialsEncrypted) {
      throw new DomainError(
        "Connect this integration before testing.",
        "INTEGRATION_NOT_CONNECTED",
      );
    }

    let credentials: DecryptedCredentials;
    try {
      credentials = JSON.parse(
        decryptIntegrationCredentials(connection.credentialsEncrypted),
      ) as DecryptedCredentials;
    } catch {
      throw new DomainError(
        "Stored credentials could not be decrypted.",
        "INTEGRATIONS_CREDENTIALS_CORRUPT",
      );
    }

    const test = await provider.testConnection(credentials);
    const now = new Date();
    const updated = await this.integrations.markConnectionResult({
      shopId,
      provider: toProviderDbId(data.provider),
      status: test.ok ? "CONNECTED" : "ERROR",
      lastError: test.ok ? null : (test.errorMessage ?? "Connection test failed"),
      lastSuccessAt: test.ok ? now : connection.lastSuccessAt,
      metadata: {
        accountLabel:
          test.accountLabel ??
          metadataLabel(connection.metadata) ??
          provider.displayName,
        lastTestedAt: now.toISOString(),
      },
    });

    return toAdminCard(
      data.provider,
      provider.displayName,
      updated ?? connection,
      true,
    );
  }

  async disconnect(
    shopId: string,
    rawInput: unknown,
  ): Promise<AdminIntegrationCard> {
    const data = parseWithSchema(
      integrationProviderActionSchema,
      rawInput,
      "Invalid integration action",
    );
    const provider = getIntegrationProvider(data.provider);
    const updated = await this.integrations.disconnect({
      shopId,
      provider: toProviderDbId(data.provider),
    });

    return toAdminCard(
      data.provider,
      provider.displayName,
      updated,
      isIntegrationsEncryptionConfigured(),
    );
  }
}

export const integrationService = new IntegrationService(integrationRepository);
