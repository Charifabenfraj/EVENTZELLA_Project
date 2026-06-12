"use client";

import LogoMark from "@/components/brand/LogoMark";
import { navigationByRole, roleDefinitions } from "@/lib/roleConfig";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarNav({ role, navigation, collapsed, onCollapse }) {
  const pathname = usePathname();
  const roleMeta = roleDefinitions[role] || roleDefinitions.ceo;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 hidden h-screen flex-col border-r border-border bg-card px-4 py-6 shadow-glow transition-all lg:flex",
        collapsed ? "w-[90px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoMark className={cn("h-12 w-12", collapsed && "h-10 w-10")} />
          <div className={cn("space-y-1", collapsed && "hidden")}>
            <p className="text-xs uppercase tracking-[0.3em] text-brand font-black">Eventzella</p>
            <h2 className="font-display text-xl font-bold">Enterprise Hub</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          className="rounded-full border border-border bg-muted p-2 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border bg-muted/60 px-3 py-3">
        <roleMeta.icon className="text-brand" size={22} />
        <div className={cn("space-y-1", collapsed && "hidden")}> 
          <p className="text-sm font-semibold text-foreground">{roleMeta.name}</p>
          <p className="text-xs text-muted-foreground">{roleMeta.description}</p>
        </div>
      </div>

      <nav className="mt-8 space-y-2">
        {(navigation || navigationByRole.ceo).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition",
                isActive ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon size={18} />
              <span className={cn(collapsed && "hidden")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={cn("mt-auto rounded-2xl border border-brand/20 bg-brand/5 p-5 backdrop-blur-md", collapsed && "hidden")}>
        <p className="text-xs uppercase tracking-[0.2em] text-brand font-black">Security</p>
        <p className="mt-2 text-sm text-foreground leading-relaxed">
          Role-based access, JWT sessions, and audit-ready logging are active.
        </p>
      </div>
    </aside>
  );
}
