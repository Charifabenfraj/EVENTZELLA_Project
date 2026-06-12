"use client";

import {
    fetchModels,
    predictModel,
    submitDemandForecastWebhook,
    submitEventDateWeatherWebhook,
    submitIntelligentQuoteWebhook,
    submitProviderBudgetWebhook,
    submitTrainingSample,
} from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

function shouldRenderField(field, formData) {
  if (field.name === "label") {
    return (formData.action || "encode") === "encode";
  }

  if (field.name === "code") {
    return (formData.action || "encode") === "decode";
  }

  return true;
}

function toPercent(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return "0.00%";
  }
  return `${number.toFixed(2)}%`;
}

function formatTnd(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return "-";
  }
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(number)} TND`;
}

function formatFitScore(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return "0.0%";
  }
  return `${number.toFixed(1)}%`;
}

function getFitScoreBadgeClass(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return "fit-badge fit-badge-low";
  }
  if (number >= 85) {
    return "fit-badge fit-badge-high";
  }
  if (number >= 70) {
    return "fit-badge fit-badge-medium";
  }
  return "fit-badge fit-badge-low";
}

function renderPlainText(text) {
  const value = String(text || "").trim();
  if (!value) {
    return null;
  }

  const paragraphs = value.split(/\n\n+/);
  return paragraphs.map((paragraph, paragraphIndex) => {
    const lines = paragraph.split("\n");
    return (
      <p key={`pack-paragraph-${paragraphIndex}`} className="ai-pack-paragraph">
        {lines.map((line, lineIndex) => (
          <span key={`pack-line-${paragraphIndex}-${lineIndex}`}>
            {line}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    );
  });
}

function renderCancellationResult(result) {
  return (
    <article className="result-card result-highlight">
      <h3>Cancellation Rate</h3>
      <div className="metric-grid">
        <div className="metric-box">
          <p>Cancel Probability</p>
          <strong>{toPercent(result.cancel_probability)}</strong>
        </div>
        <div className="metric-box">
          <p>Keep Probability</p>
          <strong>{toPercent(result.keep_probability)}</strong>
        </div>
      </div>
      <p>
        Risk Level: <strong>{result.risk_level}</strong> | Decision: <strong>{result.decision}</strong>
      </p>
    </article>
  );
}

function renderKmeansResult(result) {
  const profile = result.cluster_profile || {};
  const allClusters = result.all_clusters || [];

  return (
    <article className="result-card result-highlight">
      <h3>KMeans Cluster Result</h3>
      <p>
        Assigned Cluster: <strong>{result.cluster_name}</strong> (ID {result.cluster_id})
      </p>
      <p>
        Typical guests: <strong>{profile.centroid_guests ?? "-"}</strong> | Typical price: <strong>{profile.centroid_price ?? "-"}</strong>
      </p>

      <div className="cluster-list">
        {allClusters.map((cluster) => (
          <div
            key={cluster.cluster_id}
            className={cluster.cluster_id === result.cluster_id ? "cluster-item cluster-item-active" : "cluster-item"}
          >
            <p>
              <strong>{cluster.cluster_name}</strong> (ID {cluster.cluster_id})
            </p>
            <p>
              Guests center: {cluster.centroid_guests} | Price center: {cluster.centroid_price}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function renderProviderResult(result) {
  const recommendations = result.recommendations || [];
  const aiPackSuggestion = result.ai_package_suggestion || "";
  const request = result.request || {};
  const audit = result.audit || {};
  const showAlert = Boolean(audit.alert_recommended);
  const alertReasons = Array.isArray(audit.alert_reasons) ? audit.alert_reasons : [];

  const budgetValue = request.budget ?? result.budget;
  const eventTypeValue = request.event_type ?? result.event_type;
  const cityValue = request.city ?? result.city;

  return (
    <article className="result-card result-highlight">
      <h3>Recommended Providers</h3>

      {showAlert && (
        <div className="audit-warning-banner" role="alert">
          <strong>Audit Warning:</strong> {alertReasons.length > 0 ? alertReasons.join(" | ") : "Recommendation requires attention."}
        </div>
      )}

      <div className="request-summary-row">
        <span>Budget: <strong>{budgetValue != null ? formatTnd(budgetValue) : "-"}</strong></span>
        <span>Event type: <strong>{eventTypeValue || "-"}</strong></span>
        <span>City: <strong>{cityValue || "-"}</strong></span>
      </div>

      <div className="provider-table-wrap">
        <table className="provider-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Provider Service Type</th>
              <th>City</th>
              <th>Avg Price</th>
              <th>Gap</th>
              <th>Fit Score</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((provider) => (
              <tr key={`${provider.provider_id ?? "na"}-${provider.provider ?? "unknown"}-${provider.city ?? "na"}`}>
                <td>{provider.provider}</td>
                <td>{provider.provider_service_type || "-"}</td>
                <td>{provider.city}</td>
                <td className="numeric-cell">{formatTnd(provider.avg_price)}</td>
                <td className="numeric-cell">{formatTnd(provider.price_gap)}</td>
                <td>
                  <span className={getFitScoreBadgeClass(provider.fit_score)}>{formatFitScore(provider.fit_score)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {aiPackSuggestion && (
        <section className="ai-pack-card">
          <h4>AI Suggested Pack</h4>
          <div className="ai-pack-content">{renderPlainText(aiPackSuggestion)}</div>
        </section>
      )}
    </article>
  );
}

function normalizeProviderRecommendations(recommendations, table) {
  const rows = Array.isArray(table?.rows) ? table.rows : [];

  const tableLookup = new Map();
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 3) {
      continue;
    }

    const providerName = String(row[0] ?? "").trim().toLowerCase();
    const providerCity = String(row[2] ?? "").trim().toLowerCase();
    const serviceType = String(row[1] ?? "").trim();
    if (!providerName) {
      continue;
    }

    tableLookup.set(`${providerName}::${providerCity}`, serviceType);
    tableLookup.set(providerName, serviceType);
  }

  return (Array.isArray(recommendations) ? recommendations : []).map((item) => {
    const providerName = String(item?.provider ?? "").trim().toLowerCase();
    const providerCity = String(item?.city ?? "").trim().toLowerCase();
    const fromTable = tableLookup.get(`${providerName}::${providerCity}`) || tableLookup.get(providerName) || "";
    const fromRecommendation = String(item?.provider_service_type ?? "").trim();

    return {
      ...item,
      provider_service_type: fromRecommendation && fromRecommendation !== "-" ? fromRecommendation : fromTable || "-",
    };
  });
}

function normalizeWebhookProviderResponse(response, fallbackRequest = {}) {
  const fallbackShape = {
    budget: fallbackRequest.budget,
    event_type: fallbackRequest.event_type,
    city: fallbackRequest.city,
    top_k: fallbackRequest.top_k,
    recommendations: [],
  };

  if (Array.isArray(response)) {
    return {
      result: {
        ...fallbackShape,
        recommendations: normalizeProviderRecommendations(response, null),
      },
      audit: {},
    };
  }

  if (response && Array.isArray(response.recommendations)) {
    const normalizedRecommendations = normalizeProviderRecommendations(response.recommendations, response.table);
    return {
      result: {
        ...response,
        recommendations: normalizedRecommendations,
      },
      audit: response.audit || {},
    };
  }

  if (response?.result && Array.isArray(response.result.recommendations)) {
    const normalizedRecommendations = normalizeProviderRecommendations(response.result.recommendations, response.table);
    return {
      result: {
        ...response.result,
        recommendations: normalizedRecommendations,
        ai_package_suggestion: response.ai_package_suggestion || response.result.ai_package_suggestion || "",
      },
      audit: response.audit || {},
    };
  }

  if (response?.raw_result && Array.isArray(response.raw_result.recommendations)) {
    const normalizedRecommendations = normalizeProviderRecommendations(response.raw_result.recommendations, response.table);
    return {
      result: {
        ...response.raw_result,
        recommendations: normalizedRecommendations,
        ai_package_suggestion: response.ai_package_suggestion || "",
      },
      audit: response.audit || {},
    };
  }

  if (response && (response.provider || response.provider_id)) {
    return {
      result: {
        ...fallbackShape,
        recommendations: [response],
      },
      audit: {},
    };
  }

  return {
    result: fallbackShape,
    audit: {},
  };
}

function renderIntentResult(result) {
  const topIntents = result.top_intents || [];

  return (
    <article className="result-card result-highlight">
      <h3>Chatbot Intent</h3>
      <p>
        Predicted intent: <strong>{result.predicted_intent}</strong> | Confidence: <strong>{toPercent(result.confidence_percent)}</strong>
      </p>

      <div className="intent-list">
        {topIntents.map((item) => (
          <div className="intent-item" key={item.intent}>
            <div className="intent-row">
              <span>{item.intent}</span>
              <strong>{toPercent(item.confidence)}</strong>
            </div>
            <div className="intent-bar">
              <span style={{ width: `${Math.max(2, Number(item.confidence) || 0)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function renderComplaintResult(result) {
  return (
    <article className="result-card result-highlight">
      <h3>Complaint Risk</h3>
      <div className="metric-grid">
        <div className="metric-box">
          <p>Complaint Probability</p>
          <strong>{toPercent(result.risk_probability)}</strong>
        </div>
        <div className="metric-box">
          <p>No Complaint Probability</p>
          <strong>{toPercent(result.safe_probability)}</strong>
        </div>
      </div>
      <p>
        Risk Level: <strong>{result.risk_level}</strong> | Decision: <strong>{result.decision}</strong>
      </p>
    </article>
  );
}

function renderEventDateResult(result) {
  const dates = result.recommended_dates || [];
  const weatherCity = result.weather_city;
  const weatherRows = result.best_dates || result.suggested_dates_weather || [];
  const showPrecipitation = result.show_precipitation !== false;
  const eventRecommendations = Array.isArray(result.event_recommendations) ? result.event_recommendations : [];
  const topDate = result.next_recommended_date;
  const topDateExplanation = result.top_recommended_explanation;
  const preferredMonth = Number(result.preferred_month || 0);

  return (
    <article className="result-card result-highlight">
      <h3>Recommended Event Dates</h3>
      <p>
        Event type: <strong>{result.event_type}</strong> | Suggestions: <strong>{result.count}</strong>
      </p>
      {weatherCity && (
        <p>
          Weather city: <strong>{weatherCity}</strong>
        </p>
      )}
      {preferredMonth >= 1 && preferredMonth <= 12 && (
        <p>
          Preferred month: <strong>{preferredMonth}</strong>
        </p>
      )}
      {result.next_recommended_date && (
        <p>
          Next suggested date: <strong>{result.next_recommended_date}</strong>
        </p>
      )}
      {topDate && (
        <section className="top-date-card">
          <h4>Top Recommended Date</h4>
          <p>
            <strong>{topDate}</strong>
          </p>
          {topDateExplanation && <p>{topDateExplanation}</p>}
        </section>
      )}

      <div className="date-chip-list">
        {dates.map((value) => (
          <span className="date-chip" key={value}>
            {value}
          </span>
        ))}
      </div>

      {showPrecipitation && weatherRows.length > 0 && (
        <div className="provider-table-wrap" style={{ marginTop: "14px" }}>
          <table className="provider-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Weather Score</th>
                <th>Weather Summary</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {weatherRows.map((row) => (
                <tr key={`weather-row-${row.date}`}>
                  <td>{row.date || "-"}</td>
                  <td>{row.score ?? row.weather_score ?? "-"}</td>
                  <td>{row.weather_summary || "-"}</td>
                  <td>{row.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.ai_weather_suggestion && (
        <section className="ai-pack-card">
          <h4>AI Date Recommendation</h4>
          <div className="ai-pack-content">{renderPlainText(result.ai_weather_suggestion)}</div>
        </section>
      )}
      {eventRecommendations.length > 0 && (
        <section className="ai-pack-card">
          <h4>Event Recommendations</h4>
          <ul className="event-recommendation-list">
            {eventRecommendations.map((item, index) => (
              <li key={`event-reco-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      {result.weather_notice && <p className="forecast-insight">{result.weather_notice}</p>}
    </article>
  );
}

function renderSvdResult(result) {
  const items = result.recommended_items || [];

  return (
    <article className="result-card result-highlight">
      <h3>SVD Recommendations</h3>
      <p>
        Recommender: <strong>{result.recommender_type}</strong> | {result.summary}
      </p>
      <ol className="svd-list">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ol>
    </article>
  );
}

function renderRegressionResult(result) {
  return (
    <article className="result-card result-highlight">
      <h3>Price Regression Result</h3>
      <div className="metric-grid">
        <div className="metric-box">
          <p>Estimated Price</p>
          <strong>{result.estimated_price}</strong>
        </div>
        <div className="metric-box">
          <p>Price per Guest</p>
          <strong>{result.price_per_guest ?? "-"}</strong>
        </div>
      </div>
      <p>
        Budget band: <strong>{result.budget_band}</strong> | Event type selected: <strong>{result.meta?.event_type_selected || result.input?.event_type || "-"}</strong>
      </p>
      <p>
        City used: <strong>{result.input?.city || "-"}</strong> | Guests: <strong>{result.input?.guests || "-"}</strong>
      </p>
    </article>
  );
}

function renderDemandForecastResult(result) {
  const historical = result.historical_points || [];
  const forecast = result.forecast_points || [];
  const peakMonths = result.peak_forecast_months || [];
  const actions = result.actions || {};
  const alerts = Array.isArray(result.alerts) ? result.alerts : [];
  const priorityActions = Array.isArray(result.priority_actions) ? result.priority_actions : [];
  const riskWatchlist = Array.isArray(result.risk_watchlist) ? result.risk_watchlist : [];
  const kpis = result.kpis || {};
  const cityFilterRequested = Boolean(String(result.city || "").trim());
  const eventTypeFilterRequested = Boolean(String(result.event_type || "").trim());
  const cityFilterApplied = result.city_filter_applied !== false;
  const eventTypeFilterApplied = result.event_type_filter_applied !== false;

  const maxValue = Math.max(
    1,
    ...historical.map((item) => Number(item.demand) || 0),
    ...forecast.map((item) => Number(item.predicted_demand) || 0)
  );

  return (
    <article className="result-card result-highlight">
      <h3>Demand Forecast Analytics</h3>
      <p>
        Trend: <strong>{result.trend}</strong> | Horizon: <strong>{result.forecast_horizon} months</strong> | City: <strong>{result.city || "All"}</strong> | Event type: <strong>{result.event_type || "All"}</strong>
      </p>
      {(cityFilterRequested && !cityFilterApplied) || (eventTypeFilterRequested && !eventTypeFilterApplied) ? (
        <p className="status-error" style={{ marginTop: "8px" }}>
          Selected filter has no matching historical data. Showing closest available scope.
        </p>
      ) : null}
      {result.demand_pressure && (
        <p>
          Demand pressure: <strong>{result.demand_pressure}</strong>
        </p>
      )}

      {(kpis.avg_history_demand != null || kpis.max_predicted_demand != null || kpis.growth_percent != null) && (
        <div className="metric-grid">
          <div className="metric-box">
            <p>Avg History</p>
            <strong>{kpis.avg_history_demand ?? "-"}</strong>
          </div>
          <div className="metric-box">
            <p>Max Predicted</p>
            <strong>{kpis.max_predicted_demand ?? "-"}</strong>
          </div>
          <div className="metric-box">
            <p>Growth %</p>
            <strong>{kpis.growth_percent ?? "-"}%</strong>
          </div>
        </div>
      )}

      <div className="forecast-grid">
        <div className="forecast-column">
          <h4>Historical demand</h4>
          {historical.map((item) => (
            <div key={`h-${item.month}`} className="forecast-row">
              <span>{item.month}</span>
              <div className="forecast-bar-track">
                <div className="forecast-bar forecast-bar-historical" style={{ width: `${(item.demand / maxValue) * 100}%` }} />
              </div>
              <strong>{item.demand}</strong>
            </div>
          ))}
        </div>

        <div className="forecast-column">
          <h4>Forecast demand</h4>
          {forecast.map((item) => (
            <div key={`f-${item.month}`} className="forecast-row">
              <span>{item.month}</span>
              <div className="forecast-bar-track">
                <div className="forecast-bar forecast-bar-future" style={{ width: `${(item.predicted_demand / maxValue) * 100}%` }} />
              </div>
              <strong>{item.predicted_demand}</strong>
            </div>
          ))}
        </div>
      </div>

      <p className="forecast-insight">{result.insight}</p>

      {(actions.pricing || actions.staffing || actions.marketing) && (
        <section className="ai-pack-card">
          <h4>Suggested Actions</h4>
          <ul className="event-recommendation-list">
            {actions.pricing && <li>Pricing: {actions.pricing}</li>}
            {actions.staffing && <li>Staffing: {actions.staffing}</li>}
            {actions.marketing && <li>Marketing: {actions.marketing}</li>}
          </ul>
        </section>
      )}

      {result.ai_insight && (
        <section className="ai-pack-card">
          <h4>AI Executive Insight</h4>
          <div className="ai-pack-content">{renderPlainText(result.ai_insight)}</div>
        </section>
      )}

      {priorityActions.length > 0 && (
        <section className="ai-pack-card">
          <h4>Priority Actions</h4>
          <ul className="event-recommendation-list">
            {priorityActions.map((item, index) => (
              <li key={`priority-action-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {riskWatchlist.length > 0 && (
        <section className="ai-pack-card">
          <h4>Risk Watchlist</h4>
          <ul className="event-recommendation-list">
            {riskWatchlist.map((item, index) => (
              <li key={`risk-watch-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {alerts.length > 0 && (
        <section className="ai-pack-card">
          <h4>Alerts</h4>
          <ul className="event-recommendation-list">
            {alerts.map((item, index) => (
              <li key={`forecast-alert-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {peakMonths.length > 0 && (
        <div className="date-chip-list">
          {peakMonths.map((item) => (
            <span className="date-chip" key={item.month}>
              Peak {item.month}: {item.predicted_demand}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function renderQuoteGeneratorResult(result) {
  const lineItems = result.line_items || [];
  const alternatives = result.provider_alternatives || [];

  return (
    <article className="result-card result-highlight">
      <h3>Intelligent Quote</h3>
      <p>
        Quote ID: <strong>{result.quote_id}</strong> | Client: <strong>{result.client_name}</strong>
      </p>

      <div className="metric-grid">
        <div className="metric-box">
          <p>Base Cost</p>
          <strong>{result.base_estimated_cost}</strong>
        </div>
        <div className="metric-box">
          <p>Margin Value</p>
          <strong>{result.margin_value}</strong>
        </div>
      </div>

      <p>
        Total Quote: <strong>{result.total_quote}</strong> | Margin: <strong>{toPercent(result.target_margin_percent)}</strong> | Event: <strong>{result.event_type}</strong> in <strong>{result.city}</strong>
      </p>

      <div className="provider-table-wrap">
        <table className="provider-table">
          <thead>
            <tr>
              <th>Line Item</th>
              <th>%</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.label}>
                <td>{item.label}</td>
                <td>{item.percentage}</td>
                <td>{item.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {alternatives.length > 0 && (
        <>
          <h4>Provider Alternatives</h4>
          <div className="provider-table-wrap">
            <table className="provider-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>City</th>
                  <th>Avg Price</th>
                  <th>Fit Score</th>
                </tr>
              </thead>
              <tbody>
                {alternatives.map((provider) => (
                  <tr key={`${provider.provider_id}-${provider.provider}`}>
                    <td>{provider.provider}</td>
                    <td>{provider.city}</td>
                    <td>{provider.avg_price}</td>
                    <td>{toPercent(provider.fit_score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="forecast-insight">{result.llm_summary}</p>
    </article>
  );
}

function renderPlanningCopilotResult(result) {
  const requirements = result.extracted_requirements || {};
  const steps = result.plan_steps || [];
  const providers = result.providers || [];
  const dates = result.recommended_dates || [];

  return (
    <article className="result-card result-highlight">
      <h3>Planning Copilot Output</h3>
      <p>{result.request_text}</p>

      <div className="metric-grid">
        <div className="metric-box">
          <p>Event Type</p>
          <strong>{requirements.event_type || "-"}</strong>
        </div>
        <div className="metric-box">
          <p>City</p>
          <strong>{requirements.city || "-"}</strong>
        </div>
      </div>

      <p>
        Guests: <strong>{requirements.guests || "-"}</strong> | Budget: <strong>{requirements.budget || "-"}</strong> | Estimated price: <strong>{result.estimated_price}</strong>
      </p>

      {dates.length > 0 && (
        <div className="date-chip-list">
          {dates.map((value) => (
            <span className="date-chip" key={value}>
              {value}
            </span>
          ))}
        </div>
      )}

      <ol className="copilot-steps">
        {steps.map((step, index) => (
          <li key={`step-${index}`}>{step}</li>
        ))}
      </ol>

      {providers.length > 0 && (
        <div className="provider-table-wrap">
          <table className="provider-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>City</th>
                <th>Avg Price</th>
                <th>Fit Score</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={`${provider.provider_id}-${provider.provider}`}>
                  <td>{provider.provider}</td>
                  <td>{provider.city}</td>
                  <td>{provider.avg_price}</td>
                  <td>{toPercent(provider.fit_score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.llm_plan && <p className="forecast-insight">{result.llm_plan}</p>}
    </article>
  );
}

function renderGenericResult(result) {
  return (
    <article className="result-card">
      <h3>Resultat</h3>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </article>
  );
}

export default function ModelTestForm({ modelId }) {
  const [models, setModels] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState("");
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState("");
  const [pageError, setPageError] = useState("");
  const [trainingCancelledLabel, setTrainingCancelledLabel] = useState("0");
  const [trainingRegressionTarget, setTrainingRegressionTarget] = useState("");

  useEffect(() => {
    let active = true;

    fetchModels()
      .then((data) => {
        if (!active) return;
        const allModels = data.models || [];
        setModels(allModels);

        const selected = allModels.find((item) => item.key === modelId);
        if (selected) {
          setFormData(selected.sample_input || {});
        }
      })
      .catch((err) => {
        if (!active) return;
        setPageError(err.message || "Impossible de charger les modèles.");
      });

    return () => {
      active = false;
    };
  }, [modelId]);

  const model = useMemo(() => models.find((item) => item.key === modelId), [models, modelId]);

  if (pageError) {
    return <p className="status-error">{pageError}</p>;
  }

  if (!model) {
    return <p>Chargement du modèle...</p>;
  }

  const fields = model.input_schema?.fields || [];
  const isEventDateModel = model.key === "event_date_model";
  const eventDateMlFieldNames = ["event_type"];
  const eventDateN8nFieldNames = ["city", "preferred_month", "months_ahead", "top_n_dates", "include_precipitation", "ai_suggestion"];
  const mlFields = isEventDateModel
    ? fields.filter((field) => eventDateMlFieldNames.includes(field.name))
    : fields;
  const n8nFields = isEventDateModel
    ? fields.filter((field) => eventDateN8nFieldNames.includes(field.name))
    : [];

  const onChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const onUseSample = () => {
    setFormData(model.sample_input || {});
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setWebhookStatus("");
    setTrainingStatus("");
    setResult(null);

    try {
      const payload =
        model.key === "event_date_model"
          ? {
              event_type: formData.event_type || model.sample_input?.event_type || "Wedding",
            }
          : formData;

      const response = await predictModel(model.key, payload);
      setResult(response.result);
    } catch (err) {
      setError(err.message || "Erreur de prédiction.");
    } finally {
      setLoading(false);
    }
  };

  const renderFieldInput = (field) => {
    if (!shouldRenderField(field, formData)) {
      return null;
    }

    const value = formData[field.name] ?? "";

    if (field.type === "select") {
      const isScrollableSelect = Boolean(field.scrollable);
      return (
        <label className="field" key={field.name}>
          <span>{field.label}</span>
          <select
            className={isScrollableSelect ? "scrollable-select" : ""}
            size={isScrollableSelect ? field.visible_rows || 8 : undefined}
            value={value}
            required={field.required}
            onChange={(event) => onChange(field.name, event.target.value)}
          >
            <option value="">Select...</option>
            {(field.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === "textarea") {
      return (
        <label className="field" key={field.name}>
          <span>{field.label}</span>
          <textarea
            rows={5}
            required={field.required}
            placeholder={field.placeholder || ""}
            value={value}
            onChange={(event) => onChange(field.name, event.target.value)}
          />
        </label>
      );
    }

    return (
      <label className="field" key={field.name}>
        <span>{field.label}</span>
        <input
          type={field.type === "number" ? "number" : "text"}
          required={field.required}
          step={field.step}
          placeholder={field.placeholder || ""}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      </label>
    );
  };

  const onSubmitWebhook = async () => {
    if (model.key !== "provider_budget_model") {
      return;
    }

    setWebhookLoading(true);
    setError("");
    setWebhookStatus("");
    setResult(null);

    try {
      const response = await submitProviderBudgetWebhook(formData);
      const normalized = normalizeWebhookProviderResponse(response, formData);
      setResult({
        ...normalized.result,
        audit: normalized.audit || {},
      });

      const audit = normalized.audit;
      if (audit.alert_recommended) {
        const reasons = Array.isArray(audit.alert_reasons) ? audit.alert_reasons.join(" | ") : "Alert recommended";
        setWebhookStatus(`Webhook OK - Audit saved (ID: ${audit.record_id || "-"}) - ALERT: ${reasons}`);
      } else {
        setWebhookStatus(`Webhook OK${audit.record_id ? ` - Audit saved (ID: ${audit.record_id})` : ""}`);
      }
    } catch (err) {
      setError(err.message || "Erreur webhook n8n.");
    } finally {
      setWebhookLoading(false);
    }
  };

  const onSaveTrainingSample = async () => {
    if (!["cancellation_rate_model", "xgboost_price_regression"].includes(model.key)) {
      return;
    }

    setTrainingLoading(true);
    setError("");
    setTrainingStatus("");

    try {
      let payload;

      if (model.key === "cancellation_rate_model") {
        const budgetVal = parseFloat(String(formData.budget ?? "").replace(/,/g, "."));
        const finalPriceVal = parseFloat(String(formData.final_price ?? "").replace(/,/g, "."));

        if (!formData.event_type) {
          throw new Error("Veuillez sélectionner un type d'événement.");
        }
        if (Number.isNaN(budgetVal)) {
          throw new Error("Le champ Budget doit être un nombre valide (ex: 15000).");
        }
        if (Number.isNaN(finalPriceVal)) {
          throw new Error("Le champ Final Price doit être un nombre valide.");
        }

        payload = {
          event_type: formData.event_type,
          budget: budgetVal,
          final_price: finalPriceVal,
          cancelled: trainingCancelledLabel,
        };
      } else {
        // xgboost_price_regression
        const guestsVal = parseInt(String(formData.guests ?? ""), 10);
        const budgetVal = formData.budget !== undefined && formData.budget !== ""
          ? parseFloat(String(formData.budget).replace(/,/g, "."))
          : 0;
        const finalPriceVal = parseFloat(String(trainingRegressionTarget ?? "").replace(/,/g, "."));

        if (!formData.event_type) {
          throw new Error("Veuillez sélectionner un type d'événement.");
        }
        if (!formData.city) {
          throw new Error("Veuillez sélectionner une ville.");
        }
        if (Number.isNaN(guestsVal) || guestsVal <= 0) {
          throw new Error("Le champ Guests doit être un entier positif.");
        }
        if (Number.isNaN(finalPriceVal) || finalPriceVal <= 0) {
          throw new Error("Veuillez entrer le prix réel final (valeur target) — ex: 12500.");
        }

        payload = {
          event_type: formData.event_type,
          guests: guestsVal,
          city: formData.city,
          budget: Number.isNaN(budgetVal) ? 0 : budgetVal,
          final_price: finalPriceVal,
        };
      }

      const response = await submitTrainingSample(model.key, payload);
      setTrainingStatus(
        `✅ Sample sauvegardé ! Total dataset: ${response.row_count} ligne(s) dans ${
          model.key === "xgboost_price_regression" ? "training_price_data.csv" : "training_cancellation_data.csv"
        }. Relancez le pipeline pour ré-entraîner.`
      );

      if (model.key === "xgboost_price_regression") {
        setTrainingRegressionTarget("");
      }
    } catch (err) {
      setError(err.message || "Erreur d'enregistrement du sample training.");
    } finally {
      setTrainingLoading(false);
    }
  };

  const onSubmitEventDateWeatherWebhook = async () => {
    if (model.key !== "event_date_model") {
      return;
    }

    setWebhookLoading(true);
    setError("");
    setWebhookStatus("");
    setResult(null);

    try {
      const monthsAheadRaw = Number(formData.months_ahead ?? 1);
      const topNDatesRaw = Number(formData.top_n_dates ?? 10);
      const monthsAhead = Number.isFinite(monthsAheadRaw) ? Math.max(0, Math.floor(monthsAheadRaw)) : 1;
      const topNDates = Number.isFinite(topNDatesRaw) ? Math.min(30, Math.max(1, Math.floor(topNDatesRaw))) : 10;
      const includePrecipitation = String(formData.include_precipitation || "yes") === "yes";
      const askAiSuggestion = String(formData.ai_suggestion || "no") === "yes";
      const preferredMonthRaw = Number(formData.preferred_month || 0);
      const preferredMonth = Number.isFinite(preferredMonthRaw) ? Math.min(12, Math.max(0, Math.floor(preferredMonthRaw))) : 0;

      const payload = {
        event_type: formData.event_type || model.sample_input?.event_type || "Wedding",
        city: formData.city || "Tunis",
        preferred_month: preferredMonth,
        months_ahead: monthsAhead,
        top_n_dates: topNDates,
        include_precipitation: includePrecipitation ? "yes" : "no",
        ai_suggestion: askAiSuggestion ? "yes" : "no",
      };

      const response = await submitEventDateWeatherWebhook(payload);

      const aiRecommendation =
        response.ai_recommendation && typeof response.ai_recommendation === "object" ? response.ai_recommendation : {};

      const rawWeatherRows = Array.isArray(aiRecommendation.best_dates)
        ? aiRecommendation.best_dates
        : Array.isArray(response.best_dates)
          ? response.best_dates
          : Array.isArray(response.suggested_dates_weather)
            ? response.suggested_dates_weather
            : Array.isArray(response.combined_candidates)
              ? response.combined_candidates
              : [];

      const normalizedWeatherRows = rawWeatherRows
        .filter((item) => item && item.date)
        .map((item) => {
          const score = item.score ?? item.weather_score ?? null;
          const precipitation = item.precipitation_probability_max;
          const temp = item.temperature_2m_max;
          const weatherSummary =
            item.weather_summary ||
            ((temp != null || precipitation != null)
              ? `Temp ${temp ?? "-"}°C, pluie ${precipitation ?? "-"}%`
              : "-");

          return {
            ...item,
            score,
            weather_score: score,
            weather_summary: weatherSummary,
            reason: item.reason || (score != null ? "Bonne condition météo basée sur le score" : "-"),
          };
        });

      const workflowTopNRaw = Number(response.top_n_dates ?? topNDates);
      const workflowTopN = Number.isFinite(workflowTopNRaw) ? Math.min(30, Math.max(1, Math.floor(workflowTopNRaw))) : topNDates;
      const weatherRows = normalizedWeatherRows.slice(0, workflowTopN);

      const weatherDates = Array.isArray(response.recommended_dates)
        ? response.recommended_dates.slice(0, workflowTopN)
        : Array.isArray(aiRecommendation.best_dates)
          ? aiRecommendation.best_dates.map((item) => item?.date).filter(Boolean).slice(0, workflowTopN)
        : weatherRows.map((item) => item.date).filter(Boolean);
      const weatherNotice = String(response.weather_notice || "").trim();

      const topRecommendedDateValue =
        (typeof response.top_recommended_date === "object"
          ? response.top_recommended_date?.date
          : response.top_recommended_date) ||
        aiRecommendation.top_recommended_date?.date;
      const topRecommendedExplanation =
        (typeof response.top_recommended_date === "object"
          ? String(response.top_recommended_date?.explanation || "").trim()
          : "") || String(aiRecommendation.top_recommended_date?.explanation || "").trim();

      const rawText = String(response.raw_text || aiRecommendation.raw_text || "").trim();

      const aiWeatherSuggestion = String(
        response.ai_weather_suggestion || response.ai_suggestion || response.reply || rawText || ""
      ).trim();

      setResult({
        event_type: payload.event_type,
        count: weatherDates.length,
        recommended_dates: weatherDates,
        next_recommended_date: topRecommendedDateValue || response.next_recommended_date || weatherDates[0] || null,
        top_recommended_explanation: topRecommendedExplanation,
        weather_context: response.weather_context || [],
        suggested_dates_weather: weatherRows,
        best_dates: weatherRows,
        show_precipitation: includePrecipitation,
        ai_weather_suggestion: aiWeatherSuggestion,
        event_recommendations: Array.isArray(response.event_recommendations)
          ? response.event_recommendations
          : Array.isArray(aiRecommendation.event_recommendations)
            ? aiRecommendation.event_recommendations
            : [],
        raw_text: rawText,
        weather_notice: weatherNotice,
        weather_city: response.city_resolved || response.request?.city_resolved || payload.city,
        preferred_month: response.preferred_month || payload.preferred_month || 0,
      });

      setWebhookStatus(
        `Webhook météo OK - ${weatherDates.length} date(s)${(response.city_resolved || response.request?.city_resolved) ? ` - Ville résolue: ${response.city_resolved || response.request.city_resolved}` : ""}`
      );
    } catch (err) {
      setError(err.message || "Erreur webhook météo n8n.");
    } finally {
      setWebhookLoading(false);
    }
  };

  const onSubmitDemandForecastWebhook = async () => {
    if (model.key !== "demand_forecast_ai") {
      return;
    }

    setWebhookLoading(true);
    setError("");
    setWebhookStatus("");
    setResult(null);

    try {
      const horizonRaw = Number(formData.forecast_horizon ?? model.sample_input?.forecast_horizon ?? 6);
      const forecastHorizon = Number.isFinite(horizonRaw) ? Math.min(18, Math.max(1, Math.floor(horizonRaw))) : 6;
      const city = String(formData.city ?? model.sample_input?.city ?? "").trim();
      const eventType = String(formData.event_type ?? model.sample_input?.event_type ?? "").trim();

      const payload = {
        city,
        event_type: eventType,
        forecast_horizon: forecastHorizon,
        ai_suggestion: "yes",
        alert_peak_threshold: 25,
      };

      const response = await submitDemandForecastWebhook(payload);
      setResult({
        ...response,
        city: response.city || city,
        event_type: response.event_type || eventType,
        forecast_horizon: response.forecast_horizon || forecastHorizon,
      });

      setWebhookStatus(
        `Webhook demand forecast OK - City: ${response.city || city || "All"} - Event: ${response.event_type || eventType || "All"} - Trend: ${response.trend || "-"} - Pressure: ${response.demand_pressure || "-"}`
      );
    } catch (err) {
      setError(err.message || "Erreur webhook n8n Demand Forecast.");
    } finally {
      setWebhookLoading(false);
    }
  };

  const onSubmitIntelligentQuoteWebhook = async () => {
    if (model.key !== "intelligent_quote_generator") {
      return;
    }

    setWebhookLoading(true);
    setError("");
    setWebhookStatus("");
    setResult(null);

    try {
      const payload = {
        client_name: formData.client_name || "Client",
        event_type: formData.event_type || "",
        city: formData.city || "",
        guests: Number(formData.guests) || 0,
        budget_range: formData.budget_range || "",
        target_margin: Number(formData.target_margin) || 18,
        extra_notes: formData.extra_notes || "",
      };

      const response = await submitIntelligentQuoteWebhook(payload);
      
      setResult({
        quote_id: response.quote_id || "N/A",
        client_name: response.client_name || payload.client_name,
        event_type: response.event_type || payload.event_type,
        city: response.city || payload.city,
        guests: response.guests || payload.guests,
        base_estimated_cost: response.base_estimated_cost || 0,
        margin_value: response.margin_value || 0,
        target_margin_percent: response.target_margin_percent || payload.target_margin,
        total_quote: response.total_quote || 0,
        line_items: response.line_items || [],
        provider_alternatives: response.provider_alternatives || [],
        llm_summary: response.llm_summary || "",
        notes: response.notes || "",
      });

      setWebhookStatus(
        `Webhook Intelligent Quote OK - Quote ID: ${response.quote_id || "N/A"} - Total: ${response.total_quote || 0}`
      );
    } catch (err) {
      setError(err.message || "Erreur webhook n8n Intelligent Quote.");
    } finally {
      setWebhookLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) {
      return null;
    }

    if (model.key === "cancellation_rate_model") {
      return renderCancellationResult(result);
    }

    if (model.key === "kmeans_clustering") {
      return renderKmeansResult(result);
    }

    if (model.key === "provider_budget_model") {
      return renderProviderResult(result);
    }

    if (model.key === "chatbot_intent_classifier") {
      return renderIntentResult(result);
    }

    if (model.key === "complaint_risk_model") {
      return renderComplaintResult(result);
    }

    if (model.key === "event_date_model") {
      return renderEventDateResult(result);
    }

    if (model.key === "svd_collaborative_filter") {
      return renderSvdResult(result);
    }

    if (model.key === "xgboost_price_regression") {
      return renderRegressionResult(result);
    }

    if (model.key === "demand_forecast_ai") {
      return renderDemandForecastResult(result);
    }

    if (model.key === "intelligent_quote_generator") {
      return renderQuoteGeneratorResult(result);
    }

    if (model.key === "planning_copilot") {
      return renderPlanningCopilotResult(result);
    }

    return renderGenericResult(result);
  };

  return (
    <section>
      <div className="hero-block compact">
        <p className="eyebrow">Test unitaire modèle</p>
        <h2>{model.display_name}</h2>
        <p>{model.description}</p>
        <p className="model-file">Fichier: {model.filename}</p>
      </div>

      {isEventDateModel ? (
        <>
          <form className="model-form" onSubmit={onSubmit}>
            <p className="form-section-title">ML Standard (en haut)</p>
            {mlFields.map(renderFieldInput)}

            <div className="form-actions">
              <button type="button" className="ghost-button" onClick={onUseSample}>
                Charger exemple
              </button>
              <button type="submit" className="gold-button" disabled={loading}>
                {loading ? "Prédiction..." : "Lancer test modèle"}
              </button>
            </div>
          </form>

          <form className="model-form model-form-n8n" onSubmit={(event) => event.preventDefault()}>
            <p className="form-section-title">Workflow n8n (en bas)</p>
            {n8nFields.map(renderFieldInput)}

            <div className="form-actions">
              <button
                type="button"
                className="gold-button"
                onClick={onSubmitEventDateWeatherWebhook}
                disabled={webhookLoading}
              >
                {webhookLoading ? "Webhook météo..." : "Tester webhook météo"}
              </button>
            </div>
          </form>
        </>
      ) : (
        <form className="model-form" onSubmit={onSubmit}>
          {fields.map(renderFieldInput)}

          {model.key === "cancellation_rate_model" && (
            <div className="field">
              <span>Label terrain (cancelled) pour training</span>
              <select
                value={trainingCancelledLabel}
                onChange={(event) => setTrainingCancelledLabel(event.target.value)}
              >
                <option value="0">0 - Non annulé</option>
                <option value="1">1 - Annulé</option>
              </select>
            </div>
          )}



          <div className="form-actions">
            <button type="button" className="ghost-button" onClick={onUseSample}>
              Charger exemple
            </button>
            {model.key === "cancellation_rate_model" && (
              <button type="button" className="ghost-button" onClick={onSaveTrainingSample} disabled={trainingLoading}>
                {trainingLoading ? "Sauvegarde sample..." : "Sauver sample training"}
              </button>
            )}
            {model.key === "provider_budget_model" && (
              <button type="button" className="ghost-button" onClick={onSubmitWebhook} disabled={webhookLoading}>
                {webhookLoading ? "Webhook..." : "Submit Webhook n8n"}
              </button>
            )}
            {model.key === "demand_forecast_ai" && (
              <button type="button" className="ghost-button" onClick={onSubmitDemandForecastWebhook} disabled={webhookLoading}>
                {webhookLoading ? "Webhook forecast..." : "Tester webhook demand forecast"}
              </button>
            )}
            {model.key === "intelligent_quote_generator" && (
              <button type="button" className="ghost-button" onClick={onSubmitIntelligentQuoteWebhook} disabled={webhookLoading}>
                {webhookLoading ? "Webhook quote..." : "Submit Webhook n8n"}
              </button>
            )}
            <button type="submit" className="gold-button" disabled={loading}>
              {loading ? "Prédiction..." : "Lancer test modèle"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="status-error">{error}</p>}
      {webhookStatus && <p className="status-ok">{webhookStatus}</p>}
      {trainingStatus && <p className="status-ok">{trainingStatus}</p>}

      {renderResult()}
    </section>
  );
}
