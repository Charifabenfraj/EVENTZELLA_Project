"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchNotifications, markNotificationRead } from "@/lib/enterpriseApi";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export default function NotificationDrawer({ open, onClose }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetchNotifications()
      .then((data) => setItems(data.notifications || []))
      .catch((err) => setError(err.message || "Failed to load notifications"));
  }, [open]);

  const handleRead = async (id) => {
    await markNotificationRead(id);
    setItems((prev) => prev.map((item) => (item._id === id ? { ...item, readAt: new Date() } : item)));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/40 px-4 py-6 backdrop-blur-sm">
      <Card className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Notifications</p>
            <h3 className="text-lg font-semibold">Live executive alerts</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications available.</p>
          ) : (
            items.map((item) => (
              <div
                key={item._id}
                className="rounded-xl border border-border bg-muted/40 p-3 text-sm"
              >
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="text-muted-foreground">{item.message}</p>
                {!item.readAt && (
                  <button
                    type="button"
                    onClick={() => handleRead(item._id)}
                    className="mt-2 text-xs font-semibold text-brand"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
