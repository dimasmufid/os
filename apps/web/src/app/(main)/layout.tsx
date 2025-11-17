import type { ReactNode } from "react";

import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import { MainBreadcrumb } from "@/components/main-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <MainBreadcrumb />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 px-4">{children}</main>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}
