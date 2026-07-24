import { useEffect, useMemo, useState } from "react";

import type { WidgetSettingsInput } from "../../widget-settings/widget-settings.schema";
import type { DashboardStats } from "./StatsCards";

const STORAGE_PREFIX = "vouch.setup.";
const MARKABLE_IDS = ["theme-widget", "review-requests", "billing"] as const;

type MarkableId = (typeof MARKABLE_IDS)[number];

type SetupTask = {
  id: string;
  title: string;
  description: string;
  complete: boolean;
  markable: boolean;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

interface SetupGuideProps {
  stats: DashboardStats;
  hasReviewRequestActivity: boolean;
  widgetCustomized: boolean;
}

function readMarks(): Record<MarkableId, boolean> {
  if (typeof window === "undefined") {
    return { "theme-widget": false, "review-requests": false, billing: false };
  }

  const marks = {
    "theme-widget": false,
    "review-requests": false,
    billing: false,
  } as Record<MarkableId, boolean>;

  for (const id of MARKABLE_IDS) {
    marks[id] = window.localStorage.getItem(`${STORAGE_PREFIX}${id}`) === "1";
  }

  return marks;
}

function writeMark(id: MarkableId, value: boolean) {
  window.localStorage.setItem(`${STORAGE_PREFIX}${id}`, value ? "1" : "0");
}

export function SetupGuide({
  stats,
  hasReviewRequestActivity,
  widgetCustomized,
}: SetupGuideProps) {
  const [marks, setMarks] = useState<Record<MarkableId, boolean>>({
    "theme-widget": false,
    "review-requests": false,
    billing: false,
  });

  useEffect(() => {
    setMarks(readMarks());
  }, []);

  const tasks = useMemo<SetupTask[]>(() => {
    const hasReviews = stats.totalReviews > 0;
    const moderated =
      hasReviews && stats.pendingReviews === 0;

    return [
      {
        id: "theme-widget",
        title: "Install Review Widget on your theme",
        description:
          "Add the Product reviews block in Online Store → Themes → Customize so customers can read and write reviews.",
        complete: marks["theme-widget"],
        markable: true,
        primaryHref: "/app/settings",
        primaryLabel: "Open widget settings",
        secondaryHref: "/app/settings",
        secondaryLabel: "Theme setup tips",
      },
      {
        id: "customize-widget",
        title: "Customize the review widget",
        description:
          "Match colors, layout, and visibility to your brand. Preview updates live on Home.",
        complete: widgetCustomized,
        markable: false,
        primaryHref: "#widget-settings",
        primaryLabel: "Customize now",
      },
      {
        id: "collect-reviews",
        title: "Collect or import your first reviews",
        description:
          "Import existing reviews or publish new storefront submissions to build social proof.",
        complete: hasReviews,
        markable: false,
        primaryHref: "/app/imports",
        primaryLabel: "Import reviews",
        secondaryHref: "/app/reviews",
        secondaryLabel: "View reviews",
      },
      {
        id: "moderate-reviews",
        title: "Moderate pending reviews",
        description:
          "Approve or hide submissions so only quality feedback appears on your storefront.",
        complete: moderated,
        markable: false,
        primaryHref: "/app/reviews?status=PENDING",
        primaryLabel: "Moderate queue",
      },
      {
        id: "review-requests",
        title: "Turn on review request emails",
        description:
          "Automatically email customers after fulfillment to ask for a review.",
        complete: hasReviewRequestActivity || marks["review-requests"],
        markable: true,
        primaryHref: "/app/review-requests",
        primaryLabel: "Configure requests",
      },
      {
        id: "billing",
        title: "Check your plan and limits",
        description:
          "See Free vs Pro allowances for published reviews and monthly request emails.",
        complete: marks.billing,
        markable: true,
        primaryHref: "/app/billing",
        primaryLabel: "Open billing",
      },
    ];
  }, [stats, hasReviewRequestActivity, widgetCustomized, marks]);

  const completedCount = tasks.filter((task) => task.complete).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);
  const firstIncomplete = tasks.find((task) => !task.complete) ?? null;

  if (completedCount === tasks.length) {
    return (
      <s-section heading="Setup guide">
        <s-banner tone="success" heading="You're all set">
          All setup tasks are complete. Keep moderating reviews and refining your widget.
        </s-banner>
      </s-section>
    );
  }

  function markComplete(id: MarkableId) {
    writeMark(id, true);
    setMarks((current) => ({ ...current, [id]: true }));
  }

  return (
    <s-section heading="Setup guide">
      <s-stack direction="block" gap="base">
        <s-stack direction="block" gap="small-200">
          <s-text color="subdued">
            {completedCount} of {tasks.length} tasks complete
          </s-text>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Setup progress"
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "var(--p-color-bg-fill-brand, #0f766e)",
                borderRadius: 999,
              }}
            />
          </div>
        </s-stack>

        <s-stack direction="block" gap="small">
          {tasks.map((task) => {
            const expanded = firstIncomplete?.id === task.id;
            return (
              <s-box
                key={task.id}
                padding="base"
                border="base"
                borderRadius="large"
                background={expanded ? "base" : "subdued"}
              >
                <s-stack direction="block" gap="small">
                  <s-stack
                    direction="inline"
                    gap="small"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-badge tone={task.complete ? "success" : "neutral"}>
                        {task.complete ? "Done" : "To do"}
                      </s-badge>
                      <s-text type="strong">{task.title}</s-text>
                    </s-stack>
                  </s-stack>

                  {expanded ? (
                    <>
                      <s-text color="subdued">{task.description}</s-text>
                      <s-query-container>
                        <s-grid
                          gridTemplateColumns="@container (inline-size > 420px) auto auto auto, 1fr"
                          gap="small"
                        >
                          {task.primaryHref && task.primaryLabel ? (
                            <s-grid-item>
                              <s-button href={task.primaryHref} variant="primary">
                                {task.primaryLabel}
                              </s-button>
                            </s-grid-item>
                          ) : null}
                          {task.secondaryHref && task.secondaryLabel ? (
                            <s-grid-item>
                              <s-button
                                href={task.secondaryHref}
                                variant="secondary"
                              >
                                {task.secondaryLabel}
                              </s-button>
                            </s-grid-item>
                          ) : null}
                          {task.markable && !task.complete ? (
                            <s-grid-item>
                              <s-button
                                type="button"
                                variant="tertiary"
                                onClick={() => markComplete(task.id as MarkableId)}
                              >
                                Mark as completed
                              </s-button>
                            </s-grid-item>
                          ) : null}
                        </s-grid>
                      </s-query-container>
                    </>
                  ) : null}
                </s-stack>
              </s-box>
            );
          })}
        </s-stack>
      </s-stack>
    </s-section>
  );
}

export function isWidgetCustomized(settings: WidgetSettingsInput): boolean {
  return (
    settings.accentColor.toLowerCase() !== "#111111" ||
    settings.primaryButtonColor.toLowerCase() !== "#111111" ||
    settings.starColor.toLowerCase() !== "#22c55e" ||
    settings.borderRadius !== 8 ||
    settings.layout !== "STACKED" ||
    settings.darkMode ||
    settings.autoPublishReviews ||
    !settings.cardShadow ||
    settings.reviewsPerPage !== 5
  );
}
