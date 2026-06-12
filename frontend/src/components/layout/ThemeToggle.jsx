"use client";

import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-2">
      <Sun size={14} className={isDark ? "text-muted-foreground" : "text-warning"} />
      <Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
      <Moon size={14} className={isDark ? "text-accent" : "text-muted-foreground"} />
    </div>
  );
}
