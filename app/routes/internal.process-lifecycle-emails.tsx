import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";

import { lifecycleEmailService } from "../features/lifecycle-emails/lifecycle-email.service.server";
import { logger } from "../services/logger.server";

function authorize(request: Request): boolean {
  const secret = process.env.INTERNAL_JOB_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return header === expected;
}

/**
 * Authenticated internal endpoint for Coolify cron / manual ops.
 * POST /internal/process-lifecycle-emails
 * Authorization: Bearer $INTERNAL_JOB_SECRET
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return data({ ok: false as const, message: "Method not allowed." }, { status: 405 });
  }

  if (!authorize(request)) {
    logger.warn("lifecycle_email.internal_unauthorized");
    return data({ ok: false as const, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await lifecycleEmailService.processDueJobs();
    return data({ ok: true as const, result });
  } catch (error) {
    logger.error("lifecycle_email.internal_process_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return data(
      { ok: false as const, message: "Unable to process lifecycle emails." },
      { status: 500 },
    );
  }
}

export async function loader() {
  return data({ ok: false as const, message: "Method not allowed." }, { status: 405 });
}
