"use client";

import { Card } from "@/components/ui/card";
import { fetchNotifications } from "@/lib/enterpriseApi";
import { useEffect, useState } from "react";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNotifications()
      .then((data) => setItems(data.notifications || []))
      .catch((err) => setError(err.message || "Unable to load notifications"));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Alerts</p>
        <h1 className="font-display text-3xl">Notifications</h1>
      </header>

      <Card>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications.</p>
          ) : (
            items.map((item) => (
              <div key={item._id} className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
