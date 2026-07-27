export type IntegrationProviderId = "klaviyo" | "gorgias";

export type IntegrationProviderDb = "KLAVIYO" | "GORGIAS";

export function toProviderDbId(
  id: IntegrationProviderId,
): IntegrationProviderDb {
  return id === "klaviyo" ? "KLAVIYO" : "GORGIAS";
}

export function toProviderId(
  db: IntegrationProviderDb,
): IntegrationProviderId {
  return db === "KLAVIYO" ? "klaviyo" : "gorgias";
}

export type DecryptedCredentials = Record<string, string>;

export interface ConnectionTestResult {
  ok: boolean;
  accountLabel?: string;
  errorMessage?: string;
}

export type IntegrationEventType =
  | "review.published"
  | "review.merchant_reply"
  | "review_request.sent"
  | "review_request.completed";

export interface ReviewPublishedPayload {
  reviewId: string;
  shopifyProductId: string;
  productTitle?: string | null;
  rating: number;
  title?: string | null;
  body: string;
  authorName: string;
  authorEmail?: string | null;
  verifiedBuyer: boolean;
  adminUrl?: string;
}

export interface ReviewMerchantReplyPayload {
  reviewId: string;
  merchantReply: string;
  authorEmail?: string | null;
  authorName: string;
  rating: number;
  body: string;
}

export interface ReviewRequestSentPayload {
  reviewRequestId: string;
  shopifyOrderId: string;
  shopifyProductId: string;
  customerEmail: string;
}

export interface ReviewRequestCompletedPayload {
  reviewRequestId: string;
  reviewId: string;
  shopifyProductId: string;
  customerEmail: string;
}

export type IntegrationEventPayload =
  | { type: "review.published"; data: ReviewPublishedPayload }
  | { type: "review.merchant_reply"; data: ReviewMerchantReplyPayload }
  | { type: "review_request.sent"; data: ReviewRequestSentPayload }
  | { type: "review_request.completed"; data: ReviewRequestCompletedPayload };

export interface IntegrationEventContext {
  shopId: string;
  credentials: DecryptedCredentials;
  event: IntegrationEventPayload;
  saveExternalRef: (input: {
    entityType: "REVIEW" | "REVIEW_REQUEST";
    entityId: string;
    externalId: string;
    externalType: "TICKET" | "EVENT";
  }) => Promise<void>;
  findExternalRef: (input: {
    entityType: "REVIEW" | "REVIEW_REQUEST";
    entityId: string;
    externalType: "TICKET" | "EVENT";
  }) => Promise<string | null>;
}

export interface CreateTicketContext {
  shopId: string;
  credentials: DecryptedCredentials;
  review: ReviewPublishedPayload;
}

export interface SyncReplyContext {
  shopId: string;
  credentials: DecryptedCredentials;
  ticketExternalId: string;
  reply: ReviewMerchantReplyPayload;
}

export interface SmsContext {
  shopId: string;
  credentials: DecryptedCredentials;
  to: string;
  body: string;
}

export interface IntegrationProvider {
  readonly id: IntegrationProviderId;
  readonly displayName: string;
  testConnection(
    credentials: DecryptedCredentials,
  ): Promise<ConnectionTestResult>;
  handleEvent(ctx: IntegrationEventContext): Promise<void>;
  createSupportTicket?(
    ctx: CreateTicketContext,
  ): Promise<{ externalId: string }>;
  syncMerchantReply?(ctx: SyncReplyContext): Promise<void>;
  /** Future SMS channel — providers may no-op. */
  sendSms?(ctx: SmsContext): Promise<void>;
}

export class IntegrationProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "IntegrationProviderError";
  }
}
