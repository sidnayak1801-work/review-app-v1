import type { PrismaClient } from "@prisma/client";

import prisma from "../db.server";

export type LifecycleEmailType =
  | "WELCOME"
  | "ONBOARDING_REMINDER_24H"
  | "ONBOARDING_REMINDER_3D"
  | "ONBOARDING_COMPLETED";

export type LifecycleEmailStatus =
  | "SCHEDULED"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "CANCELLED";

export interface LifecycleEmailRecord {
  id: string;
  shopId: string;
  type: LifecycleEmailType;
  status: LifecycleEmailStatus;
  scheduledFor: Date;
  sentAt: Date | null;
  failedAt: Date | null;
  lastErrorCode: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertLifecycleEmailInput {
  shopId: string;
  type: LifecycleEmailType;
  scheduledFor: Date;
  status?: LifecycleEmailStatus;
}

export interface MarkSentInput {
  sentAt: Date;
  providerMessageId?: string | null;
}

export interface MarkRetryInput {
  scheduledFor: Date;
  attemptCount: number;
  lastErrorCode: string;
}

export interface MarkFailedInput {
  failedAt: Date;
  attemptCount: number;
  lastErrorCode: string;
}

const SELECT = {
  id: true,
  shopId: true,
  type: true,
  status: true,
  scheduledFor: true,
  sentAt: true,
  failedAt: true,
  lastErrorCode: true,
  providerMessageId: true,
  attemptCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface LifecycleEmailRepository {
  findByShopAndType(
    shopId: string,
    type: LifecycleEmailType,
  ): Promise<LifecycleEmailRecord | null>;
  findDueScheduled(limit: number, now?: Date): Promise<LifecycleEmailRecord[]>;
  /** Re-queue jobs stuck in PROCESSING after a worker crash. */
  recoverStaleProcessing(olderThan: Date): Promise<number>;
  upsertScheduled(
    input: UpsertLifecycleEmailInput,
  ): Promise<LifecycleEmailRecord>;
  claimForProcessing(id: string): Promise<LifecycleEmailRecord | null>;
  markSent(id: string, input: MarkSentInput): Promise<LifecycleEmailRecord>;
  markRetry(id: string, input: MarkRetryInput): Promise<LifecycleEmailRecord>;
  markFailed(id: string, input: MarkFailedInput): Promise<LifecycleEmailRecord>;
  markCancelled(id: string): Promise<LifecycleEmailRecord>;
  cancelPendingForShop(
    shopId: string,
    types?: LifecycleEmailType[],
  ): Promise<number>;
}

type LifecycleEmailModel = {
  findUnique(args: {
    where: { shopId_type: { shopId: string; type: LifecycleEmailType } };
    select: typeof SELECT;
  }): Promise<LifecycleEmailRecord | null>;
  findMany(args: {
    where: {
      status: LifecycleEmailStatus;
      scheduledFor: { lte: Date };
    };
    orderBy: { scheduledFor: "asc" };
    take: number;
    select: typeof SELECT;
  }): Promise<LifecycleEmailRecord[]>;
  upsert(args: {
    where: { shopId_type: { shopId: string; type: LifecycleEmailType } };
    create: {
      shopId: string;
      type: LifecycleEmailType;
      status: LifecycleEmailStatus;
      scheduledFor: Date;
    };
    update: {
      status?: LifecycleEmailStatus;
      scheduledFor?: Date;
      sentAt?: Date | null;
      failedAt?: Date | null;
      lastErrorCode?: string | null;
      providerMessageId?: string | null;
      attemptCount?: number;
    };
    select: typeof SELECT;
  }): Promise<LifecycleEmailRecord>;
  updateMany(args: {
    where: {
      id?: string;
      shopId?: string;
      status?: LifecycleEmailStatus | { in: LifecycleEmailStatus[] };
      type?: { in: LifecycleEmailType[] };
      updatedAt?: { lt: Date };
    };
    data: {
      status?: LifecycleEmailStatus;
      scheduledFor?: Date;
      sentAt?: Date | null;
      failedAt?: Date | null;
      lastErrorCode?: string | null;
      providerMessageId?: string | null;
      attemptCount?: number;
    };
  }): Promise<{ count: number }>;
  update(args: {
    where: { id: string };
    data: {
      status?: LifecycleEmailStatus;
      scheduledFor?: Date;
      sentAt?: Date | null;
      failedAt?: Date | null;
      lastErrorCode?: string | null;
      providerMessageId?: string | null;
      attemptCount?: number;
    };
    select: typeof SELECT;
  }): Promise<LifecycleEmailRecord>;
  findFirst(args: {
    where: { id: string; status: LifecycleEmailStatus };
    select: typeof SELECT;
  }): Promise<LifecycleEmailRecord | null>;
};

function model(database: PrismaClient): LifecycleEmailModel {
  return (
    database as unknown as { lifecycleEmail: LifecycleEmailModel }
  ).lifecycleEmail;
}

const PENDING_STATUSES: LifecycleEmailStatus[] = ["SCHEDULED", "PROCESSING"];

export class PrismaLifecycleEmailRepository
  implements LifecycleEmailRepository
{
  constructor(private readonly database: PrismaClient = prisma) {}

  async findByShopAndType(
    shopId: string,
    type: LifecycleEmailType,
  ): Promise<LifecycleEmailRecord | null> {
    return model(this.database).findUnique({
      where: { shopId_type: { shopId, type } },
      select: SELECT,
    });
  }

  async findDueScheduled(
    limit: number,
    now: Date = new Date(),
  ): Promise<LifecycleEmailRecord[]> {
    return model(this.database).findMany({
      where: {
        status: "SCHEDULED",
        scheduledFor: { lte: now },
      },
      orderBy: { scheduledFor: "asc" },
      take: limit,
      select: SELECT,
    });
  }

  async recoverStaleProcessing(olderThan: Date): Promise<number> {
    const result = await model(this.database).updateMany({
      where: {
        status: "PROCESSING",
        updatedAt: { lt: olderThan },
      },
      data: {
        status: "SCHEDULED",
      },
    });
    return result.count;
  }

  async upsertScheduled(
    input: UpsertLifecycleEmailInput,
  ): Promise<LifecycleEmailRecord> {
    const status = input.status ?? "SCHEDULED";
    const existing = await this.findByShopAndType(input.shopId, input.type);

    if (existing?.status === "SENT") {
      return existing;
    }

    return model(this.database).upsert({
      where: {
        shopId_type: { shopId: input.shopId, type: input.type },
      },
      create: {
        shopId: input.shopId,
        type: input.type,
        status,
        scheduledFor: input.scheduledFor,
      },
      update: {
        status,
        scheduledFor: input.scheduledFor,
        sentAt: null,
        failedAt: null,
        lastErrorCode: null,
        providerMessageId: null,
        attemptCount: 0,
      },
      select: SELECT,
    });
  }

  async claimForProcessing(id: string): Promise<LifecycleEmailRecord | null> {
    const claimed = await model(this.database).updateMany({
      where: { id, status: "SCHEDULED" },
      data: { status: "PROCESSING" },
    });

    if (claimed.count === 0) {
      return null;
    }

    return model(this.database).findFirst({
      where: { id, status: "PROCESSING" },
      select: SELECT,
    });
  }

  async markSent(
    id: string,
    input: MarkSentInput,
  ): Promise<LifecycleEmailRecord> {
    return model(this.database).update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: input.sentAt,
        providerMessageId: input.providerMessageId ?? null,
        lastErrorCode: null,
        failedAt: null,
      },
      select: SELECT,
    });
  }

  async markRetry(
    id: string,
    input: MarkRetryInput,
  ): Promise<LifecycleEmailRecord> {
    return model(this.database).update({
      where: { id },
      data: {
        status: "SCHEDULED",
        scheduledFor: input.scheduledFor,
        attemptCount: input.attemptCount,
        lastErrorCode: input.lastErrorCode,
      },
      select: SELECT,
    });
  }

  async markFailed(
    id: string,
    input: MarkFailedInput,
  ): Promise<LifecycleEmailRecord> {
    return model(this.database).update({
      where: { id },
      data: {
        status: "FAILED",
        failedAt: input.failedAt,
        attemptCount: input.attemptCount,
        lastErrorCode: input.lastErrorCode,
      },
      select: SELECT,
    });
  }

  async markCancelled(id: string): Promise<LifecycleEmailRecord> {
    return model(this.database).update({
      where: { id },
      data: { status: "CANCELLED" },
      select: SELECT,
    });
  }

  async cancelPendingForShop(
    shopId: string,
    types?: LifecycleEmailType[],
  ): Promise<number> {
    const result = await model(this.database).updateMany({
      where: {
        shopId,
        status: { in: PENDING_STATUSES },
        ...(types ? { type: { in: types } } : {}),
      },
      data: { status: "CANCELLED" },
    });

    return result.count;
  }
}

export const lifecycleEmailRepository = new PrismaLifecycleEmailRepository();
