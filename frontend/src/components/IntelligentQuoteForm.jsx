"use client";

import { Card } from "@/components/ui/card";
import { submitIntelligentQuoteWebhook } from "@/lib/api";
import { useState } from "react";

export default function IntelligentQuoteForm() {
  const [formData, setFormData] = useState({
    client_name: "John Doe",
    event_type: "wedding",
    event_date: "2025-06-15",
    guest_count: "150",
    budget_range: "5000-10000",
    location: "Tunis",
    specific_requirements: "Photography, Catering, Decoration",
  });

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState("");

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const onSubmitWebhook = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setWebhookStatus("");

    try {
      const response = await submitIntelligentQuoteWebhook(formData);
      setResult(response);
      setWebhookStatus("✅ Webhook executed successfully!");
    } catch (err) {
      setError(err.message || "Error submitting webhook");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Intelligent Quote Generator</h2>
        <p className="text-muted-foreground">
          Fill in the event details below and the AI will generate intelligent quotes and provider recommendations.
        </p>
      </section>

      <form onSubmit={onSubmitWebhook} className="space-y-6">
        <Card className="p-6 space-y-4 border border-border">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Client Name</span>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => handleChange("client_name", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                placeholder="Client Name"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Event Type</span>
              <select
                value={formData.event_type}
                onChange={(e) => handleChange("event_type", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
              >
                <option value="wedding">Wedding</option>
                <option value="conference">Conference</option>
                <option value="birthday">Birthday</option>
                <option value="corporate">Corporate Event</option>
                <option value="product_launch">Product Launch</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Event Date</span>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => handleChange("event_date", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Guest Count</span>
              <input
                type="number"
                value={formData.guest_count}
                onChange={(e) => handleChange("guest_count", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                placeholder="150"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Budget Range (TND)</span>
              <input
                type="text"
                value={formData.budget_range}
                onChange={(e) => handleChange("budget_range", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                placeholder="5000-10000"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Location</span>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                placeholder="Tunis"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Specific Requirements</span>
            <textarea
              value={formData.specific_requirements}
              onChange={(e) => handleChange("specific_requirements", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
              placeholder="Photography, Catering, Decoration..."
              rows="3"
            />
          </label>
        </Card>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-accent text-accent-foreground rounded-md font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Generating Quote..." : "Generate Intelligent Quote"}
          </button>
        </div>
      </form>

      {error && (
        <Card className="p-4 border border-danger/50 bg-danger/5">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {webhookStatus && (
        <Card className="p-4 border border-green-500/50 bg-green-50/10">
          <p className="text-sm text-green-600 dark:text-green-400">{webhookStatus}</p>
        </Card>
      )}

      {result && (
        <Card className="p-6 border border-border space-y-6">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-4">Quote Result</h3>

            {/* Raw JSON Display */}
            {typeof result === "object" && (
              <div className="space-y-4">
                {/* Quote ID */}
                {result.quote_id && (
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-sm font-medium text-muted-foreground">Quote ID</p>
                    <p className="text-lg font-bold text-foreground">{result.quote_id}</p>
                  </div>
                )}

                {/* Client Name */}
                {result.client_name && (
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-sm font-medium text-muted-foreground">Client</p>
                    <p className="text-lg font-bold text-foreground">{result.client_name}</p>
                  </div>
                )}

                {/* AI Summary */}
                {result.llm_summary && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-md">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">AI Summary</p>
                    <p className="text-foreground whitespace-pre-wrap">{result.llm_summary}</p>
                  </div>
                )}

                {/* Provider Alternatives */}
                {result.provider_alternatives && Array.isArray(result.provider_alternatives) && result.provider_alternatives.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground mb-3">Provider Alternatives</p>
                    <div className="space-y-2">
                      {result.provider_alternatives.map((provider, idx) => (
                        <div key={idx} className="border border-border rounded-md p-4 bg-card">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-foreground">{provider.provider || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">{provider.service_type || "Service"}</p>
                            </div>
                            {provider.fit_score !== undefined && (
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Fit Score</p>
                                <p className="text-lg font-bold text-accent">
                                  {parseFloat(provider.fit_score).toFixed(1)}%
                                </p>
                              </div>
                            )}
                          </div>
                          {provider.estimated_price && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Estimated Price: </span>
                              <span className="font-semibold text-foreground">
                                {parseFloat(provider.estimated_price).toFixed(2)} TND
                              </span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total Estimated Cost */}
                {result.total_estimated_cost && (
                  <div className="bg-brand/10 border border-brand/30 p-4 rounded-md">
                    <p className="text-sm font-medium text-muted-foreground">Total Estimated Cost</p>
                    <p className="text-2xl font-bold text-brand">{parseFloat(result.total_estimated_cost).toFixed(2)} TND</p>
                  </div>
                )}

                {/* Notes */}
                {result.notes && (
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                    <p className="text-foreground whitespace-pre-wrap">{result.notes}</p>
                  </div>
                )}

                {/* Raw JSON for debugging */}
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Raw JSON Response
                  </summary>
                  <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-x-auto text-muted-foreground">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
