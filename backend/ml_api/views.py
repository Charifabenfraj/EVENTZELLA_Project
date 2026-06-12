import json
import os
import csv
import math
import sqlite3
import socket
import threading
import time
import urllib.error
import urllib.request
from typing import Any
from pathlib import Path
from datetime import datetime, timezone as dt_timezone
import logging

import mlflow
from django.http import HttpRequest, JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.utils import timezone

from .model_service import ModelService
from . import monitoring

logger = logging.getLogger("eventzella.monitoring")


_retrain_state_lock = threading.Lock()
_retrain_state: dict[str, Any] = {
    "state": "idle",
    "started_at": None,
    "ended_at": None,
    "last_error": None,
    "last_result": None,
}


def _iso_now() -> str:
    return datetime.now(dt_timezone.utc).isoformat()


def _epoch_ms_to_iso(epoch_ms: int | None) -> str | None:
    if not epoch_ms:
        return None
    try:
        return datetime.fromtimestamp(epoch_ms / 1000, tz=dt_timezone.utc).isoformat()
    except Exception:
        return None


def _safe_metric_value(value: Any) -> float | None:
    if not isinstance(value, (int, float)):
        return None
    number = float(value)
    if not math.isfinite(number):
        return None
    return number


def _get_mlops_tracking_uri() -> str:
    configured = str(os.getenv("MLFLOW_TRACKING_URI", "")).strip()
    if configured:
        return configured
    return f"file:{settings.BASE_DIR / 'mlruns'}"


def _count_csv_rows(csv_path: Path) -> int:
    if not csv_path.exists():
        return 0
    with csv_path.open("r", encoding="utf-8") as file:
        return max(0, sum(1 for _ in file) - 1)


def _run_retrain_job() -> None:
    with _retrain_state_lock:
        _retrain_state["state"] = "running"
        _retrain_state["started_at"] = _iso_now()
        _retrain_state["ended_at"] = None
        _retrain_state["last_error"] = None
        _retrain_state["last_result"] = None

    try:
        from ml_api.training.train_models import train_all_models

        result = train_all_models()
        with _retrain_state_lock:
            _retrain_state["state"] = "success"
            _retrain_state["ended_at"] = _iso_now()
            _retrain_state["last_result"] = result
    except Exception as exc:
        with _retrain_state_lock:
            _retrain_state["state"] = "failed"
            _retrain_state["ended_at"] = _iso_now()
            _retrain_state["last_error"] = str(exc)


@csrf_exempt
def mlops_retrain(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    with _retrain_state_lock:
        if _retrain_state["state"] == "running":
            return JsonResponse(
                {
                    "status": "running",
                    "message": "Retrain already running.",
                    "started_at": _retrain_state["started_at"],
                },
                status=409,
            )

    thread = threading.Thread(target=_run_retrain_job, daemon=True)
    thread.start()

    logger.warning("Retrain triggered via API")

    return JsonResponse({"status": "accepted", "message": "Retrain job started."}, status=202)


@csrf_exempt
def mlops_status(request: HttpRequest) -> JsonResponse:
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    with _retrain_state_lock:
        retrain_state = dict(_retrain_state)

    project_root = Path(settings.BASE_DIR).parent
    models_dir = project_root / "models"
    data_dir = project_root / "data"

    model_files = []
    for model in ModelService.list_models():
        filename = str(model.get("filename", ""))
        if not filename.endswith(".pkl"):
            continue
        model_path = models_dir / filename
        model_files.append(
            {
                "key": model.get("key"),
                "filename": filename,
                "exists": model_path.exists(),
                "size_bytes": model_path.stat().st_size if model_path.exists() else 0,
            }
        )

    datasets = {
        "training_cancellation_data_rows": _count_csv_rows(data_dir / "training_cancellation_data.csv"),
        "training_price_data_rows": _count_csv_rows(data_dir / "training_price_data.csv"),
        "provider_budget_data_rows": _count_csv_rows(data_dir / "provider_budget_data.csv"),
    }

    experiments_summary: list[dict[str, Any]] = []
    try:
        mlflow.set_tracking_uri(_get_mlops_tracking_uri())
        client = mlflow.tracking.MlflowClient()
        experiments = client.search_experiments()
        for exp in experiments:
            runs = client.search_runs(
                experiment_ids=[exp.experiment_id],
                max_results=12,
                order_by=["attribute.start_time DESC"],
            )
            latest = runs[0] if runs else None
            recent_runs: list[dict[str, Any]] = []
            metric_names: set[str] = set()
            latest_metrics: dict[str, float | None] = {}

            if latest:
                for key, value in (latest.data.metrics or {}).items():
                    if isinstance(value, (int, float)):
                        latest_metrics[str(key)] = _safe_metric_value(value)

            for run in runs:
                run_metrics: dict[str, float | None] = {}
                for key, value in (run.data.metrics or {}).items():
                    if isinstance(value, (int, float)):
                        run_metrics[str(key)] = _safe_metric_value(value)
                        metric_names.add(str(key))

                recent_runs.append(
                    {
                        "run_id": run.info.run_id,
                        "status": run.info.status,
                        "start_time": _epoch_ms_to_iso(run.info.start_time),
                        "end_time": _epoch_ms_to_iso(run.info.end_time),
                        "metrics": run_metrics,
                    }
                )

            experiments_summary.append(
                {
                    "name": exp.name,
                    "experiment_id": exp.experiment_id,
                    "latest_run_id": latest.info.run_id if latest else None,
                    "latest_run_status": latest.info.status if latest else None,
                    "latest_metrics": latest_metrics,
                    "metric_names": sorted(metric_names),
                    "recent_runs": recent_runs,
                }
            )
    except Exception as exc:
        experiments_summary = [{"error": f"MLflow status unavailable: {exc}"}]

    return JsonResponse(
        {
            "status": "ok",
            "retrain": retrain_state,
            "datasets": datasets,
            "models": model_files,
            "mlflow": {
                "tracking_uri": _get_mlops_tracking_uri(),
                "experiments": experiments_summary,
                "ui_url": str(os.getenv("MLFLOW_UI_URL", "http://localhost:5000")),
            },
        }
    )


@csrf_exempt
def health(_: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok", "service": "eventzella-ml-api"})


@csrf_exempt
def models_catalog(request: HttpRequest) -> JsonResponse:
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    models = ModelService.list_models()
    # DEBUG LOG
    price_model = next((m for m in models if m["key"] == "xgboost_price_regression"), None)
    if price_model:
        f_names = [f["name"] for f in price_model["input_schema"]["fields"]]
        print(f"DEBUG: Price Prediction Fields -> {f_names}")
    
    return JsonResponse({"models": models})


@csrf_exempt
def model_predict(request: HttpRequest, model_key: str) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    if not isinstance(payload, dict):
        return JsonResponse({"error": "JSON body must be an object"}, status=400)

    # Guardrail for clients that omit optional budget in price regression.
    if model_key == "xgboost_price_regression":
        budget = payload.get("budget")
        if budget is None or (isinstance(budget, str) and budget.strip() == ""):
            payload["budget"] = 0

    result: dict[str, Any] | None = None
    started = time.time()
    try:
        result = ModelService.predict(model_key, payload)
        return JsonResponse({"model": model_key, "result": result})
    except KeyError:
        monitoring.log_anomaly("Unknown model", {"model_key": model_key})
        return JsonResponse({"error": f"Unknown model '{model_key}'"}, status=404)
    except FileNotFoundError as exc:
        monitoring.log_anomaly("Model file missing", {"model_key": model_key, "error": str(exc)})
        return JsonResponse({"error": str(exc)}, status=500)
    except ValueError as exc:
        monitoring.log_anomaly("Invalid prediction payload", {"model_key": model_key, "error": str(exc)})
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception as exc:
        monitoring.log_anomaly("Prediction failed", {"model_key": model_key, "error": str(exc)})
        return JsonResponse({"error": f"Prediction failed: {exc}"}, status=500)
    finally:
        monitoring.record_model_observation(
            model_key=model_key,
            payload=payload,
            result=result,
            latency=max(0.0, time.time() - started),
            tracking_uri=_get_mlops_tracking_uri(),
        )


@csrf_exempt
def training_sample_ingest(request: HttpRequest, model_key: str) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    if not isinstance(payload, dict):
        return JsonResponse({"error": "JSON body must be an object"}, status=400)

    project_root = Path(settings.BASE_DIR).parent
    data_dir = project_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    if model_key == "cancellation_rate_model":
        event_type = str(payload.get("event_type", "")).strip()
        budget_raw = payload.get("budget")
        final_price_raw = payload.get("final_price")
        cancelled_raw = payload.get("cancelled")

        if not event_type:
            return JsonResponse({"error": "Field 'event_type' is required."}, status=400)

        try:
            budget = float(budget_raw)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Field 'budget' must be a valid number."}, status=400)

        try:
            final_price = float(final_price_raw)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Field 'final_price' must be a valid number."}, status=400)

        try:
            cancelled = int(float(cancelled_raw))
        except (TypeError, ValueError):
            return JsonResponse({"error": "Field 'cancelled' must be 0 or 1."}, status=400)

        if cancelled not in {0, 1}:
            return JsonResponse({"error": "Field 'cancelled' must be 0 or 1."}, status=400)

        csv_path = data_dir / "training_cancellation_data.csv"
        fieldnames = ["event_type", "budget", "final_price", "cancelled"]
        row = {
            "event_type": event_type,
            "budget": round(budget, 4),
            "final_price": round(final_price, 4),
            "cancelled": cancelled,
        }
    elif model_key == "xgboost_price_regression":
        event_type = str(payload.get("event_type", "")).strip()
        city = str(payload.get("city", "")).strip()
        guests_raw = payload.get("guests")
        budget_raw = payload.get("budget")
        final_price_raw = payload.get("final_price")

        if not event_type:
            return JsonResponse({"error": "Field 'event_type' is required."}, status=400)
        if not city:
            return JsonResponse({"error": "Field 'city' is required."}, status=400)

        try:
            guests = int(float(guests_raw))
        except (TypeError, ValueError):
            return JsonResponse({"error": "Field 'guests' must be a valid integer."}, status=400)

        # Budget est optionnel pour le training — défaut à 0.0 si absent ou vide
        try:
            budget = float(budget_raw) if budget_raw not in (None, "", "undefined", "null") else 0.0
        except (TypeError, ValueError):
            budget = 0.0

        try:
            final_price = float(final_price_raw)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Field 'final_price' (target réel) must be a valid number."}, status=400)

        csv_path = data_dir / "training_price_data.csv"
        fieldnames = ["event_type", "guests", "city", "budget", "final_price"]
        row = {
            "event_type": event_type,
            "guests": guests,
            "city": city,
            "budget": round(budget, 4),
            "final_price": round(final_price, 4),
        }
    else:
        return JsonResponse(
            {
                "error": "Training sample ingestion supports 'cancellation_rate_model' and 'xgboost_price_regression'."
            },
            status=400,
        )

    file_exists = csv_path.exists()
    with csv_path.open("a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(row)

    line_count = 0
    with csv_path.open("r", encoding="utf-8") as file:
        # Exclure l'en-tête
        line_count = max(0, sum(1 for _ in file) - 1)

    return JsonResponse(
        {
            "status": "ok",
            "model": model_key,
            "message": "Training sample saved.",
            "dataset_path": str(csv_path),
            "row_count": line_count,
            "saved_row": row,
        }
    )


@csrf_exempt
def metrics(request: HttpRequest) -> HttpResponse:
    if request.method != "GET":
        return HttpResponse(status=405)

    payload = monitoring.metrics_payload()
    return HttpResponse(payload, content_type="text/plain; version=0.0.4")


@csrf_exempt
def simulate_incident(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    scenario = str(payload.get("scenario", "high_traffic")).strip().lower()
    duration = int(payload.get("duration", 10) or 10)
    error_rate = float(payload.get("error_rate", 0.1) or 0.1)

    if scenario in {"high_traffic", "errors"}:
        thread = threading.Thread(
            target=monitoring.simulate_scenario,
            kwargs={"name": scenario, "duration_seconds": duration, "error_rate": error_rate},
            daemon=True,
        )
        thread.start()
        return JsonResponse({"status": "running", "scenario": scenario, "duration": duration})

    if scenario == "drift":
        model_key = str(payload.get("model_key", "xgboost_price_regression"))
        score = float(payload.get("score", 0.35))
        monitoring.MODEL_DRIFT_SCORE.labels(model_key=model_key).set(score)
        monitoring.ALERT_FLAG.labels(alert="drift").set(1)
        monitoring.log_anomaly("Drift simulation", {"model_key": model_key, "score": score})
        return JsonResponse({"status": "ok", "scenario": scenario, "model_key": model_key, "score": score})

    return JsonResponse({"error": "Unknown scenario"}, status=400)


def _audit_db_path() -> str:
    return str(settings.BASE_DIR / "db.sqlite3")


def _audit_db_backend() -> str:
    return str(os.getenv("AUDIT_DB_BACKEND", "sqlite")).strip().lower()


def _ensure_audit_table(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS prediction_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            workflow_name TEXT NOT NULL,
            model_key TEXT NOT NULL,
            input_json TEXT NOT NULL,
            result_json TEXT NOT NULL,
            top_provider_json TEXT,
            alert_recommended INTEGER NOT NULL DEFAULT 0,
            alert_reason TEXT
        )
        """
    )


def _ensure_event_date_audit_table(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS event_date_recommendation_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            workflow_name TEXT NOT NULL,
            run_source TEXT NOT NULL,
            city TEXT,
            event_type TEXT,
            months_ahead INTEGER,
            top_n_dates INTEGER,
            ai_enabled INTEGER NOT NULL DEFAULT 0,
            recommended_dates_json TEXT NOT NULL,
            top_recommended_date_json TEXT,
            best_dates_json TEXT,
            event_recommendations_json TEXT,
            weather_notice TEXT,
            raw_text TEXT,
            payload_json TEXT NOT NULL
        )
        """
    )


def _ensure_demand_forecast_audit_table(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS demand_forecast_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            workflow_name TEXT NOT NULL,
            run_source TEXT NOT NULL,
            city TEXT,
            event_type TEXT,
            forecast_horizon INTEGER,
            trend TEXT,
            demand_pressure TEXT,
            peak_months_json TEXT,
            actions_json TEXT,
            alerts_json TEXT,
            kpis_json TEXT,
            forecast_points_json TEXT,
            payload_json TEXT NOT NULL
        )
        """
    )


def _mysql_connection_settings() -> dict[str, Any]:
    host = str(os.getenv("AUDIT_MYSQL_HOST", "127.0.0.1")).strip() or "127.0.0.1"
    port_raw = str(os.getenv("AUDIT_MYSQL_PORT", "3306")).strip() or "3306"
    user = str(os.getenv("AUDIT_MYSQL_USER", "root")).strip() or "root"
    password = str(os.getenv("AUDIT_MYSQL_PASSWORD", "")).strip()
    database = str(os.getenv("AUDIT_MYSQL_DB", "eventzella_audit")).strip() or "eventzella_audit"

    try:
        port = int(port_raw)
    except ValueError:
        port = 3306

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "database": database,
        "charset": "utf8mb4",
        "autocommit": True,
    }


def _save_audit_mysql(
    *,
    created_at: str,
    workflow_name: str,
    model_key: str,
    input_payload: dict[str, Any],
    result_payload: dict[str, Any],
    top_provider: dict[str, Any],
    alert_recommended: bool,
    alert_reason: str,
) -> int:
    try:
        import importlib

        pymysql = importlib.import_module("pymysql")
    except Exception as exc:
        raise RuntimeError(
            "MySQL backend requires PyMySQL. Install dependencies and set AUDIT_DB_BACKEND=mysql."
        ) from exc

    connection = pymysql.connect(**_mysql_connection_settings())
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS prediction_audit_log (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    created_at VARCHAR(64) NOT NULL,
                    workflow_name VARCHAR(255) NOT NULL,
                    model_key VARCHAR(255) NOT NULL,
                    input_json LONGTEXT NOT NULL,
                    result_json LONGTEXT NOT NULL,
                    top_provider_json LONGTEXT NULL,
                    alert_recommended TINYINT(1) NOT NULL DEFAULT 0,
                    alert_reason TEXT NULL
                )
                """
            )
            cursor.execute(
                """
                INSERT INTO prediction_audit_log (
                    created_at,
                    workflow_name,
                    model_key,
                    input_json,
                    result_json,
                    top_provider_json,
                    alert_recommended,
                    alert_reason
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    created_at,
                    workflow_name,
                    model_key,
                    json.dumps(input_payload, ensure_ascii=True),
                    json.dumps(result_payload, ensure_ascii=True),
                    json.dumps(top_provider, ensure_ascii=True),
                    1 if alert_recommended else 0,
                    alert_reason,
                ),
            )
            return int(cursor.lastrowid)
    finally:
        connection.close()


def _save_audit_sqlite(
    *,
    created_at: str,
    workflow_name: str,
    model_key: str,
    input_payload: dict[str, Any],
    result_payload: dict[str, Any],
    top_provider: dict[str, Any],
    alert_recommended: bool,
    alert_reason: str,
) -> int:
    db_path = _audit_db_path()
    with sqlite3.connect(db_path) as connection:
        _ensure_audit_table(connection)
        cursor = connection.execute(
            """
            INSERT INTO prediction_audit_log (
                created_at,
                workflow_name,
                model_key,
                input_json,
                result_json,
                top_provider_json,
                alert_recommended,
                alert_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                workflow_name,
                model_key,
                json.dumps(input_payload, ensure_ascii=True),
                json.dumps(result_payload, ensure_ascii=True),
                json.dumps(top_provider, ensure_ascii=True),
                1 if alert_recommended else 0,
                alert_reason,
            ),
        )
        return int(cursor.lastrowid)


def _save_event_date_audit_mysql(
    *,
    created_at: str,
    workflow_name: str,
    run_source: str,
    city: str,
    event_type: str,
    months_ahead: int,
    top_n_dates: int,
    ai_enabled: bool,
    recommended_dates: list[str],
    top_recommended_date: dict[str, Any],
    best_dates: list[dict[str, Any]],
    event_recommendations: list[str],
    weather_notice: str,
    raw_text: str,
    payload: dict[str, Any],
) -> int:
    try:
        import importlib

        pymysql = importlib.import_module("pymysql")
    except Exception as exc:
        raise RuntimeError(
            "MySQL backend requires PyMySQL. Install dependencies and set AUDIT_DB_BACKEND=mysql."
        ) from exc

    connection = pymysql.connect(**_mysql_connection_settings())
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS event_date_recommendation_audit (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    created_at VARCHAR(64) NOT NULL,
                    workflow_name VARCHAR(255) NOT NULL,
                    run_source VARCHAR(64) NOT NULL,
                    city VARCHAR(255) NULL,
                    event_type VARCHAR(255) NULL,
                    months_ahead INT NULL,
                    top_n_dates INT NULL,
                    ai_enabled TINYINT(1) NOT NULL DEFAULT 0,
                    recommended_dates_json LONGTEXT NOT NULL,
                    top_recommended_date_json LONGTEXT NULL,
                    best_dates_json LONGTEXT NULL,
                    event_recommendations_json LONGTEXT NULL,
                    weather_notice TEXT NULL,
                    raw_text LONGTEXT NULL,
                    payload_json LONGTEXT NOT NULL
                )
                """
            )
            cursor.execute(
                """
                INSERT INTO event_date_recommendation_audit (
                    created_at,
                    workflow_name,
                    run_source,
                    city,
                    event_type,
                    months_ahead,
                    top_n_dates,
                    ai_enabled,
                    recommended_dates_json,
                    top_recommended_date_json,
                    best_dates_json,
                    event_recommendations_json,
                    weather_notice,
                    raw_text,
                    payload_json
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    created_at,
                    workflow_name,
                    run_source,
                    city,
                    event_type,
                    months_ahead,
                    top_n_dates,
                    1 if ai_enabled else 0,
                    json.dumps(recommended_dates, ensure_ascii=True),
                    json.dumps(top_recommended_date, ensure_ascii=True),
                    json.dumps(best_dates, ensure_ascii=True),
                    json.dumps(event_recommendations, ensure_ascii=True),
                    weather_notice,
                    raw_text,
                    json.dumps(payload, ensure_ascii=True),
                ),
            )
            return int(cursor.lastrowid)
    finally:
        connection.close()


def _save_event_date_audit_sqlite(
    *,
    created_at: str,
    workflow_name: str,
    run_source: str,
    city: str,
    event_type: str,
    months_ahead: int,
    top_n_dates: int,
    ai_enabled: bool,
    recommended_dates: list[str],
    top_recommended_date: dict[str, Any],
    best_dates: list[dict[str, Any]],
    event_recommendations: list[str],
    weather_notice: str,
    raw_text: str,
    payload: dict[str, Any],
) -> int:
    db_path = _audit_db_path()
    with sqlite3.connect(db_path) as connection:
        _ensure_event_date_audit_table(connection)
        cursor = connection.execute(
            """
            INSERT INTO event_date_recommendation_audit (
                created_at,
                workflow_name,
                run_source,
                city,
                event_type,
                months_ahead,
                top_n_dates,
                ai_enabled,
                recommended_dates_json,
                top_recommended_date_json,
                best_dates_json,
                event_recommendations_json,
                weather_notice,
                raw_text,
                payload_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                workflow_name,
                run_source,
                city,
                event_type,
                months_ahead,
                top_n_dates,
                1 if ai_enabled else 0,
                json.dumps(recommended_dates, ensure_ascii=True),
                json.dumps(top_recommended_date, ensure_ascii=True),
                json.dumps(best_dates, ensure_ascii=True),
                json.dumps(event_recommendations, ensure_ascii=True),
                weather_notice,
                raw_text,
                json.dumps(payload, ensure_ascii=True),
            ),
        )
        return int(cursor.lastrowid)


def _save_demand_forecast_audit_mysql(
    *,
    created_at: str,
    workflow_name: str,
    run_source: str,
    city: str,
    event_type: str,
    forecast_horizon: int,
    trend: str,
    demand_pressure: str,
    peak_months: list[dict[str, Any]],
    actions: dict[str, Any],
    alerts: list[str],
    kpis: dict[str, Any],
    forecast_points: list[dict[str, Any]],
    payload: dict[str, Any],
) -> int:
    try:
        import importlib

        pymysql = importlib.import_module("pymysql")
    except Exception as exc:
        raise RuntimeError(
            "MySQL backend requires PyMySQL. Install dependencies and set AUDIT_DB_BACKEND=mysql."
        ) from exc

    connection = pymysql.connect(**_mysql_connection_settings())
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS demand_forecast_audit (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    created_at VARCHAR(64) NOT NULL,
                    workflow_name VARCHAR(255) NOT NULL,
                    run_source VARCHAR(64) NOT NULL,
                    city VARCHAR(255) NULL,
                    event_type VARCHAR(255) NULL,
                    forecast_horizon INT NULL,
                    trend VARCHAR(64) NULL,
                    demand_pressure VARCHAR(64) NULL,
                    peak_months_json LONGTEXT NULL,
                    actions_json LONGTEXT NULL,
                    alerts_json LONGTEXT NULL,
                    kpis_json LONGTEXT NULL,
                    forecast_points_json LONGTEXT NULL,
                    payload_json LONGTEXT NOT NULL
                )
                """
            )
            cursor.execute(
                """
                INSERT INTO demand_forecast_audit (
                    created_at,
                    workflow_name,
                    run_source,
                    city,
                    event_type,
                    forecast_horizon,
                    trend,
                    demand_pressure,
                    peak_months_json,
                    actions_json,
                    alerts_json,
                    kpis_json,
                    forecast_points_json,
                    payload_json
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    created_at,
                    workflow_name,
                    run_source,
                    city,
                    event_type,
                    forecast_horizon,
                    trend,
                    demand_pressure,
                    json.dumps(peak_months, ensure_ascii=True),
                    json.dumps(actions, ensure_ascii=True),
                    json.dumps(alerts, ensure_ascii=True),
                    json.dumps(kpis, ensure_ascii=True),
                    json.dumps(forecast_points, ensure_ascii=True),
                    json.dumps(payload, ensure_ascii=True),
                ),
            )
            return int(cursor.lastrowid)
    finally:
        connection.close()


def _save_demand_forecast_audit_sqlite(
    *,
    created_at: str,
    workflow_name: str,
    run_source: str,
    city: str,
    event_type: str,
    forecast_horizon: int,
    trend: str,
    demand_pressure: str,
    peak_months: list[dict[str, Any]],
    actions: dict[str, Any],
    alerts: list[str],
    kpis: dict[str, Any],
    forecast_points: list[dict[str, Any]],
    payload: dict[str, Any],
) -> int:
    db_path = _audit_db_path()
    with sqlite3.connect(db_path) as connection:
        _ensure_demand_forecast_audit_table(connection)
        cursor = connection.execute(
            """
            INSERT INTO demand_forecast_audit (
                created_at,
                workflow_name,
                run_source,
                city,
                event_type,
                forecast_horizon,
                trend,
                demand_pressure,
                peak_months_json,
                actions_json,
                alerts_json,
                kpis_json,
                forecast_points_json,
                payload_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                workflow_name,
                run_source,
                city,
                event_type,
                forecast_horizon,
                trend,
                demand_pressure,
                json.dumps(peak_months, ensure_ascii=True),
                json.dumps(actions, ensure_ascii=True),
                json.dumps(alerts, ensure_ascii=True),
                json.dumps(kpis, ensure_ascii=True),
                json.dumps(forecast_points, ensure_ascii=True),
                json.dumps(payload, ensure_ascii=True),
            ),
        )
        return int(cursor.lastrowid)


@csrf_exempt
def audit_provider_budget(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    if not isinstance(payload, dict):
        return JsonResponse({"error": "JSON body must be an object"}, status=400)

    workflow_name = str(payload.get("workflow_name", "Eventzella - Provider Budget Lookup")).strip() or "Eventzella - Provider Budget Lookup"
    model_key = str(payload.get("model_key", "provider_budget_model")).strip() or "provider_budget_model"

    input_payload = payload.get("input") or {}
    result_payload = payload.get("result") or {}
    if not isinstance(input_payload, dict):
        return JsonResponse({"error": "Field 'input' must be an object"}, status=400)
    if not isinstance(result_payload, dict):
        return JsonResponse({"error": "Field 'result' must be an object"}, status=400)

    try:
        alert_threshold = float(payload.get("alert_threshold", 60))
    except (TypeError, ValueError):
        alert_threshold = 60.0

    recommendations = result_payload.get("recommendations") or []
    top_provider = result_payload.get("top_provider")
    if top_provider is None and recommendations:
        top_provider = recommendations[0]

    if not isinstance(top_provider, dict):
        top_provider = {}

    try:
        top_fit_score = float(top_provider.get("fit_score", 0) or 0)
    except (TypeError, ValueError):
        top_fit_score = 0.0

    alert_reasons: list[str] = []
    if not recommendations:
        alert_reasons.append("No providers returned")
    elif top_fit_score < alert_threshold:
        alert_reasons.append(
            f"Top provider fit score {top_fit_score:.2f} below threshold {alert_threshold:.2f}"
        )

    if result_payload.get("city") and not result_payload.get("city_filter_applied", True):
        alert_reasons.append("City filter could not be applied")

    alert_recommended = bool(alert_reasons)

    created_at = timezone.now().isoformat()
    alert_reason = "; ".join(alert_reasons) if alert_reasons else ""

    try:
        if _audit_db_backend() == "mysql":
            record_id = _save_audit_mysql(
                created_at=created_at,
                workflow_name=workflow_name,
                model_key=model_key,
                input_payload=input_payload,
                result_payload=result_payload,
                top_provider=top_provider,
                alert_recommended=alert_recommended,
                alert_reason=alert_reason,
            )
        else:
            record_id = _save_audit_sqlite(
                created_at=created_at,
                workflow_name=workflow_name,
                model_key=model_key,
                input_payload=input_payload,
                result_payload=result_payload,
                top_provider=top_provider,
                alert_recommended=alert_recommended,
                alert_reason=alert_reason,
            )
    except Exception as exc:
        return JsonResponse({"error": f"Audit storage failed: {exc}"}, status=500)

    return JsonResponse(
        {
            "saved": True,
            "record_id": record_id,
            "workflow_name": workflow_name,
            "model_key": model_key,
            "request": input_payload,
            "result": result_payload,
            "alert_recommended": alert_recommended,
            "alert_reasons": alert_reasons,
            "top_fit_score": round(top_fit_score, 2),
            "top_provider": top_provider,
        }
    )


@csrf_exempt
def audit_event_date_recommendation(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    if not isinstance(payload, dict):
        return JsonResponse({"error": "JSON body must be an object"}, status=400)

    input_payload = payload.get("input") or {}
    result_payload = payload.get("result") or {}

    if not isinstance(input_payload, dict):
        return JsonResponse({"error": "Field 'input' must be an object"}, status=400)
    if not isinstance(result_payload, dict):
        return JsonResponse({"error": "Field 'result' must be an object"}, status=400)

    workflow_name = str(payload.get("workflow_name", "Eventzella - Event Date Weather AI")).strip() or "Eventzella - Event Date Weather AI"
    run_source = str(payload.get("run_source", "webhook")).strip() or "webhook"
    city = str(input_payload.get("city") or result_payload.get("city") or "").strip()
    event_type = str(input_payload.get("event_type") or result_payload.get("event_type") or "").strip()

    try:
        months_ahead = int(input_payload.get("months_ahead", result_payload.get("months_ahead", 0)) or 0)
    except (TypeError, ValueError):
        months_ahead = 0

    try:
        top_n_dates = int(input_payload.get("top_n_dates", result_payload.get("top_n_dates", 10)) or 10)
    except (TypeError, ValueError):
        top_n_dates = 10

    ai_raw = input_payload.get("ai_suggestion", "no")
    ai_enabled = str(ai_raw).strip().lower() in {"yes", "true", "1"}

    recommended_dates = result_payload.get("recommended_dates") or []
    if not isinstance(recommended_dates, list):
        recommended_dates = []
    recommended_dates = [str(x) for x in recommended_dates if str(x).strip()]

    top_recommended_date = result_payload.get("top_recommended_date") or {}
    if not isinstance(top_recommended_date, dict):
        top_recommended_date = {}

    best_dates = result_payload.get("best_dates") or []
    if not isinstance(best_dates, list):
        best_dates = []
    best_dates = [x for x in best_dates if isinstance(x, dict)]

    event_recommendations = result_payload.get("event_recommendations") or []
    if not isinstance(event_recommendations, list):
        event_recommendations = []
    event_recommendations = [str(x) for x in event_recommendations if str(x).strip()]

    weather_notice = str(result_payload.get("weather_notice", "")).strip()
    raw_text = str(result_payload.get("raw_text", "")).strip()

    created_at = timezone.now().isoformat()

    try:
        if _audit_db_backend() == "mysql":
            record_id = _save_event_date_audit_mysql(
                created_at=created_at,
                workflow_name=workflow_name,
                run_source=run_source,
                city=city,
                event_type=event_type,
                months_ahead=months_ahead,
                top_n_dates=top_n_dates,
                ai_enabled=ai_enabled,
                recommended_dates=recommended_dates,
                top_recommended_date=top_recommended_date,
                best_dates=best_dates,
                event_recommendations=event_recommendations,
                weather_notice=weather_notice,
                raw_text=raw_text,
                payload=payload,
            )
        else:
            record_id = _save_event_date_audit_sqlite(
                created_at=created_at,
                workflow_name=workflow_name,
                run_source=run_source,
                city=city,
                event_type=event_type,
                months_ahead=months_ahead,
                top_n_dates=top_n_dates,
                ai_enabled=ai_enabled,
                recommended_dates=recommended_dates,
                top_recommended_date=top_recommended_date,
                best_dates=best_dates,
                event_recommendations=event_recommendations,
                weather_notice=weather_notice,
                raw_text=raw_text,
                payload=payload,
            )
    except Exception as exc:
        return JsonResponse({"error": f"Audit storage failed: {exc}"}, status=500)

    return JsonResponse(
        {
            "saved": True,
            "record_id": record_id,
            "workflow_name": workflow_name,
            "run_source": run_source,
            "city": city,
            "event_type": event_type,
            "recommended_dates_count": len(recommended_dates),
        }
    )


@csrf_exempt
def audit_demand_forecast(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    if not isinstance(payload, dict):
        return JsonResponse({"error": "JSON body must be an object"}, status=400)

    input_payload = payload.get("input") or {}
    result_payload = payload.get("result") or {}

    if not isinstance(input_payload, dict):
        return JsonResponse({"error": "Field 'input' must be an object"}, status=400)
    if not isinstance(result_payload, dict):
        return JsonResponse({"error": "Field 'result' must be an object"}, status=400)

    workflow_name = str(payload.get("workflow_name", "Eventzella - Demand Forecast by City Type Date")).strip() or "Eventzella - Demand Forecast by City Type Date"
    run_source = str(payload.get("run_source", "webhook")).strip() or "webhook"
    city = str(input_payload.get("city") or result_payload.get("city") or "").strip()
    event_type = str(input_payload.get("event_type") or result_payload.get("event_type") or "").strip()

    try:
        forecast_horizon = int(input_payload.get("forecast_horizon", result_payload.get("forecast_horizon", 6)) or 6)
    except (TypeError, ValueError):
        forecast_horizon = 6

    trend = str(result_payload.get("trend", "")).strip()
    demand_pressure = str(result_payload.get("demand_pressure", "")).strip()

    peak_months = result_payload.get("peak_forecast_months") or []
    if not isinstance(peak_months, list):
        peak_months = []
    peak_months = [x for x in peak_months if isinstance(x, dict)]

    actions = result_payload.get("actions") or {}
    if not isinstance(actions, dict):
        actions = {}

    alerts = result_payload.get("alerts") or []
    if not isinstance(alerts, list):
        alerts = []
    alerts = [str(x) for x in alerts if str(x).strip()]

    kpis = result_payload.get("kpis") or {}
    if not isinstance(kpis, dict):
        kpis = {}

    forecast_points = result_payload.get("forecast_points") or []
    if not isinstance(forecast_points, list):
        forecast_points = []
    forecast_points = [x for x in forecast_points if isinstance(x, dict)]

    created_at = timezone.now().isoformat()

    try:
        if _audit_db_backend() == "mysql":
            record_id = _save_demand_forecast_audit_mysql(
                created_at=created_at,
                workflow_name=workflow_name,
                run_source=run_source,
                city=city,
                event_type=event_type,
                forecast_horizon=forecast_horizon,
                trend=trend,
                demand_pressure=demand_pressure,
                peak_months=peak_months,
                actions=actions,
                alerts=alerts,
                kpis=kpis,
                forecast_points=forecast_points,
                payload=payload,
            )
        else:
            record_id = _save_demand_forecast_audit_sqlite(
                created_at=created_at,
                workflow_name=workflow_name,
                run_source=run_source,
                city=city,
                event_type=event_type,
                forecast_horizon=forecast_horizon,
                trend=trend,
                demand_pressure=demand_pressure,
                peak_months=peak_months,
                actions=actions,
                alerts=alerts,
                kpis=kpis,
                forecast_points=forecast_points,
                payload=payload,
            )
    except Exception as exc:
        return JsonResponse({"error": f"Audit storage failed: {exc}"}, status=500)

    return JsonResponse(
        {
            "saved": True,
            "record_id": record_id,
            "workflow_name": workflow_name,
            "run_source": run_source,
            "city": city,
            "event_type": event_type,
            "forecast_horizon": forecast_horizon,
        }
    )


@csrf_exempt
def chat_with_ollama(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        message = str(request.GET.get("message", "")).strip()
        mode = str(request.GET.get("mode", "general")).strip().lower()
        model_name = str(request.GET.get("model", "llama3:latest")).strip() or "llama3:latest"

        if not message:
            return JsonResponse(
                {
                    "status": "ready",
                    "usage": "Use POST with JSON body {message, mode, model} or GET with query params ?message=...&mode=general",
                    "default_model": "llama3:latest",
                }
            )

        payload = {"message": message, "mode": mode, "model": model_name}
    elif request.method == "POST":
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON body"}, status=400)
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)

    if not isinstance(payload, dict):
        return JsonResponse({"error": "JSON body must be an object"}, status=400)

    message = str(payload.get("message", "")).strip()
    if not message:
        return JsonResponse({"error": "Field 'message' is required"}, status=400)

    mode = str(payload.get("mode", "domain")).strip().lower()
    model_name = str(payload.get("model", "llama3:latest")).strip() or "llama3:latest"
    ollama_url = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
    try:
        ollama_timeout = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "180"))
    except ValueError:
        ollama_timeout = 180.0
    try:
        ollama_max_tokens = int(os.getenv("OLLAMA_MAX_TOKENS", "220"))
    except ValueError:
        ollama_max_tokens = 220

    if mode == "domain":
        domain_context = ModelService.get_domain_context()
        prompt = (
            "You are an assistant for Eventzella. Prioritize answers based on Eventzella context. "
            "If the user asks something outside the domain, answer generally and say that it is outside local data.\n\n"
            f"{domain_context}\n\n"
            f"User question: {message}"
        )
    else:
        prompt = message

    body = json.dumps(
        {
            "model": model_name,
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": ollama_max_tokens},
        }
    ).encode("utf-8")
    request_obj = urllib.request.Request(
        ollama_url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(request_obj, timeout=ollama_timeout) as response:
            raw_data = response.read().decode("utf-8")

        ollama_response = json.loads(raw_data)
        text = str(ollama_response.get("response", "")).strip()
        if not text:
            text = "No response returned by Ollama model."

        return JsonResponse(
            {
                "reply": text,
                "mode": mode,
                "model": model_name,
            }
        )
    except urllib.error.HTTPError as exc:
        error_details = ""
        try:
            error_body = exc.read().decode("utf-8").strip()
            if error_body:
                error_details = f" Details: {error_body}"
        except Exception:
            error_details = ""

        model_hint = ""
        if exc.code == 404:
            model_hint = f" Model '{model_name}' may be missing. Try: ollama pull {model_name}."

        return JsonResponse(
            {
                "error": f"Ollama returned HTTP {exc.code}.{model_hint}{error_details}".strip(),
            },
            status=502,
        )
    except (urllib.error.URLError, TimeoutError, socket.timeout) as exc:
        reason = getattr(exc, "reason", exc)
        return JsonResponse(
            {
                "error": (
                    "Cannot reach Ollama. Start Ollama and ensure the service is available on "
                    f"{ollama_url}. Detail: {reason}. "
                    f"If generations are slow on first request, increase OLLAMA_TIMEOUT_SECONDS (current={ollama_timeout})."
                ),
            },
            status=503,
        )
    except Exception as exc:
        return JsonResponse({"error": f"Ollama request failed: {exc}"}, status=500)
