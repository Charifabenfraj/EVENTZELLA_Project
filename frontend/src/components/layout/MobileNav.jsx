"use client";

import { roleDefinitions } from "@/lib/roleConfig";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import Link from "next/link";

export default function MobileNav({ open, onClose, navigation, role }) {
  if (!open) return null;
  const roleMeta = roleDefinitions[role] || roleDefinitions.ceo;

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden">
      <div className="h-full w-[80%] max-w-sm bg-card p-6 shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Eventzella</p>
            <h2 className="font-display text-xl">Enterprise Hub</h2>
          </div>
          <button className="rounded-full border border-border p-2" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-muted/60 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{roleMeta.name}</p>
          <p className="text-xs text-muted-foreground">{roleMeta.description}</p>
        </div>

        <nav className="mt-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
