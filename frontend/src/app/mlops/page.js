"use client";

import { fetchMlopsStatus, triggerMlopsRetrain } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

function formatBytes(value) {
  const number = Number(value || 0);
  if (!number) return "0 B";
  if (number < 1024) return `${number} B`;
  if (number < 1024 * 1024) return `${(number / 1024).toFixed(1)} KB`;
  return `${(number / (1024 * 1024)).toFixed(2)} MB`;
}

function formatMetric(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  if (Math.abs(num) >= 1000) {
    return num.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  }
  if (Math.abs(num) >= 10) return num.toFixed(2);
  return num.toFixed(4);
}

function isLowerBetter(metricName) {
  return /(rmse|mae|mape|loss|error)/i.test(String(metricName || ""));
}

function computeTrend(values, metricName) {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) return null;
  const first = finite[0];
  const last = finite[finite.length - 1];
  const base = Math.abs(first) > 1e-9 ? Math.abs(first) : 1;
  const rawDeltaPct = ((last - first) / base) * 100;
  const score = isLowerBetter(metricName) ? -rawDeltaPct : rawDeltaPct;
  return {
    score,
    label: `${score >= 0 ? "+" : ""}${score.toFixed(1)}%`,
  };
}

function Sparkline({ values }) {
  const points = useMemo(() => {
    const finite = values.filter((v) => Number.isFinite(v));
    if (finite.length < 2) return "";
    const width = 220;
    const height = 62;
    const padding = 8;
    const min = Math.min(...finite);
    const max = Math.max(...finite);
    const span = max - min || 1;

    return finite
      .map((value, index) => {
        const x = padding + (index / (finite.length - 1)) * (width - padding * 2);
        const y = height - padding - ((value - min) / span) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }, [values]);

  if (!points) {
    return <p className="status-muted">Pas assez de runs pour tracer une tendance.</p>;
  }

  return (
    <svg className="mlflow-sparkline" viewBox="0 0 220 62" role="img" aria-label="MLflow trend chart">
      <rect x="0" y="0" width="220" height="62" rx="10" className="mlflow-sparkline-bg" />
      <polyline fill="none" points={points} className="mlflow-sparkline-line" />
    </svg>
  );
}

export default function MlopsPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchMlopsStatus();
      setStatus(data);
    } catch (err) {
      setError(err.message || "Impossible de charger le statut MLOps.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const onRetrain = async () => {
    setActionLoading(true);
    setMessage("");
    setError("");
    try {
      const data = await triggerMlopsRetrain();
      if (data.status === "running") {
        setMessage("Un retrain est deja en cours.");
      } else {
        setMessage("Retrain lance avec succes.");
      }
      await loadStatus();
    } catch (err) {
      setError(err.message || "Erreur retrain.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section>
      <div className="hero-block compact">
        <p className="eyebrow">MLOps Control</p>
        <h2>Deployment & Retrain</h2>
        <p>Surveille les modeles charges, les datasets de training et les derniers runs MLflow.</p>
      </div>

      <div className="model-form">
        <div className="form-actions">
          <button type="button" className="gold-button" onClick={onRetrain} disabled={actionLoading}>
            {actionLoading ? "Retrain..." : "Lancer Retrain"}
          </button>
          <button type="button" className="ghost-button" onClick={loadStatus} disabled={loading}>
            {loading ? "Refresh..." : "Rafraichir"}
          </button>
          <a
            className="ghost-button"
            href={status?.mlflow?.ui_url || "http://localhost:5000"}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir MLflow UI
          </a>
        </div>
      </div>

      {message && <p className="status-ok">{message}</p>}
      {error && <p className="status-error">{error}</p>}

      {!status && !loading && !error ? <p>Aucun statut disponible.</p> : null}

      {status && (
        <>
          <article className="result-card result-highlight">
            <h3>Retrain Status</h3>
            <p>
              Etat: <strong>{status.retrain?.state || "-"}</strong>
            </p>
            <p>
              Start: <strong>{status.retrain?.started_at || "-"}</strong> | End: <strong>{status.retrain?.ended_at || "-"}</strong>
            </p>
            {status.retrain?.last_error ? (
              <p className="status-error">Derniere erreur: {status.retrain.last_error}</p>
            ) : null}
          </article>

          <article className="result-card result-highlight">
            <h3>Datasets (real training data)</h3>
            <div className="metric-grid">
              <div className="metric-box">
                <p>Cancellation rows</p>
                <strong>{status.datasets?.training_cancellation_data_rows ?? 0}</strong>
              </div>
              <div className="metric-box">
                <p>Price rows</p>
                <strong>{status.datasets?.training_price_data_rows ?? 0}</strong>
              </div>
              <div className="metric-box">
                <p>Provider rows</p>
                <strong>{status.datasets?.provider_budget_data_rows ?? 0}</strong>
              </div>
            </div>
          </article>

          <article className="result-card result-highlight">
            <h3>Model Files in Deployment</h3>
            <div className="provider-table-wrap">
              <table className="provider-table">
                <thead>
                  <tr>
                    <th>Model Key</th>
                    <th>Filename</th>
                    <th>Exists</th>
                    <th>Size</th>
                  </tr>
                </thead>
                <tbody>
                  {(status.models || []).map((item) => (
                    <tr key={item.key || item.filename}>
                      <td>{item.key || "-"}</td>
                      <td>{item.filename}</td>
                      <td>{item.exists ? "Yes" : "No"}</td>
                      <td>{formatBytes(item.size_bytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="result-card result-highlight">
            <h3>MLflow Experiments (latest run)</h3>
            <div className="mlflow-chart-grid">
              {(status.mlflow?.experiments || []).map((exp, index) => {
                const metricNames = exp.metric_names?.length
                  ? exp.metric_names
                  : Object.keys(exp.latest_metrics || {});
                const chronologicalRuns = [...(exp.recent_runs || [])].reverse();

                return (
                  <div className="mlflow-experiment-card" key={`${exp.experiment_id || "exp"}-${index}`}>
                    <div className="mlflow-exp-header">
                      <h4>{exp.name || exp.error || "-"}</h4>
                      <p>
                        Run: <strong>{exp.latest_run_id || "-"}</strong> | Status: <strong>{exp.latest_run_status || "-"}</strong>
                      </p>
                    </div>

                    {exp.error ? <p className="status-error">{exp.error}</p> : null}

                    {!metricNames.length ? (
                      <p className="status-muted">Aucune metrique numerique disponible.</p>
                    ) : (
                      <div className="mlflow-metric-grid">
                        {metricNames.map((metricName) => {
                          const values = chronologicalRuns.map((run) => Number(run?.metrics?.[metricName]));
                          const trend = computeTrend(values, metricName);
                          return (
                            <div className="mlflow-metric-card" key={`${exp.experiment_id}-${metricName}`}>
                              <div className="mlflow-metric-row">
                                <span>{metricName}</span>
                                <strong>{formatMetric(exp.latest_metrics?.[metricName])}</strong>
                              </div>
                              <Sparkline values={values} />
                              <div className="mlflow-metric-row small">
                                <span>{chronologicalRuns.length} runs</span>
                                {trend ? (
                                  <span className={trend.score >= 0 ? "status-ok" : "status-error"}>{trend.label}</span>
                                ) : (
                                  <span className="status-muted">-</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        </>
      )}
    </section>
  );
}
