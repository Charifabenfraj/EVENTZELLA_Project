"use client";

import { useSession } from "@/hooks/useSession";
import { navigationByRole } from "@/lib/roleConfig";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import FloatingChatbot from "../FloatingChatbot";
import MobileNav from "./MobileNav";
import NotificationDrawer from "./NotificationDrawer";
import SidebarNav from "./SidebarNav";
import Topbar from "./Topbar";

export default function AppShell({ children }) {
  const { user } = useSession();
  const role = user?.role || "ceo";
  const navigation = useMemo(() => navigationByRole[role] || navigationByRole.ceo, [role]);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <SidebarNav
          role={role}
          navigation={navigation}
          collapsed={collapsed}
          onCollapse={() => setCollapsed((prev) => !prev)}
        />
        <div
          className={cn(
            "flex min-h-screen flex-1 flex-col",
            collapsed ? "lg:pl-[90px]" : "lg:pl-[260px]"
          )}
        >
          <Topbar
            user={user}
            onToggleNotifications={() => setNotificationsOpen((prev) => !prev)}
            onToggleMenu={() => setMobileOpen(true)}
          />
          <main className="flex-1 px-6 py-6 lg:px-10">
            {children}
          </main>
        </div>
      </div>
      <NotificationDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navigation={navigation}
        role={role}
      />
      <FloatingChatbot />
    </div>
  );
}
