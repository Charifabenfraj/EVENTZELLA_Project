"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchEnterprise } from "@/lib/enterpriseApi";
import { useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  const onSearch = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await searchEnterprise(query);
      setResults(data.results || []);
    } catch (err) {
      setError(err.message || "Search failed");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Unified search</p>
        <h1 className="font-display text-3xl">Search intelligence assets</h1>
      </header>

      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onSearch}>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search logs, alerts, insights" />
          <Button type="submit">Search</Button>
        </form>
      </Card>

      <Card>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="space-y-3">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results yet.</p>
          ) : (
            results.map((item, index) => (
              <div key={`${item.type}-${index}`} className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.type}</p>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
