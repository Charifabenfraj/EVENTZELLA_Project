"use client";

import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Preferences</p>
        <h1 className="font-display text-3xl">Workspace settings</h1>
      </header>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Real-time refresh</p>
            <p className="text-sm text-muted-foreground">Auto-refresh dashboards every minute.</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Weekly executive digest</p>
            <p className="text-sm text-muted-foreground">Receive summary updates by email.</p>
          </div>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Audit logging</p>
            <p className="text-sm text-muted-foreground">Keep detailed action trails for compliance.</p>
          </div>
          <Switch defaultChecked />
        </div>
      </Card>
    </div>
  );
}
