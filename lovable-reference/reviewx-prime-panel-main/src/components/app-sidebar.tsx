import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Star,
  Mail,
  Download,
  LayoutGrid,
  Palette,
  BarChart3,
  Settings,
  CreditCard,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const nav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Reviews", url: "/reviews", icon: Star },
  { title: "Review Requests", url: "/requests", icon: Mail },
  { title: "Import Reviews", url: "/import", icon: Download },
  { title: "Widgets", url: "/widgets", icon: LayoutGrid },
  { title: "Customization", url: "/customization", icon: Palette },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Billing", url: "/billing", icon: CreditCard },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b h-16 justify-center">
        <div className="flex items-center gap-2.5 px-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4.5 w-4.5" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-[15px] font-bold tracking-tight">ReviewX</span>
            <span className="text-[11px] text-muted-foreground">Reviews for Shopify</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {nav.map((item) => {
                const active = item.url === "/" ? path === "/" : path.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="h-9 rounded-lg font-medium text-[13.5px] data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:shadow-soft"
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" strokeWidth={2} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-3 group-data-[collapsible=icon]:hidden">
        <div className="rounded-xl border bg-surface p-3">
          <div className="flex items-center gap-2 text-[12.5px] font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Upgrade to Pro
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed">
            Unlock unlimited review requests and premium widgets.
          </p>
          <button className="mt-2.5 w-full rounded-md bg-primary py-1.5 text-[12px] font-semibold text-primary-foreground transition hover:opacity-90">
            View plans
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
