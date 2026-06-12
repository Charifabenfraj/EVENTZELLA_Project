"use client";

import { submitIntelligentQuoteWebhook } from "@/lib/api";
import { useState } from "react";

const defaultFormData = {
  client_name: "",
  event_type: "Wedding",
  city: "Tunis",
  guests: 120,
  target_margin: 18,
  recipient_email: "",
  extra_notes: "",
};

function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function renderList(items, fallbackKey) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="empty-state">Aucune donnée disponible.</p>;
  }

  return (
    <table className="provider-table">
      <thead>
        <tr>
          {fallbackKey === "provider"
            ? ["Provider", "City", "Avg Price", "Fit Score"].map((label) => <th key={label}>{label}</th>)
            : ["Line Item", "%", "Amount"].map((label) => <th key={label}>{label}</th>)}
        </tr>
      </thead>
      <tbody>
        {items.map((item) =>
          fallbackKey === "provider" ? (
            <tr key={`${item.provider_id || item.provider}-${item.city}`}>
              <td>{item.provider}</td>
              <td>{item.city}</td>
              <td>{formatMoney(item.avg_price)}</td>
              <td>{formatPercent(Number(item.fit_score || 0) * 100)}</td>
            </tr>
          ) : (
            <tr key={item.label}>
              <td>{item.label}</td>
              <td>{item.percentage}</td>
              <td>{formatMoney(item.amount)}</td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}

export default function IntelligentQuoteWorkflowPage() {
  const [formData, setFormData] = useState(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);

  const onChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmitWebhook = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");
    setResult(null);

    try {
      const payload = {
        client_name: String(formData.client_name || "").trim(),
        event_type: String(formData.event_type || "Wedding"),
        city: String(formData.city || "Tunis").trim(),
        guests: Number(formData.guests || 0),
        target_margin: Number(formData.target_margin || 18),
        recipient_email: String(formData.recipient_email || "").trim(),
        extra_notes: String(formData.extra_notes || "").trim(),
      };

      const response = await submitIntelligentQuoteWebhook(payload);
      setResult(response);
      setStatus("Workflow Intelligent Quote envoyé avec succès.");
    } catch (err) {
      setError(err.message || "Erreur webhook Intelligent Quote.");
    } finally {
      setLoading(false);
    }
  };

  const quote = result?.quote_id ? result : null;
  const lineItems = quote?.line_items || [];
  const providerAlternatives = quote?.provider_alternatives || [];

  return (
    <section>
      <div className="hero-block compact">
        <p className="eyebrow">n8n Workflow Trigger</p>
        <h2>Intelligent Quote Generator</h2>
        <p>
          Cette page déclenche le workflow n8n <strong>eventzella/intelligent-quote</strong>.
        </p>
        <p>
          Le workflow appelle le modèle de devis intelligent, enregistre le résultat dans MySQL et envoie un email HTML.
        </p>
      </div>

      <form className="model-form" onSubmit={onSubmitWebhook}>
        <label className="field">
          <span>Client Name</span>
          <input
            type="text"
            placeholder="Acme Events"
            value={formData.client_name}
            onChange={(event) => onChange("client_name", event.target.value)}
          />
        </label>

        <label className="field">
          <span>Event Type</span>
          <select value={formData.event_type} onChange={(event) => onChange("event_type", event.target.value)}>
            <option value="Birthday">Birthday</option>
            <option value="Corporate Event">Corporate Event</option>
            <option value="Private Party">Private Party</option>
            <option value="Wedding">Wedding</option>
          </select>
        </label>

        <label className="field">
          <span>City</span>
          <input
            type="text"
            placeholder="Tunis"
            value={formData.city}
            onChange={(event) => onChange("city", event.target.value)}
          />
        </label>

        <label className="field">
          <span>Guests</span>
          <input
            type="number"
            min="1"
            step="1"
            value={formData.guests}
            onChange={(event) => onChange("guests", event.target.value)}
          />
        </label>

        <label className="field">
          <span>Target Margin (%)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={formData.target_margin}
            onChange={(event) => onChange("target_margin", event.target.value)}
          />
        </label>

        <label className="field">
          <span>Recipient Email</span>
          <input
            type="email"
            placeholder="sales@eventzella.com"
            value={formData.recipient_email}
            onChange={(event) => onChange("recipient_email", event.target.value)}
          />
        </label>

        <label className="field field-full">
          <span>Extra Notes</span>
          <textarea
            rows="4"
            placeholder="VIP setup, premium decor, late-night service..."
            value={formData.extra_notes}
            onChange={(event) => onChange("extra_notes", event.target.value)}
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="gold-button" disabled={loading}>
            {loading ? "Webhook..." : "Lancer Workflow Intelligent Quote"}
          </button>
        </div>
      </form>

      {error && <p className="status-error">{error}</p>}
      {status && <p className="status-ok">{status}</p>}

      {quote && (
        <article className="result-card result-highlight">
          <h3>Intelligent Quote Result</h3>
          <p>
            Quote ID: <strong>{quote.quote_id}</strong> | Client: <strong>{quote.client_name}</strong>
          </p>
          <p>
            Event: <strong>{quote.event_type}</strong> in <strong>{quote.city}</strong> | Guests: <strong>{quote.guests}</strong>
          </p>

          <div className="metric-grid">
            <div className="metric-box">
              <p>Base Cost</p>
              <strong>{formatMoney(quote.base_estimated_cost)}</strong>
            </div>
            <div className="metric-box">
              <p>Margin Value</p>
              <strong>{formatMoney(quote.margin_value)}</strong>
            </div>
            <div className="metric-box">
              <p>Total Quote</p>
              <strong>{formatMoney(quote.total_quote)}</strong>
            </div>
          </div>

          <p>
            Margin Target: <strong>{formatPercent(quote.target_margin_percent)}</strong>
          </p>

          <h4>Quote Breakdown</h4>
          {renderList(lineItems, "line")}

          <h4>Provider Alternatives</h4>
          {renderList(providerAlternatives, "provider")}

          <h4>AI Summary</h4>
          <p className="forecast-insight">{quote.llm_summary}</p>

          {quote.notes && (
            <p>
              <strong>Notes:</strong> {quote.notes}
            </p>
          )}
        </article>
      )}

      {result && !quote && (
        <article className="result-card result-highlight">
          <h3>Webhook Response</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </article>
      )}
    </section>
  );
}
