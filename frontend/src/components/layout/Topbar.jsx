"use client";

import { Input } from "@/components/ui/input";
import { Bell, Menu, Search } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export default function Topbar({ user, onToggleNotifications, onToggleMenu }) {
  const [query, setQuery] = useState("");

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-6 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMenu}
            className="rounded-full border border-border bg-muted p-2 text-muted-foreground hover:text-foreground lg:hidden"
          >
            <Menu size={18} />
          </button>
          <div className="rounded-full bg-muted p-2 text-muted-foreground">
            <Search size={16} />
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search insights, KPIs, anomalies"
            className="w-[220px] sm:w-[320px]"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleNotifications}
            className="rounded-full border border-border bg-muted p-2 text-muted-foreground hover:text-foreground"
          >
            <Bell size={18} />
          </button>
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
