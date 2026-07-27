import { Form } from "react-router";

export type ModerationQueueTab = {
  status: string;
  label: string;
  count: number;
};

interface ModerationQueueToolbarProps {
  tabs: ModerationQueueTab[];
  activeStatus: string;
  buildHref: (status: string) => string;
  search?: {
    name: string;
    label: string;
    value: string;
    /** Preserve current status when searching. */
    statusFieldName?: string;
    statusValue?: string;
    allStatusValue?: string;
    /** Extra GET params to keep (e.g. text search `q`). */
    preserveParams?: Array<{ name: string; value: string }>;
  };
}

export function ModerationQueueToolbar({
  tabs,
  activeStatus,
  buildHref,
  search,
}: ModerationQueueToolbarProps) {
  return (
    <s-stack direction="block" gap="base">
      <s-stack direction="inline" gap="small">
        {tabs.map((tab) => {
          const active = activeStatus === tab.status;
          return (
            <s-button
              key={tab.status}
              href={buildHref(tab.status)}
              variant={active ? "primary" : "secondary"}
            >
              {tab.label} ({tab.count})
            </s-button>
          );
        })}
      </s-stack>

      {search ? (
        <Form method="get">
          {search.statusValue &&
          search.statusValue !== (search.allStatusValue ?? "ALL") ? (
            <input
              type="hidden"
              name={search.statusFieldName ?? "status"}
              value={search.statusValue}
            />
          ) : null}
          {search.preserveParams?.map((param) =>
            param.value ? (
              <input
                key={param.name}
                type="hidden"
                name={param.name}
                value={param.value}
              />
            ) : null,
          )}
          <s-stack direction="inline" gap="small" alignItems="end">
            <s-text-field
              name={search.name}
              label={search.label}
              value={search.value}
              autocomplete="off"
            />
            <s-button type="submit" variant="secondary">
              Apply
            </s-button>
          </s-stack>
        </Form>
      ) : null}
    </s-stack>
  );
}
