"use client";

import { Card } from "@/components/ui/card";
import { fetchActivityLogs } from "@/lib/enterpriseApi";
import { useEffect, useState } from "react";

export default function ActivityPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchActivityLogs()
      .then((data) => setLogs(data.logs || []))
      .catch((err) => setError(err.message || "Unable to load activity"));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Audit trail</p>
        <h1 className="font-display text-3xl">Recent activity</h1>
      </header>

      <Card>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity logs available.</p>
          ) : (
            logs.map((log) => (
              <div key={log._id} className="rounded-xl border border-border bg-muted/50 p-3">
                <p className="text-sm font-semibold text-foreground">{log.action}</p>
                <p className="text-xs text-muted-foreground">{log.entity}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
