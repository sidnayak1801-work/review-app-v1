import type { LoaderFunctionArgs } from "react-router";

import prisma from "../db.server";

/**
 * Lightweight liveness/readiness probe for uptime monitors.
 * Does not expose secrets or tenant data.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const checkDatabase = url.searchParams.get("ready") === "1";

  if (!checkDatabase) {
    return Response.json({
      ok: true,
      status: "alive",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      ok: true,
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      {
        ok: false,
        status: "not_ready",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
};
