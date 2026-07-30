import { createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import { Dashboard } from "@/components/dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReviewX — Merchant Dashboard" },
      {
        name: "description",
        content:
          "ReviewX is a premium Shopify reviews app. Track ratings, moderate reviews, send requests, and grow social proof from one clean dashboard.",
      },
      { property: "og:title", content: "ReviewX — Merchant Dashboard" },
      {
        property: "og:description",
        content:
          "Premium Shopify reviews dashboard: KPIs, moderation, widgets, and analytics in one place.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1">
            <Dashboard />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
