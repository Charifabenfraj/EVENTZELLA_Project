"""Scripts d'entraînement automatisés - Tous les modèles"""

import json
import pickle
import math
from pathlib import Path

import mlflow
import mlflow.pyfunc
import mlflow.sklearn
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler

from .pipeline import MLOpsTrainingPipeline
from .config import DATA_DIR, MODELS_DIR, EXPERIMENT_NAMES, MLFLOW_TRACKING_URI


class ProviderBudgetLookupPyFunc(mlflow.pyfunc.PythonModel):
    """Expose provider lookup as a registered MLflow model."""

    def load_context(self, context):
        with open(context.artifacts["provider_lookup"], "rb") as file:
            self.provider_records = pickle.load(file)

    def predict(self, context, model_input):
        if isinstance(model_input, pd.DataFrame):
            payloads = model_input.to_dict("records")
        elif isinstance(model_input, dict):
            payloads = [model_input]
        else:
            payloads = [{}]

        outputs = []
        for payload in payloads:
            try:
                target_budget = float(payload.get("budget", 0) or 0)
            except (TypeError, ValueError):
                target_budget = 0.0

            city_filter = str(payload.get("city", "")).strip().lower()
            try:
                top_k = int(payload.get("top_k", 5) or 5)
            except (TypeError, ValueError):
                top_k = 5

            top_k = max(1, min(20, top_k))

            candidates = []
            for value in self.provider_records.values():
                if not isinstance(value, dict):
                    continue

                provider_city = str(value.get("city", "")).strip().lower()
                if city_filter and provider_city and city_filter != provider_city:
                    continue

                try:
                    price = float(value.get("avg_price", 0) or 0)
                except (TypeError, ValueError):
                    continue

                budget_base = target_budget if target_budget > 0 else max(price, 1.0)
                fit_score = max(0.0, 1.0 - (abs(price - target_budget) / budget_base))

                candidates.append(
                    {
                        "provider": str(value.get("provider", "Unknown Provider")),
                        "city": str(value.get("city", "")),
                        "avg_price": price,
                        "fit_score": round(float(fit_score), 4),
                    }
                )

            candidates.sort(key=lambda item: (item["fit_score"], -item["avg_price"]), reverse=True)
            outputs.append(
                {
                    "providers": candidates[:top_k],
                    "total_candidates": len(candidates),
                }
            )

        return pd.DataFrame(outputs)


def _load_real_dataset(csv_path, required_columns: list[str], model_name: str, min_rows: int = 20) -> pd.DataFrame:
    """Charge un dataset réel (aucune génération synthétique)."""

    if not csv_path.exists():
        raise RuntimeError(
            f"Dataset manquant pour {model_name}: {csv_path}. "
            "Ajoutez des exemples depuis le frontend (Save training sample) "
            "ou placez un CSV réel dans ce chemin."
        )

    df = pd.read_csv(csv_path)
    missing_cols = [col for col in required_columns if col not in df.columns]
    if missing_cols:
        raise RuntimeError(
            f"Dataset invalide pour {model_name}: colonnes manquantes {missing_cols}. "
            f"Colonnes attendues: {required_columns}"
        )

    df = df[required_columns].dropna().copy()
    if len(df) < min_rows:
        raise RuntimeError(
            f"Dataset insuffisant pour {model_name}: {len(df)} lignes. "
            f"Minimum recommandé: {min_rows} lignes."
        )

    return df


def _validate_binary_target(series: pd.Series, target_name: str, model_name: str) -> None:
    values = sorted(pd.Series(series).dropna().astype(int).unique().tolist())
    if values != [0, 1]:
        raise RuntimeError(
            f"Target invalide pour {model_name}: '{target_name}' doit contenir les deux classes 0 et 1. "
            f"Valeurs trouvées: {values}"
        )


def _ensure_mlflow_experiment(experiment_name: str) -> None:
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(experiment_name)


def _log_mlflow_run(
    experiment_name: str,
    params: dict | None = None,
    metrics: dict | None = None,
    artifacts: list[Path] | None = None,
    sklearn_model: object | None = None,
    registered_model_name: str | None = None,
) -> None:
    _ensure_mlflow_experiment(experiment_name)
    with mlflow.start_run():
        if params:
            mlflow.log_params(params)
        if metrics:
            mlflow.log_metrics(metrics)

        if sklearn_model is not None:
            mlflow.sklearn.log_model(
                sklearn_model,
                artifact_path="model",
                registered_model_name=registered_model_name,
            )

        if artifacts:
            for artifact in artifacts:
                if artifact and Path(artifact).exists():
                    mlflow.log_artifact(str(artifact))


def _log_existing_model(
    model_path: Path,
    experiment_name: str,
    registered_model_name: str | None = None,
    extra_params: dict | None = None,
    extra_metrics: dict | None = None,
) -> dict:
    if not model_path.exists():
        raise RuntimeError(f"Model file not found: {model_path}")

    params = {"source": "existing_model", "model_file": model_path.name}
    if extra_params:
        params.update(extra_params)

    sklearn_model = None
    try:
        with model_path.open("rb") as file:
            loaded = pickle.load(file)
        if hasattr(loaded, "predict"):
            sklearn_model = loaded
    except Exception:
        sklearn_model = None

    _log_mlflow_run(
        experiment_name,
        params=params,
        metrics=extra_metrics or {},
        artifacts=[model_path],
        sklearn_model=sklearn_model,
        registered_model_name=registered_model_name,
    )

    return {"source": "existing_model", "model_file": model_path.name}


def _load_schema_sheet(sheet_name: str, model_name: str) -> pd.DataFrame:
    schema_path = DATA_DIR / "eventzella_schema.xlsx"
    if not schema_path.exists():
        raise RuntimeError(
            f"Dataset manquant pour {model_name}: {schema_path}. "
            "Ajoutez eventzella_schema.xlsx dans data/."
        )

    try:
        df = pd.read_excel(schema_path, sheet_name=sheet_name)
    except Exception as exc:
        raise RuntimeError(
            f"Impossible de lire {sheet_name} dans {schema_path}: {exc}"
        )

    if df.empty:
        raise RuntimeError(f"Sheet {sheet_name} vide pour {model_name}.")

    return df


def _pick_first_column(df: pd.DataFrame, candidates: list[str]) -> str:
    for name in candidates:
        if name in df.columns:
            return name
    return ""


def train_cancellation_rate_model():
    """Entraîner le modèle de taux d'annulation"""
    
    print("\n" + "="*70)
    print("🎯 ENTRAÎNEMENT: Cancellation Rate Classifier")
    print("="*70)
    
    cancellation_path = DATA_DIR / "training_cancellation_data.csv"
    required_columns = ["event_type", "budget", "final_price", "cancelled"]

    df = _load_real_dataset(
        cancellation_path,
        required_columns=required_columns,
        model_name="cancellation_rate_model",
        min_rows=20,
    )
    _validate_binary_target(df["cancelled"], target_name="cancelled", model_name="cancellation_rate_model")

    print(f"✅ Dataset réel utilisé: {cancellation_path} ({len(df)} lignes)")
    
    # Initialiser le pipeline
    pipeline = MLOpsTrainingPipeline(
        model_name="cancellation_rate",
        model_type="classification"
    )
    
    # Charger les données
    df = pipeline.load_data(str(cancellation_path))
    df = df[required_columns].dropna().copy()
    
    # Prétraitement
    X, y = pipeline.preprocess(
        df,
        target_col="cancelled",
        drop_cols=[]
    )
    
    # Split données
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"\n📊 Split des données:")
    print(f"   Train: {X_train.shape}")
    print(f"   Test:  {X_test.shape}")
    
    # Hyperparamètres
    params = {
        "n_estimators": 100,
        "max_depth": 10,
        "min_samples_split": 5,
        "min_samples_leaf": 2,
    }
    
    # Entraîner avec MLflow tracking
    metrics = pipeline.train(X_train, y_train, X_test, y_test, params)
    
    # Sauvegarder le modèle avec le nom attendu par l'API
    pipeline.save_model(str(MODELS_DIR / "cancellation_rate_model.pkl"))
    
    return metrics


def train_price_regression_model():
    """Entraîner le modèle de régression des prix"""
    
    print("\n" + "="*70)
    print("🎯 ENTRAÎNEMENT: Price Regression Model")
    print("="*70)
    
    price_path = DATA_DIR / "training_price_data.csv"
    required_columns = ["event_type", "guests", "city", "budget", "final_price"]

    df = _load_real_dataset(
        price_path,
        required_columns=required_columns,
        model_name="price_regression",
        min_rows=30,
    )

    print(f"✅ Dataset réel utilisé: {price_path} ({len(df)} lignes)")
    
    # Initialiser le pipeline
    pipeline = MLOpsTrainingPipeline(
        model_name="price_regression",
        model_type="regression"
    )
    
    # Charger les données
    df = pipeline.load_data(str(price_path))
    df = df[required_columns].dropna().copy()
    
    # Prétraitement
    X, y = pipeline.preprocess(
        df,
        target_col="final_price",
        drop_cols=[]
    )
    
    # Split données
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"\n📊 Split des données:")
    print(f"   Train: {X_train.shape}")
    print(f"   Test:  {X_test.shape}")
    
    # Hyperparamètres
    params = {
        "n_estimators": 150,
        "max_depth": 12,
        "learning_rate": 0.1,
        "subsample": 0.8,
    }
    
    # Entraîner avec MLflow tracking
    metrics = pipeline.train(X_train, y_train, X_test, y_test, params)
    
    # Sauvegarder le modèle avec le nom attendu par l'API
    pipeline.save_model(str(MODELS_DIR / "xgboost_price_regression.pkl"))
    
    return metrics


def train_provider_budget_lookup_model():
    """Construire et versionner le modèle provider budget lookup."""

    print("\n" + "=" * 70)
    print("🎯 ENTRAÎNEMENT: Provider Budget Lookup")
    print("=" * 70)

    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(EXPERIMENT_NAMES["provider_budget_lookup"])

    # Dataset source principal: CSV réel puis provider_budget_model.pkl existant (si disponible)
    source_model_path = MODELS_DIR / "provider_budget_model.pkl"
    source_csv_path = DATA_DIR / "provider_budget_data.csv"
    source = "real-provider-source"
    provider_records: dict[str, dict] = {}

    if source_csv_path.exists():
        df = pd.read_csv(source_csv_path)
        required_columns = ["provider", "city", "avg_price"]
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            raise RuntimeError(
                f"Dataset provider invalide: colonnes manquantes {missing_cols}. Colonnes attendues: {required_columns}"
            )

        df = df.dropna(subset=required_columns).copy()
        for idx, row in enumerate(df.to_dict("records"), start=1):
            provider_records[str(idx)] = {
                "provider_id": idx,
                "provider": str(row.get("provider", "Unknown Provider")).strip(),
                "city": str(row.get("city", "")).strip(),
                "avg_price": float(row.get("avg_price", 0.0) or 0.0),
                "service_type": str(row.get("service_type", row.get("specialty", "General"))).strip() or "General",
                "specialty": str(row.get("specialty", row.get("service_type", "General"))).strip() or "General",
            }

        if provider_records:
            source = "provider-budget-csv"

    if (not provider_records) and source_model_path.exists():
        try:
            with source_model_path.open("rb") as file:
                previous_model = pickle.load(file)
            if isinstance(previous_model, dict):
                for key, value in previous_model.items():
                    if isinstance(value, dict):
                        provider_records[str(key)] = value
                if provider_records:
                    source = "previous-provider-budget-pkl"
        except Exception:
            provider_records = {}

    if not provider_records:
        raise RuntimeError(
            "Aucune source réelle provider trouvée. Ajoutez models/provider_budget_model.pkl réel avant entraînement."
        )

    raw_prices = [float(v.get("avg_price", 0.0) or 0.0) for v in provider_records.values()]
    prices = [value for value in raw_prices if math.isfinite(value)]
    cities = sorted({str(v.get("city", "")).strip() for v in provider_records.values() if str(v.get("city", "")).strip()})

    params = {
        "model_kind": "lookup",
        "provider_count": len(provider_records),
        "city_count": len(cities),
        "source": source,
    }

    metrics = {
        "provider_count": float(len(provider_records)),
        "city_count": float(len(cities)),
        "min_avg_price": float(min(prices) if prices else 0.0),
        "max_avg_price": float(max(prices) if prices else 0.0),
        "mean_avg_price": float(sum(prices) / len(prices) if prices else 0.0),
    }

    with mlflow.start_run():
        mlflow.log_params(params)
        mlflow.log_metrics(metrics)

        metadata = {
            "training_type": "lookup-registry-build",
            "provider_ids": [int(k) for k in provider_records.keys() if str(k).isdigit()],
            "cities": cities,
            "source": source,
        }
        mlflow.log_dict(metadata, "provider_lookup_metadata.json")

        # Versionner le modèle lookup au format attendu par ModelService.
        model_path = MODELS_DIR / "provider_budget_model.pkl"
        with model_path.open("wb") as file:
            pickle.dump(provider_records, file)

        artifact_path = MODELS_DIR / "provider_budget_model_info.json"
        with artifact_path.open("w", encoding="utf-8") as file:
            json.dump({"params": params, "metrics": metrics}, file, indent=2)
        mlflow.log_artifact(str(artifact_path))
        mlflow.log_artifact(str(model_path))

        # Register Provider_Budget_Lookup in MLflow Model Registry.
        mlflow.pyfunc.log_model(
            artifact_path="model",
            python_model=ProviderBudgetLookupPyFunc(),
            artifacts={"provider_lookup": str(model_path)},
            registered_model_name=EXPERIMENT_NAMES["provider_budget_lookup"],
            input_example=pd.DataFrame(
                [
                    {
                        "budget": 6000.0,
                        "city": "Tunis",
                        "top_k": 5,
                    }
                ]
            ),
        )

    print(f"✅ Provider lookup versionné: {MODELS_DIR / 'provider_budget_model.pkl'}")
    print(f"✅ Run MLflow terminé ({EXPERIMENT_NAMES['provider_budget_lookup']})")
    return metrics


def train_chatbot_intent_classifier_model():
    """Entrainer ou versionner le modele chatbot intent classifier."""

    print("\n" + "=" * 70)
    print("🎯 ENTRAÎNEMENT: Chatbot Intent Classifier")
    print("=" * 70)

    data_path = DATA_DIR / "chatbot_intent_data.csv"
    model_path = MODELS_DIR / "chatbot_intent_classifier.pkl"
    experiment_name = EXPERIMENT_NAMES["chatbot_intent"]

    if not data_path.exists():
        return _log_existing_model(
            model_path,
            experiment_name,
            registered_model_name=experiment_name,
            extra_params={"data_path": str(data_path)},
        )

    df = _load_real_dataset(
        data_path,
        required_columns=["message", "intent"],
        model_name="chatbot_intent_classifier",
        min_rows=30,
    )

    df = df[["message", "intent"]].dropna().copy()
    if df["intent"].nunique() < 2:
        raise RuntimeError("Intent classifier needs at least 2 intent classes.")

    X_train, X_test, y_train, y_test = train_test_split(
        df["message"],
        df["intent"],
        test_size=0.2,
        random_state=42,
        stratify=df["intent"],
    )

    pipeline = Pipeline(
        [
            ("tfidf", TfidfVectorizer(max_features=8000, ngram_range=(1, 2))),
            ("clf", LogisticRegression(max_iter=1200)),
        ]
    )
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    metrics = {
        "accuracy": float(accuracy_score(y_test, predictions)),
        "f1_weighted": float(f1_score(y_test, predictions, average="weighted")),
        "test_rows": float(len(X_test)),
    }

    params = {
        "model_kind": "text_classifier",
        "vectorizer": "tfidf",
        "classifier": "logistic_regression",
        "train_rows": int(len(X_train)),
    }

    with model_path.open("wb") as file:
        pickle.dump(pipeline, file)

    _log_mlflow_run(
        experiment_name,
        params=params,
        metrics=metrics,
        artifacts=[model_path],
        sklearn_model=pipeline,
        registered_model_name=experiment_name,
    )

    return metrics


def train_complaint_risk_model():
    """Entrainer ou versionner le modele complaint risk."""

    print("\n" + "=" * 70)
    print("🎯 ENTRAÎNEMENT: Complaint Risk Classifier")
    print("=" * 70)

    data_path = DATA_DIR / "complaint_risk_data.csv"
    model_path = MODELS_DIR / "complaint_risk_model.pkl"
    experiment_name = EXPERIMENT_NAMES["complaint_risk"]

    if not data_path.exists():
        return _log_existing_model(
            model_path,
            experiment_name,
            registered_model_name=experiment_name,
            extra_params={"data_path": str(data_path)},
        )

    df = _load_real_dataset(
        data_path,
        required_columns=["complaint_text", "risk"],
        model_name="complaint_risk_model",
        min_rows=30,
    )

    df = df[["complaint_text", "risk"]].dropna().copy()
    _validate_binary_target(df["risk"], target_name="risk", model_name="complaint_risk_model")

    X_train, X_test, y_train, y_test = train_test_split(
        df["complaint_text"],
        df["risk"],
        test_size=0.2,
        random_state=42,
        stratify=df["risk"],
    )

    pipeline = Pipeline(
        [
            ("tfidf", TfidfVectorizer(max_features=8000, ngram_range=(1, 2))),
            ("clf", LogisticRegression(max_iter=1200)),
        ]
    )
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    metrics = {
        "accuracy": float(accuracy_score(y_test, predictions)),
        "f1_weighted": float(f1_score(y_test, predictions, average="weighted")),
        "test_rows": float(len(X_test)),
    }

    params = {
        "model_kind": "text_classifier",
        "vectorizer": "tfidf",
        "classifier": "logistic_regression",
        "train_rows": int(len(X_train)),
    }

    with model_path.open("wb") as file:
        pickle.dump(pipeline, file)

    _log_mlflow_run(
        experiment_name,
        params=params,
        metrics=metrics,
        artifacts=[model_path],
        sklearn_model=pipeline,
        registered_model_name=experiment_name,
    )

    return metrics


def train_event_type_encoder_model():
    """Entrainer le LabelEncoder des types d'evenement."""

    print("\n" + "=" * 70)
    print("🎯 ENTRAÎNEMENT: Event Type Encoder")
    print("=" * 70)

    event_df = _load_schema_sheet("EVENT", model_name="event_type_encoder")
    type_col = _pick_first_column(event_df, ["type", "event_type"])
    if not type_col:
        raise RuntimeError("EVENT sheet must contain 'type' or 'event_type' column.")

    labels = (
        event_df[type_col]
        .dropna()
        .astype(str)
        .map(lambda value: value.strip())
    )
    labels = [label for label in labels if label and label.lower() != "nan"]

    if len(set(labels)) < 2:
        raise RuntimeError("Event type encoder needs at least 2 distinct labels.")

    encoder = LabelEncoder()
    encoder.fit(labels)

    model_path = MODELS_DIR / "event_type_encoder.pkl"
    with model_path.open("wb") as file:
        pickle.dump(encoder, file)

    metrics = {"class_count": float(len(encoder.classes_))}
    params = {"source": "eventzella_schema.xlsx", "field": type_col}

    experiment_name = EXPERIMENT_NAMES["event_type_encoder"]
    _log_mlflow_run(
        experiment_name,
        params=params,
        metrics=metrics,
        artifacts=[model_path],
        sklearn_model=encoder,
        registered_model_name=experiment_name,
    )

    return metrics


def train_event_date_model():
    """Construire le modele de recommandations de dates par type."""

    print("\n" + "=" * 70)
    print("🎯 ENTRAÎNEMENT: Event Date Recommender")
    print("=" * 70)

    event_df = _load_schema_sheet("EVENT", model_name="event_date_model")
    type_col = _pick_first_column(event_df, ["type", "event_type"])
    date_col = _pick_first_column(event_df, ["event_date", "date", "event_day"])

    if not type_col or not date_col:
        raise RuntimeError("EVENT sheet must contain event type and date columns.")

    df = event_df[[type_col, date_col]].dropna().copy()
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce", dayfirst=True)
    df = df.dropna(subset=[date_col])

    grouped: dict[str, list[str]] = {}
    for event_type, rows in df.groupby(type_col):
        dates = sorted({value.date().isoformat() for value in rows[date_col].tolist()})
        if dates:
            grouped[str(event_type).strip()] = dates[:30]

    if not grouped:
        raise RuntimeError("No valid event dates found to build event_date_model.")

    model_path = MODELS_DIR / "event_date_model.pkl"
    with model_path.open("wb") as file:
        pickle.dump(grouped, file)

    total_dates = sum(len(values) for values in grouped.values())
    metrics = {
        "event_types": float(len(grouped)),
        "total_dates": float(total_dates),
    }
    params = {"source": "eventzella_schema.xlsx", "type_column": type_col, "date_column": date_col}

    experiment_name = EXPERIMENT_NAMES["event_date"]
    _log_mlflow_run(
        experiment_name,
        params=params,
        metrics=metrics,
        artifacts=[model_path],
    )

    return metrics


def train_kmeans_clustering_model():
    """Entrainer le modele KMeans a partir des evenements connus."""

    print("\n" + "=" * 70)
    print("🎯 ENTRAÎNEMENT: KMeans Event Clustering")
    print("=" * 70)

    event_df = _load_schema_sheet("EVENT", model_name="kmeans_clustering")
    guest_col = _pick_first_column(
        event_df,
        [
            "guests",
            "guest_count",
            "guests_count",
            "attendees",
            "participants",
            "nbr_invites",
            "invites",
            "num_guests",
        ],
    )
    price_col = _pick_first_column(
        event_df,
        ["final_price", "price", "budget", "estimated_price", "total_price", "cost"],
    )

    source_label = "eventzella_schema.xlsx"
    if not guest_col or not price_col:
        fallback_path = DATA_DIR / "training_price_data.csv"
        if not fallback_path.exists():
            raise RuntimeError(
                "EVENT sheet must include guest and price columns for clustering, "
                "and training_price_data.csv is missing."
            )

        fallback_df = pd.read_csv(fallback_path)
        if "guests" not in fallback_df.columns:
            raise RuntimeError("training_price_data.csv must include 'guests' column for clustering.")

        if "final_price" in fallback_df.columns:
            price_col = "final_price"
        elif "budget" in fallback_df.columns:
            price_col = "budget"
        else:
            raise RuntimeError("training_price_data.csv must include 'final_price' or 'budget' column for clustering.")

        guest_col = "guests"
        df = fallback_df[[guest_col, price_col]].copy()
        source_label = "training_price_data.csv"
    else:
        df = event_df[[guest_col, price_col]].copy()
    df[guest_col] = pd.to_numeric(df[guest_col], errors="coerce")
    df[price_col] = pd.to_numeric(df[price_col], errors="coerce")
    df = df.dropna().copy()

    if len(df) < 25:
        raise RuntimeError("KMeans clustering needs at least 25 rows to train.")

    pipeline = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("kmeans", KMeans(n_clusters=3, random_state=42, n_init=10)),
        ]
    )
    pipeline.fit(df)

    model_path = MODELS_DIR / "kmeans_clustering.pkl"
    with model_path.open("wb") as file:
        pickle.dump(pipeline, file)

    inertia = float(pipeline.named_steps["kmeans"].inertia_)
    metrics = {"inertia": inertia, "train_rows": float(len(df))}
    params = {
        "guest_col": guest_col,
        "price_col": price_col,
        "n_clusters": 3,
        "source": source_label,
    }

    experiment_name = EXPERIMENT_NAMES["kmeans_clustering"]
    _log_mlflow_run(
        experiment_name,
        params=params,
        metrics=metrics,
        artifacts=[model_path],
        sklearn_model=pipeline,
        registered_model_name=experiment_name,
    )

    return metrics


def train_svd_collaborative_filter_model():
    """Construire le modele SVD par defaut (liste de recommandations)."""

    print("\n" + "=" * 70)
    print("🎯 ENTRAÎNEMENT: SVD Collaborative Filter")
    print("=" * 70)

    provider_model_path = MODELS_DIR / "provider_budget_model.pkl"
    default_items: list[dict] = []
    source = "unknown"

    if provider_model_path.exists():
        with provider_model_path.open("rb") as file:
            provider_model = pickle.load(file)
        if isinstance(provider_model, dict):
            source = "provider_budget_model"
            for value in provider_model.values():
                if not isinstance(value, dict):
                    continue
                default_items.append(
                    {
                        "provider": str(value.get("provider", "Unknown Provider")),
                        "city": str(value.get("city", "")),
                        "avg_price": float(value.get("avg_price", 0.0) or 0.0),
                    }
                )

    if not default_items:
        provider_df = _load_schema_sheet("PROVIDER", model_name="svd_collaborative_filter")
        name_col = _pick_first_column(provider_df, ["name", "provider", "provider_name"])
        city_col = _pick_first_column(provider_df, ["city", "provider_city"])
        if not name_col:
            raise RuntimeError("PROVIDER sheet must include provider name column.")

        source = "eventzella_schema"
        for _, row in provider_df.iterrows():
            default_items.append(
                {
                    "provider": str(row.get(name_col, "Unknown Provider")),
                    "city": str(row.get(city_col, "")) if city_col else "",
                    "avg_price": float(row.get("avg_price", 0.0) or 0.0),
                }
            )

    if not default_items:
        raise RuntimeError("No provider data available to build SVD defaults.")

    default_items = sorted(default_items, key=lambda item: item.get("avg_price", 0.0))[:50]

    model_payload = {
        "type": "svd-defaults",
        "default_items": default_items,
    }

    model_path = MODELS_DIR / "svd_collaborative_filter.pkl"
    with model_path.open("wb") as file:
        pickle.dump(model_payload, file)

    metrics = {"item_count": float(len(default_items))}
    params = {"source": source}

    experiment_name = EXPERIMENT_NAMES["svd_recommender"]
    _log_mlflow_run(
        experiment_name,
        params=params,
        metrics=metrics,
        artifacts=[model_path],
    )

    return metrics


def train_demand_forecast_baseline():
    """Logger un baseline MLflow pour la prevision de demande."""

    print("\n" + "=" * 70)
    print("🎯 ENTRAÎNEMENT: Demand Forecast Baseline")
    print("=" * 70)

    cache_path = DATA_DIR / "demand_monthly_cache.csv"
    rows = 0
    if cache_path.exists():
        df = pd.read_csv(cache_path)
        rows = len(df)

    metrics = {"rows": float(rows)}
    params = {"source": str(cache_path)}

    experiment_name = EXPERIMENT_NAMES["demand_forecast"]
    _log_mlflow_run(
        experiment_name,
        params=params,
        metrics=metrics,
        artifacts=[cache_path] if cache_path.exists() else None,
    )

    return metrics


def train_all_models():
    """Entraîner TOUS les modèles - Pipeline complet"""
    
    print("\n" + "🔄"*35)
    print("🔄 DÉMARRAGE DU PIPELINE MLOps AUTOMATISÉ 🔄")
    print("🔄"*35)
    
    results = {}
    
    # Entraîner cancellation_rate
    try:
        results["cancellation_rate"] = train_cancellation_rate_model()
    except Exception as e:
        print(f"❌ Erreur lors de l'entraînement cancellation_rate: {e}")
        results["cancellation_rate"] = None
    
    # Entraîner price_regression
    try:
        results["price_regression"] = train_price_regression_model()
    except Exception as e:
        print(f"❌ Erreur lors de l'entraînement price_regression: {e}")
        results["price_regression"] = None

    # Versionner provider lookup
    try:
        results["provider_budget_lookup"] = train_provider_budget_lookup_model()
    except Exception as e:
        print(f"❌ Erreur lors de la construction provider_budget_lookup: {e}")
        results["provider_budget_lookup"] = None

    # Entraîner chatbot intent classifier
    try:
        results["chatbot_intent_classifier"] = train_chatbot_intent_classifier_model()
    except Exception as e:
        print(f"❌ Erreur lors de l'entraînement chatbot_intent_classifier: {e}")
        results["chatbot_intent_classifier"] = None

    # Entraîner complaint risk classifier
    try:
        results["complaint_risk_model"] = train_complaint_risk_model()
    except Exception as e:
        print(f"❌ Erreur lors de l'entraînement complaint_risk_model: {e}")
        results["complaint_risk_model"] = None

    # Entraîner event type encoder
    try:
        results["event_type_encoder"] = train_event_type_encoder_model()
    except Exception as e:
        print(f"❌ Erreur lors de l'entraînement event_type_encoder: {e}")
        results["event_type_encoder"] = None

    # Entraîner event date recommender
    try:
        results["event_date_model"] = train_event_date_model()
    except Exception as e:
        print(f"❌ Erreur lors de l'entraînement event_date_model: {e}")
        results["event_date_model"] = None

    # Entraîner KMeans clustering
    try:
        results["kmeans_clustering"] = train_kmeans_clustering_model()
    except Exception as e:
        print(f"❌ Erreur lors de l'entraînement kmeans_clustering: {e}")
        results["kmeans_clustering"] = None

    # Entraîner SVD collaborative filter
    try:
        results["svd_collaborative_filter"] = train_svd_collaborative_filter_model()
    except Exception as e:
        print(f"❌ Erreur lors de l'entraînement svd_collaborative_filter: {e}")
        results["svd_collaborative_filter"] = None

    # Logger demand forecast baseline
    try:
        results["demand_forecast_ai"] = train_demand_forecast_baseline()
    except Exception as e:
        print(f"❌ Erreur lors du baseline demand_forecast: {e}")
        results["demand_forecast_ai"] = None
    
    # Afficher le résumé
    print("\n" + "="*70)
    print("📊 RÉSUMÉ DES ENTRAÎNEMENTS")
    print("="*70)
    
    for model_name, metrics in results.items():
        if metrics:
            print(f"\n✅ {model_name}:")
            for metric_name, value in metrics.items():
                if isinstance(value, float):
                    print(f"   {metric_name}: {value:.4f}")
                else:
                    print(f"   {metric_name}: {value}")
        else:
            print(f"\n❌ {model_name}: Erreur d'entraînement")
    
    print("\n" + "="*70)
    print("✅ PIPELINE TERMINÉ!")
    print("="*70)
    print("\n📊 PROCHAINE ÉTAPE: Ouvrir MLflow UI")
    print("   Commande: mlflow ui --host 0.0.0.0 --port 5000")
    print("   URL: http://localhost:5000")
    print("\n" + "="*70)
    
    return results


if __name__ == "__main__":
    # Lancer l'entraînement complet
    train_all_models()
