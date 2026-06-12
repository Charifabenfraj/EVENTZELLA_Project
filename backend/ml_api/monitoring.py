import json
import logging
import os
import threading
import time
from pathlib import Path
from typing import Any

import mlflow
import numpy as np
import pandas as pd
from prometheus_client import Counter, Gauge, Histogram, generate_latest
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("eventzella.monitoring")

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)
REQUEST_LATENCY = Histogram(
    "http_request_latency_seconds",
    "HTTP request latency in seconds",
    ["method", "path"],
)
REQUEST_INFLIGHT = Gauge(
    "http_requests_in_flight",
    "In-flight HTTP requests",
)

MODEL_PREDICTION_COUNT = Counter(
    "model_predictions_total",
    "Total model prediction calls",
    ["model_key", "status"],
)
MODEL_PREDICTION_LATENCY = Histogram(
    "model_prediction_latency_seconds",
    "Model prediction latency in seconds",
    ["model_key"],
)
MODEL_CONFIDENCE = Gauge(
    "model_prediction_confidence",
    "Latest model confidence score",
    ["model_key"],
)
MODEL_MISSING_RATE = Gauge(
    "model_missing_rate",
    "Missing value rate in inputs",
    ["model_key"],
)
MODEL_DRIFT_SCORE = Gauge(
    "model_drift_score",
    "Simple drift score based on mean shift",
    ["model_key"],
)
MODEL_ACCURACY = Gauge(
    "model_accuracy_current",
    "Latest model accuracy metric",
    ["model_key"],
)
MODEL_ACCURACY_BASELINE = Gauge(
    "model_accuracy_baseline",
    "Baseline accuracy metric",
    ["model_key"],
)
DATA_FRESHNESS_SECONDS = Gauge(
    "data_freshness_seconds",
    "Seconds since last observation",
    ["model_key"],
)
ALERT_FLAG = Gauge(
    "monitoring_alert_active",
    "Alert flags raised by monitoring",
    ["alert"],
)
SIMULATION_STATE = Gauge(
    "simulation_state",
    "Active simulation scenarios",
    ["scenario"],
)

_last_seen: dict[str, float] = {}
_baselines_lock = threading.Lock()
_baselines: dict[str, dict[str, float]] = {}
_last_mlflow_sync = 0.0
_mlflow_cache: dict[str, float] = {}

DEFAULT_BASELINES = {
    "cancellation_rate_model": 0.9,
    "xgboost_price_regression": 0.85,
    "chatbot_intent_classifier": 0.85,
    "complaint_risk_model": 0.85,
}


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _data_dir() -> Path:
    return _project_root().parent / "data"


def _load_baselines() -> dict[str, dict[str, float]]:
    global _baselines
    with _baselines_lock:
        if _baselines:
            return _baselines

        baselines: dict[str, dict[str, float]] = {}
        data_dir = _data_dir()

        cancellation_path = data_dir / "training_cancellation_data.csv"
        if cancellation_path.exists():
            df = pd.read_csv(cancellation_path)
            for col in ["budget", "final_price"]:
                if col in df.columns:
                    baselines.setdefault("cancellation_rate_model", {})[col] = float(df[col].mean())

        price_path = data_dir / "training_price_data.csv"
        if price_path.exists():
            df = pd.read_csv(price_path)
            for col in ["guests", "budget", "final_price"]:
                if col in df.columns:
                    baselines.setdefault("xgboost_price_regression", {})[col] = float(df[col].mean())

        _baselines = baselines
        return _baselines


def _safe_number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not np.isfinite(number):
        return None
    return number


def _compute_drift_score(model_key: str, payload: dict[str, Any]) -> float | None:
    baselines = _load_baselines()
    baseline = baselines.get(model_key)
    if not baseline:
        return None

    diffs = []
    for field, mean_value in baseline.items():
        current = _safe_number(payload.get(field))
        if current is None or mean_value == 0:
            continue
        diffs.append(abs(current - mean_value) / abs(mean_value))

    if not diffs:
        return None

    return float(np.mean(diffs))


def _sync_mlflow_metrics(tracking_uri: str, ttl_seconds: int = 60) -> None:
    global _last_mlflow_sync, _mlflow_cache
    now = time.time()
    if now - _last_mlflow_sync < ttl_seconds:
        return

    try:
        mlflow.set_tracking_uri(tracking_uri)
        client = mlflow.tracking.MlflowClient()
        experiments = client.search_experiments()
        metrics: dict[str, float] = {}
        for exp in experiments:
            runs = client.search_runs(
                experiment_ids=[exp.experiment_id],
                max_results=1,
                order_by=["attribute.start_time DESC"],
            )
            if not runs:
                continue
            latest = runs[0]
            for key in ["accuracy", "f1_weighted", "r2_score"]:
                value = latest.data.metrics.get(key)
                if isinstance(value, (int, float)):
                    metrics[exp.name] = float(value)
                    break
        _mlflow_cache = metrics
        _last_mlflow_sync = now
    except Exception as exc:
        logger.warning("MLflow sync failed: %s", exc)


def record_request(method: str, path: str, status: int, latency: float) -> None:
    REQUEST_COUNT.labels(method=method, path=path, status=str(status)).inc()
    REQUEST_LATENCY.labels(method=method, path=path).observe(latency)


def record_inflight(delta: int) -> None:
    REQUEST_INFLIGHT.inc(delta)


def record_model_observation(
    model_key: str,
    payload: dict[str, Any],
    result: dict[str, Any] | None,
    latency: float,
    tracking_uri: str,
) -> None:
    MODEL_PREDICTION_LATENCY.labels(model_key=model_key).observe(latency)

    status = "success" if result is not None else "error"
    MODEL_PREDICTION_COUNT.labels(model_key=model_key, status=status).inc()

    if payload:
        missing_rate = _compute_missing_rate(model_key, payload)
        if missing_rate is not None:
            MODEL_MISSING_RATE.labels(model_key=model_key).set(missing_rate)

        drift_score = _compute_drift_score(model_key, payload)
        if drift_score is not None:
            MODEL_DRIFT_SCORE.labels(model_key=model_key).set(drift_score)
            if drift_score > 0.2:
                ALERT_FLAG.labels(alert="drift").set(1)
                logger.warning("Drift detected for %s (score=%.3f)", model_key, drift_score)
            else:
                ALERT_FLAG.labels(alert="drift").set(0)

    confidence = _extract_confidence(result)
    if confidence is not None:
        MODEL_CONFIDENCE.labels(model_key=model_key).set(confidence)

    _last_seen[model_key] = time.time()
    DATA_FRESHNESS_SECONDS.labels(model_key=model_key).set(0.0)

    _sync_mlflow_metrics(tracking_uri)
    _update_accuracy_gauges(model_key)


def _extract_confidence(result: dict[str, Any] | None) -> float | None:
    if not result:
        return None
    probabilities = result.get("probabilities")
    if isinstance(probabilities, dict) and probabilities:
        try:
            return max(float(value) for value in probabilities.values())
        except (TypeError, ValueError):
            return None
    return None


def _compute_missing_rate(model_key: str, payload: dict[str, Any]) -> float | None:
    required_fields = _required_fields(model_key)
    if not required_fields:
        return None

    missing = 0
    for field in required_fields:
        value = payload.get(field)
        if value is None or str(value).strip() == "":
            missing += 1

    return float(missing / len(required_fields))


def _required_fields(model_key: str) -> list[str]:
    from .model_service import MODEL_REGISTRY

    meta = MODEL_REGISTRY.get(model_key)
    if not meta:
        return []

    fields = meta.get("input_schema", {}).get("fields", [])
    required = [field.get("name") for field in fields if field.get("required")]
    return [field for field in required if field]


def _update_accuracy_gauges(model_key: str) -> None:
    baseline = DEFAULT_BASELINES.get(model_key)
    if baseline is not None:
        MODEL_ACCURACY_BASELINE.labels(model_key=model_key).set(float(baseline))

    accuracy = _mlflow_cache.get(_experiment_name_for_model(model_key))
    if accuracy is not None:
        MODEL_ACCURACY.labels(model_key=model_key).set(float(accuracy))
        if baseline is not None and accuracy < baseline - 0.05:
            ALERT_FLAG.labels(alert="accuracy_degradation").set(1)
            logger.warning("Accuracy degradation for %s: %.4f", model_key, accuracy)
        else:
            ALERT_FLAG.labels(alert="accuracy_degradation").set(0)


def _experiment_name_for_model(model_key: str) -> str:
    from .training.config import EXPERIMENT_NAMES

    mapping = {
        "cancellation_rate_model": EXPERIMENT_NAMES.get("cancellation_rate", ""),
        "xgboost_price_regression": EXPERIMENT_NAMES.get("price_regression", ""),
        "chatbot_intent_classifier": EXPERIMENT_NAMES.get("chatbot_intent", ""),
        "complaint_risk_model": EXPERIMENT_NAMES.get("complaint_risk", ""),
    }
    return mapping.get(model_key, "")


def refresh_freshness() -> None:
    now = time.time()
    for key, last_seen in list(_last_seen.items()):
        DATA_FRESHNESS_SECONDS.labels(model_key=key).set(max(0.0, now - last_seen))


def metrics_payload() -> bytes:
    refresh_freshness()
    return generate_latest()


def simulate_scenario(name: str, duration_seconds: int = 10, error_rate: float = 0.1) -> None:
    SIMULATION_STATE.labels(scenario=name).set(1)
    start = time.time()
    while time.time() - start < duration_seconds:
        REQUEST_COUNT.labels(method="SIM", path="/simulate", status="200").inc()
        REQUEST_LATENCY.labels(method="SIM", path="/simulate").observe(1.2)
        MODEL_PREDICTION_COUNT.labels(model_key="cancellation_rate_model", status="success").inc()
        MODEL_PREDICTION_LATENCY.labels(model_key="cancellation_rate_model").observe(0.8)
        if np.random.rand() < error_rate:
            REQUEST_COUNT.labels(method="SIM", path="/simulate", status="500").inc()
        time.sleep(0.2)
    SIMULATION_STATE.labels(scenario=name).set(0)


def log_anomaly(message: str, payload: dict[str, Any] | None = None) -> None:
    if payload:
        logger.warning("%s | payload=%s", message, json.dumps(payload, ensure_ascii=True))
    else:
        logger.warning("%s", message)


class PrometheusMiddleware(MiddlewareMixin):
    def process_request(self, _request):
        record_inflight(1)
        return None

    def process_response(self, request, response):
        record_inflight(-1)
        start = getattr(request, "_monitoring_start", None)
        if start is not None:
            latency = max(0.0, time.time() - start)
            record_request(request.method, request.path, response.status_code, latency)
        return response

    def process_exception(self, request, _exception):
        record_inflight(-1)
        start = getattr(request, "_monitoring_start", None)
        if start is not None:
            latency = max(0.0, time.time() - start)
            record_request(request.method, request.path, 500, latency)
        return None

    def __call__(self, request):
        request._monitoring_start = time.time()
        return super().__call__(request)
