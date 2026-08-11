/**
 * Long-running lifecycle email poller for Coolify / local ops.
 *
 * Usage: npm run worker:lifecycle
 *
 * Does not replace the web process. Shares DATABASE_URL and email env
 * with the app. Prefer the authenticated internal HTTP route for cron
 * if a second service is unavailable.
 */

import { lifecycleEmailService } from "../features/lifecycle-emails/lifecycle-email.service.server";
import { logger } from "../services/logger.server";

const POLL_INTERVAL_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function tick(): Promise<void> {
  try {
    const result = await lifecycleEmailService.processDueJobs();
    if (result.processedCount > 0) {
      logger.info("lifecycle_email.worker_tick", { ...result });
    }
  } catch (error) {
    logger.error("lifecycle_email.worker_tick_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
  }
}

async function main(): Promise<void> {
  logger.info("lifecycle_email.worker_started", {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  for (;;) {
    await tick();
    await sleep(POLL_INTERVAL_MS);
  }
}

main().catch((error: unknown) => {
  logger.error("lifecycle_email.worker_crashed", {
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : "unknown",
  });
  process.exit(1);
});
