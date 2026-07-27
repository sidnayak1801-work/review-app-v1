import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ThemeProvider, useTheme } from "../theme-provider";
import { ThemeToggle } from "./ui/theme-toggle";

type LegalPageShellProps = {
  title: string;
  updated: string;
  children: ReactNode;
};

function LegalShell({ title, updated, children }: LegalPageShellProps) {
  const { theme, ready } = useTheme();

  return (
    <div
      id="marketing-root"
      data-theme={theme}
      className={cn(
        "mkt-site min-h-screen bg-background text-foreground antialiased",
        ready && "mkt-theme-ready",
      )}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-6 sm:px-6">
        <a
          href="/"
          className="text-sm font-semibold text-brand hover:underline"
        >
          ← Back to ReviewX
        </a>
        <ThemeToggle />
      </div>
      <article className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:pb-16">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {updated}
        </p>
        <div className="prose-marketing mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </div>
  );
}

export function LegalPageShell(props: LegalPageShellProps) {
  return (
    <ThemeProvider>
      <LegalShell {...props} />
    </ThemeProvider>
  );
}
