import { Bell, HelpCircle, Search, Store, ChevronDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <SidebarTrigger className="-ml-1" />

      <div className="hidden md:flex items-center gap-2 rounded-lg border bg-surface px-2.5 py-1.5">
        <div className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
          <Store className="h-3.5 w-3.5" />
        </div>
        <span className="text-[13px] font-semibold">Northlane Apparel</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="relative ml-auto hidden md:block flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search reviews, products, customers…"
          className="h-9 w-full rounded-lg border bg-surface pl-9 pr-16 text-[13px] outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1 md:ml-2">
        <button className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground">
          <HelpCircle className="h-4.5 w-4.5" />
        </button>
        <button className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-background" />
        </button>
        <div className="ml-1 flex items-center gap-2 rounded-lg border p-1 pr-2.5 transition hover:bg-accent cursor-pointer">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-semibold">
              SK
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[12px] font-semibold">Shish Kharesiya</span>
            <span className="text-[10.5px] text-muted-foreground">Owner</span>
          </div>
        </div>
      </div>
    </header>
  );
}
