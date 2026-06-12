from __future__ import annotations

import json
import os
import pickle
import re
import threading
import unicodedata
import urllib.error
import urllib.request
from datetime import date, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from django.conf import settings

MODEL_REGISTRY = {
    "cancellation_rate_model": {
        "filename": "cancellation_rate_model.pkl",
        "display_name": "Cancellation Rate Classifier",
        "category": "Classification",
        "description": "Prédit le risque d'annulation d'un événement selon le type, le budget et le prix final.",
        "input_schema": {
            "fields": [
                {
                    "name": "event_type",
                    "label": "Event Type",
                    "type": "select",
                    "required": True,
                    "options": ["Birthday", "Corporate Event", "Private Party", "Wedding"],
                },
                {"name": "budget", "label": "Budget", "type": "number", "required": True, "step": "0.01"},
                {
                    "name": "final_price",
                    "label": "Final Price",
                    "type": "number",
                    "required": True,
                    "step": "0.01",
                },
            ]
        },
        "sample_input": {"event_type": "Wedding", "budget": 15000, "final_price": 16250},
    },
    "chatbot_intent_classifier": {
        "filename": "chatbot_intent_classifier.pkl",
        "display_name": "Chatbot Intent Classifier",
        "category": "NLP Classification",
        "description": "Détecte l'intention d'un message utilisateur pour piloter le chatbot événementiel.",
        "input_schema": {
            "fields": [
                {
                    "name": "message",
                    "label": "User Message",
                    "type": "textarea",
                    "required": True,
                    "placeholder": "I need help for a wedding in Tunis with a medium budget",
                }
            ]
        },
        "sample_input": {"message": "Can you recommend a package for a wedding?"},
    },
    "complaint_risk_model": {
        "filename": "complaint_risk_model.pkl",
        "display_name": "Complaint Risk Classifier",
        "category": "NLP Classification",
        "description": "Analyse un texte de réclamation et prédit un niveau de risque de plainte (0/1).",
        "input_schema": {
            "fields": [
                {
                    "name": "complaint_text",
                    "label": "Complaint Text",
                    "type": "textarea",
                    "required": True,
                    "placeholder": "The provider was late and the equipment quality was poor...",
                }
            ]
        },
        "sample_input": {"complaint_text": "The service was delayed and communication was poor."},
    },
    "event_date_model": {
        "filename": "event_date_model.pkl",
        "display_name": "Event Date Recommender",
        "category": "Recommendation",
        "description": "Propose des dates d'événements recommandées selon le type d'événement.",
        "input_schema": {
            "fields": [
                {
                    "name": "event_type",
                    "label": "Event Type",
                    "type": "select",
                    "required": True,
                    "options": ["Birthday", "Corporate Event", "Private Party", "Wedding"],
                },
                {
                    "name": "city",
                    "label": "City (Tunisia)",
                    "type": "select",
                    "required": False,
                    "scrollable": True,
                    "visible_rows": 10,
                    "options": [
                        "Ariana",
                        "Beja",
                        "Ben Arous",
                        "Bizerte",
                        "Gabes",
                        "Gafsa",
                        "Jendouba",
                        "Kairouan",
                        "Kasserine",
                        "Kebili",
                        "Le Kef",
                        "Mahdia",
                        "Manouba",
                        "Medenine",
                        "Monastir",
                        "Nabeul",
                        "Sfax",
                        "Sidi Bouzid",
                        "Siliana",
                        "Sousse",
                        "Tataouine",
                        "Tozeur",
                        "Tunis",
                        "Zaghouan",
                    ],
                },
                {
                    "name": "preferred_month",
                    "label": "Preferred Month (1-12)",
                    "type": "select",
                    "required": False,
                    "options": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
                },
                {
                    "name": "months_ahead",
                    "label": "Start after N months",
                    "type": "number",
                    "required": False,
                    "step": "1",
                    "placeholder": "1",
                },
                {
                    "name": "top_n_dates",
                    "label": "Top N weather dates",
                    "type": "number",
                    "required": False,
                    "step": "1",
                    "placeholder": "10",
                },
                {
                    "name": "include_precipitation",
                    "label": "Include precipitation details",
                    "type": "select",
                    "required": False,
                    "options": ["yes", "no"],
                },
                {
                    "name": "ai_suggestion",
                    "label": "Ask AI to suggest best dates",
                    "type": "select",
                    "required": False,
                    "options": ["no", "yes"],
                },
            ]
        },
        "sample_input": {
            "event_type": "Wedding",
            "city": "Tunis",
            "preferred_month": "",
            "months_ahead": 1,
            "top_n_dates": 10,
            "include_precipitation": "yes",
            "ai_suggestion": "yes",
        },
    },
    "event_type_encoder": {
        "filename": "event_type_encoder.pkl",
        "display_name": "Event Type Encoder",
        "category": "Encoding",
        "description": "Encode ou décode les catégories de type d'événement via un LabelEncoder sklearn.",
        "input_schema": {
            "fields": [
                {
                    "name": "action",
                    "label": "Action",
                    "type": "select",
                    "required": True,
                    "options": ["encode", "decode"],
                },
                {"name": "label", "label": "Event Type Label", "type": "text", "required": False},
                {"name": "code", "label": "Encoded Code", "type": "number", "required": False, "step": "1"},
            ]
        },
        "sample_input": {"action": "encode", "label": "Wedding"},
    },
    "kmeans_clustering": {
        "filename": "kmeans_clustering.pkl",
        "display_name": "KMeans Event Clustering",
        "category": "Clustering",
        "description": "Attribue un cluster selon le nombre d'invités et le prix estimé.",
        "input_schema": {
            "fields": [
                {"name": "guests", "label": "Guests", "type": "number", "required": True, "step": "1"},
                {"name": "price", "label": "Price", "type": "number", "required": True, "step": "0.01"},
            ]
        },
        "sample_input": {"guests": 120, "price": 8000},
    },
    "provider_budget_model": {
        "filename": "provider_budget_model.pkl",
        "display_name": "Provider Budget Lookup",
        "category": "Lookup",
        "description": "Propose des prestataires selon budget, type d'evenement et ville.",
        "input_schema": {
            "fields": [
                {
                    "name": "budget",
                    "label": "Target Budget",
                    "type": "number",
                    "required": True,
                    "step": "0.01",
                    "placeholder": "5000",
                },
                {
                    "name": "event_type",
                    "label": "Event Type",
                    "type": "select",
                    "required": True,
                    "scrollable": True,
                    "visible_rows": 6,
                    "options": ["Birthday", "Corporate Event", "Private Party", "Wedding"],
                },
                {
                    "name": "city",
                    "label": "City (optional)",
                    "type": "select",
                    "required": False,
                    "scrollable": True,
                    "visible_rows": 8,
                    "options": [],
                },
                {
                    "name": "top_k",
                    "label": "Top K Providers",
                    "type": "number",
                    "required": False,
                    "step": "1",
                    "placeholder": "8",
                },
            ]
        },
        "sample_input": {"budget": 6000, "event_type": "Wedding", "city": "Tunis", "top_k": 8},
    },
    "svd_collaborative_filter": {
        "filename": "svd_collaborative_filter.pkl",
        "display_name": "SVD Collaborative Filter",
        "category": "Recommendation",
        "description": "Retourne les recommandations par défaut du moteur collaboratif SVD.",
        "input_schema": {
            "fields": [
                {
                    "name": "top_k",
                    "label": "Top K",
                    "type": "number",
                    "required": False,
                    "step": "1",
                    "placeholder": "5",
                }
            ]
        },
        "sample_input": {"top_k": 3},
    },
    "xgboost_price_regression": {
        "filename": "xgboost_price_regression.pkl",
        "display_name": "Price Regression",
        "category": "Regression",
        "description": "Estime le prix d'un événement à partir du nombre d'invités, du type et de la ville.",
        "input_schema": {
            "fields": [
                {"name": "guests", "label": "Guests", "type": "number", "required": True, "step": "1"},
                {
                    "name": "event_type",
                    "label": "Event Type",
                    "type": "select",
                    "required": True,
                    "options": ["Birthday", "Corporate Event", "Private Party", "Wedding"],
                },
                {
                    "name": "city",
                    "label": "City",
                    "type": "select",
                    "required": True,
                    "scrollable": True,
                    "visible_rows": 8,
                    "options": [],
                },
                {
                    "name": "budget",
                    "label": "Budget estimé (TND)",
                    "type": "number",
                    "required": False,
                    "step": "0.01",
                    "placeholder": "ex: 15000",
                },
            ]
        },
        "sample_input": {"guests": 250, "event_type": "Corporate Event", "city": "Tunis", "budget": 20000},
    },
    "demand_forecast_ai": {
        "filename": "virtual-ai",
        "display_name": "Demand Forecast by City/Type/Date",
        "category": "AI Planning",
        "description": "Prévoit la demande mensuelle pour anticiper les pics et ajuster pricing/ressources.",
        "input_schema": {
            "fields": [
                {
                    "name": "city",
                    "label": "City",
                    "type": "select",
                    "required": False,
                    "scrollable": True,
                    "visible_rows": 8,
                    "options": [],
                },
                {
                    "name": "event_type",
                    "label": "Event Type",
                    "type": "select",
                    "required": False,
                    "scrollable": True,
                    "visible_rows": 6,
                    "options": ["Birthday", "Corporate Event", "Private Party", "Wedding"],
                },
                {
                    "name": "forecast_horizon",
                    "label": "Forecast Horizon (months)",
                    "type": "number",
                    "required": False,
                    "step": "1",
                    "placeholder": "6",
                },
            ]
        },
        "sample_input": {"city": "Tunis", "event_type": "Wedding", "forecast_horizon": 6},
    },
    "intelligent_quote_generator": {
        "filename": "virtual-ai",
        "display_name": "Intelligent Quote Generator",
        "category": "AI Sales",
        "description": "Génère un devis intelligent (coûts, marge, alternatives) avec modèle de prix + LLM.",
        "input_schema": {
            "fields": [
                {"name": "client_name", "label": "Client Name", "type": "text", "required": False},
                {
                    "name": "event_type",
                    "label": "Event Type",
                    "type": "select",
                    "required": True,
                    "scrollable": True,
                    "visible_rows": 6,
                    "options": ["Birthday", "Corporate Event", "Private Party", "Wedding"],
                },
                {
                    "name": "city",
                    "label": "City",
                    "type": "select",
                    "required": True,
                    "scrollable": True,
                    "visible_rows": 8,
                    "options": [],
                },
                {"name": "guests", "label": "Guests", "type": "number", "required": True, "step": "1"},
                {
                    "name": "target_margin",
                    "label": "Target Margin (%)",
                    "type": "number",
                    "required": False,
                    "step": "0.1",
                    "placeholder": "18",
                },
                {
                    "name": "extra_notes",
                    "label": "Extra Notes",
                    "type": "textarea",
                    "required": False,
                    "placeholder": "Special requests, premium options, constraints...",
                },
            ]
        },
        "sample_input": {
            "client_name": "ACME Corp",
            "event_type": "Corporate Event",
            "city": "Tunis",
            "guests": 180,
            "target_margin": 18,
        },
    },
    "planning_copilot": {
        "filename": "virtual-ai",
        "display_name": "Event Planning Copilot",
        "category": "AI Copilot",
        "description": "Analyse un besoin en texte libre et propose un plan complet basé sur les modèles existants.",
        "input_schema": {
            "fields": [
                {
                    "name": "request_text",
                    "label": "Planning Request",
                    "type": "textarea",
                    "required": True,
                    "placeholder": "Plan a corporate event in Tunis for 200 guests with a budget around 20000 TND.",
                },
                {
                    "name": "top_k",
                    "label": "Top Providers",
                    "type": "number",
                    "required": False,
                    "step": "1",
                    "placeholder": "5",
                },
            ]
        },
        "sample_input": {
            "request_text": "I want a wedding in Tunis for 250 guests with budget around 30000 TND.",
            "top_k": 5,
        },
    },
}


class ModelService:
    _cache: dict[str, Any] = {}
    _lock = threading.Lock()
    _registry_bootstrap_lock = threading.Lock()
    _registry_bootstrapped = False
    _provider_records: list[dict[str, Any]] = []
    _event_types: list[str] = ["Birthday", "Corporate Event", "Private Party", "Wedding"]
    _city_options: list[str] = []
    _analytics_data_cache: pd.DataFrame | None = None

    @classmethod
    def _extract_provider_specialty(cls, value: dict[str, Any]) -> str:
        candidates = [
            value.get("speciality"),
            value.get("specialty"),
            value.get("service_title"),
            value.get("service_type"),
            value.get("category"),
            value.get("title"),
        ]
        for candidate in candidates:
            text = str(candidate or "").strip()
            if text and text.lower() != "nan":
                return text
        return "-"

    @classmethod
    def _models_dir(cls) -> Path:
        return Path(settings.BASE_DIR).parent / "models"

    @classmethod
    def _data_dir(cls) -> Path:
        return Path(settings.BASE_DIR).parent / "data"

    @classmethod
    def _ensure_dynamic_registry_data(cls) -> None:
        if cls._registry_bootstrapped:
            return

        with cls._registry_bootstrap_lock:
            if cls._registry_bootstrapped:
                return

            provider_path = cls._models_dir() / MODEL_REGISTRY["provider_budget_model"]["filename"]
            if provider_path.exists():
                with provider_path.open("rb") as file:
                    provider_model = pickle.load(file)

                if isinstance(provider_model, dict):
                    dedup: dict[int, dict[str, Any]] = {}
                    for key, value in provider_model.items():
                        if not (isinstance(value, dict) and str(key).isdigit()):
                            continue

                        provider_id = int(value.get("provider_id", key))
                        dedup[provider_id] = {
                            "provider_id": provider_id,
                            "provider": str(value.get("provider", "Unknown Provider")),
                            "provider_service_type": cls._extract_provider_specialty(value),
                            "specialty": cls._extract_provider_specialty(value),
                            "city": str(value.get("city", "")).strip(),
                            "avg_price": float(value.get("avg_price", 0.0) or 0.0),
                        }

                    cls._provider_records = sorted(dedup.values(), key=lambda item: item["avg_price"])
                    cls._city_options = sorted({item["city"] for item in cls._provider_records if item["city"]})

            encoder_path = cls._models_dir() / MODEL_REGISTRY["event_type_encoder"]["filename"]
            encoder_event_types: list[str] = []
            if encoder_path.exists():
                with encoder_path.open("rb") as file:
                    encoder = pickle.load(file)

                if hasattr(encoder, "classes_"):
                    encoder_event_types = [str(value) for value in list(encoder.classes_)]

            event_types_from_data: list[str] = []
            dataset_path = cls._data_dir() / "eventzella_schema.xlsx"
            if dataset_path.exists():
                try:
                    event_df = pd.read_excel(dataset_path, sheet_name="EVENT")
                    if "type" in event_df.columns:
                        event_types_from_data = sorted(
                            {
                                str(value).strip()
                                for value in event_df["type"].dropna().tolist()
                                if str(value).strip() and str(value).strip().lower() != "nan"
                            }
                        )
                except Exception:
                    event_types_from_data = []

            event_date_path = cls._models_dir() / MODEL_REGISTRY["event_date_model"]["filename"]
            event_types_from_dates: list[str] = []
            if event_date_path.exists():
                try:
                    with event_date_path.open("rb") as file:
                        date_model = pickle.load(file)
                    if isinstance(date_model, dict):
                        event_types_from_dates = sorted([str(key) for key in date_model.keys()])
                except Exception:
                    event_types_from_dates = []

            if event_types_from_data:
                cls._event_types = event_types_from_data
            elif event_types_from_dates:
                cls._event_types = event_types_from_dates
            elif encoder_event_types:
                cls._event_types = [item for item in encoder_event_types if item.lower() != "gala"] or encoder_event_types

            event_date_field = MODEL_REGISTRY["event_date_model"]["input_schema"]["fields"][0]
            event_date_field["options"] = cls._event_types

            cancellation_event_field = MODEL_REGISTRY["cancellation_rate_model"]["input_schema"]["fields"][0]
            cancellation_event_field["options"] = cls._event_types

            xgb_fields = MODEL_REGISTRY["xgboost_price_regression"]["input_schema"]["fields"]
            for f in xgb_fields:
                if f["name"] == "event_type":
                    f["options"] = cls._event_types
                elif f["name"] == "city":
                    f["options"] = cls._city_options

            provider_fields = MODEL_REGISTRY["provider_budget_model"]["input_schema"]["fields"]
            provider_fields[1]["options"] = cls._event_types
            provider_fields[2]["options"] = cls._city_options

            forecast_fields = MODEL_REGISTRY["demand_forecast_ai"]["input_schema"]["fields"]
            forecast_fields[0]["options"] = cls._city_options
            forecast_fields[1]["options"] = cls._event_types

            quote_fields = MODEL_REGISTRY["intelligent_quote_generator"]["input_schema"]["fields"]
            quote_fields[1]["options"] = cls._event_types
            quote_fields[2]["options"] = cls._city_options

            cls._registry_bootstrapped = True

    @classmethod
    def _load_model(cls, model_key: str) -> Any:
        cls._ensure_dynamic_registry_data()

        if model_key not in MODEL_REGISTRY:
            raise KeyError(f"Unknown model key: {model_key}")

        with cls._lock:
            if model_key in cls._cache:
                return cls._cache[model_key]

            model_path = cls._models_dir() / MODEL_REGISTRY[model_key]["filename"]
            if not model_path.exists():
                raise FileNotFoundError(f"Model file not found: {model_path}")

            with model_path.open("rb") as file:
                loaded_data = pickle.load(file)
            
            # Gérer les anciens modèles (juste le modèle) et les nouveaux (dict avec model + encoders)
            if isinstance(loaded_data, dict) and 'model' in loaded_data:
                model = loaded_data['model']
                # Stocker les encoders séparément pour y accéder plus tard
                if 'label_encoders' in loaded_data:
                    cls._cache[f"{model_key}_encoders"] = loaded_data['label_encoders']
                if 'feature_names' in loaded_data:
                    cls._cache[f"{model_key}_features"] = loaded_data['feature_names']
            else:
                # Ancien format : juste le modèle
                model = loaded_data

            cls._cache[model_key] = model
            return model

    @classmethod
    def list_models(cls) -> list[dict[str, Any]]:
        cls._ensure_dynamic_registry_data()
        
        items = []

        items = []
        for model_key, meta in MODEL_REGISTRY.items():
            items.append(
                {
                    "key": model_key,
                    "display_name": meta["display_name"],
                    "category": meta["category"],
                    "description": meta["description"],
                    "filename": meta["filename"],
                    "input_schema": meta["input_schema"],
                    "sample_input": meta["sample_input"],
                }
            )
        return items

    @classmethod
    def predict(cls, model_key: str, payload: dict[str, Any]) -> dict[str, Any]:
        cls._ensure_dynamic_registry_data()

        if model_key == "demand_forecast_ai":
            return cls._predict_demand_forecast(payload)

        if model_key == "intelligent_quote_generator":
            return cls._predict_quote_generator(payload)

        if model_key == "planning_copilot":
            return cls._predict_planning_copilot(payload)

        model = cls._load_model(model_key)

        if model_key in {"chatbot_intent_classifier", "complaint_risk_model"}:
            return cls._predict_text(model, model_key, payload)

        if model_key in {"cancellation_rate_model", "kmeans_clustering", "xgboost_price_regression"}:
            return cls._predict_tabular(model, model_key, payload)

        if model_key == "event_date_model":
            return cls._predict_event_dates(model, payload)

        if model_key == "event_type_encoder":
            return cls._predict_label_encoder(model, payload)

        if model_key == "provider_budget_model":
            return cls._predict_provider_lookup(model, payload)

        if model_key == "svd_collaborative_filter":
            return cls._predict_svd_defaults(model, payload)

        raise ValueError(f"No prediction strategy implemented for model key: {model_key}")

    @classmethod
    def _predict_text(cls, model: Any, model_key: str, payload: dict[str, Any]) -> dict[str, Any]:
        field_name = "message" if model_key == "chatbot_intent_classifier" else "complaint_text"
        text_value = str(payload.get(field_name, "")).strip()

        if not text_value:
            raise ValueError(f"Field '{field_name}' is required.")

        prediction = model.predict([text_value])[0]
        output: dict[str, Any] = {
            "prediction": cls._to_python(prediction),
            "input_text": text_value,
        }

        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba([text_value])[0]
            classes = cls._extract_classes(model)
            if classes is not None:
                output["probabilities"] = {
                    str(cls_name): float(prob)
                    for cls_name, prob in zip(classes, probabilities, strict=False)
                }

        if model_key == "chatbot_intent_classifier":
            return cls._format_chatbot_intent_result(output)

        if model_key == "complaint_risk_model":
            return cls._format_complaint_result(output)

        return output

    @classmethod
    def _predict_tabular(cls, model: Any, model_key: str, payload: dict[str, Any]) -> dict[str, Any]:
        fields = MODEL_REGISTRY[model_key]["input_schema"]["fields"]
        row: dict[str, Any] = {}
        meta: dict[str, Any] = {}
        
        # Récupérer les encoders si disponibles
        encoders = cls._cache.get(f"{model_key}_encoders", {})

        for field in fields:
            name = field["name"]
            raw_value = payload.get(name)

            # Vérifier les champs requis
            if field.get("required") and (raw_value is None or str(raw_value).strip() == ""):
                raise ValueError(f"Field '{name}' is required.")

            # Gérer les champs optionnels ou vides
            if raw_value is None or str(raw_value).strip() == "" or str(raw_value).lower() in ["null", "undefined", "none"]:
                # Pour xgboost_price_regression, budget est optionnel mais doit être présent comme feature
                if model_key == "xgboost_price_regression" and name == "budget":
                    row[name] = 0.0
                    continue
                # Sinon, on skip ce champ s'il n'est pas requis
                if not field.get("required"):
                    continue
                raise ValueError(f"Field '{name}' is required.")

            # Conversion des types
            if field["type"] == "number":
                try:
                    row[name] = float(raw_value)
                except (TypeError, ValueError):
                    raise ValueError(f"Field '{name}' must be a valid number.")
            else:
                # Pour les champs texte, utiliser l'encoder si disponible
                if name in encoders:
                    try:
                        # Encoder la valeur
                        encoded_value = encoders[name].transform([str(raw_value).strip()])[0]
                        row[name] = int(encoded_value)
                        meta[f"{name}_original"] = str(raw_value).strip()
                    except ValueError as e:
                        # Si la valeur n'est pas dans les classes connues
                        raise ValueError(f"Unknown value '{raw_value}' for field '{name}'. Valid values: {list(encoders[name].classes_)}")
                else:
                    row[name] = raw_value

        # SÉCURITÉ : Construire un DataFrame aligné avec les features attendues.
        # Certaines versions de modèles n'exposent pas feature_names_in_,
        # on utilise alors les features persistées au chargement ou celles du booster XGBoost.
        expected_features: list[str] = []
        if hasattr(model, "feature_names_in_"):
            expected_features = [str(name) for name in list(model.feature_names_in_)]
        elif cls._cache.get(f"{model_key}_features"):
            expected_features = [str(name) for name in list(cls._cache.get(f"{model_key}_features", []))]
        elif hasattr(model, "get_booster"):
            try:
                booster = model.get_booster()
                booster_names = getattr(booster, "feature_names", None)
                if booster_names:
                    expected_features = [str(name) for name in list(booster_names)]
            except Exception:
                expected_features = []

        if expected_features:
            for feat in expected_features:
                if feat not in row:
                    row[feat] = 0.0
            frame = pd.DataFrame([row])[expected_features]
            print(f"📊 [DEBUG] Features attendues: {expected_features}")
            print(f"📊 [DEBUG] Features envoyées au modèle: {list(frame.columns)}")
            print(f"📊 [DEBUG] Valeurs: {frame.values[0]}")
        else:
            frame = pd.DataFrame([row])
        
        try:
            prediction = model.predict(frame)[0]
        except Exception as e:
            print(f"❌ [ERROR] Erreur lors de la prédiction: {e}")
            if hasattr(model, "feature_names_in_"):
                print(f"👉 Features attendues par le modèle: {list(model.feature_names_in_)}")
                print(f"👉 Features fournies: {list(frame.columns)}")
                print(f"👉 Valeurs fournies: {frame.values[0]}")
            raise e

        output: dict[str, Any] = {
            "prediction": cls._to_python(prediction),
            "input": row,
        }
        if meta:
            output["meta"] = meta

        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(frame)[0]
            classes = cls._extract_classes(model)
            if classes is not None:
                output["probabilities"] = {
                    str(cls_name): float(prob)
                    for cls_name, prob in zip(classes, probabilities, strict=False)
                }

        if model_key == "cancellation_rate_model":
            return cls._format_cancellation_result(output)

        if model_key == "kmeans_clustering":
            return cls._format_kmeans_result(model, output)

        if model_key == "xgboost_price_regression":
            return cls._format_regression_result(output)

        return output

    @classmethod
    def _format_cancellation_result(cls, output: dict[str, Any]) -> dict[str, Any]:
        probabilities = output.get("probabilities", {})
        cancel_prob = 0.0

        for class_name, prob in probabilities.items():
            if str(class_name).strip().lower() in {"1", "true", "yes"}:
                cancel_prob = float(prob)
                break

        keep_prob = max(0.0, 1.0 - cancel_prob)
        cancel_percent = round(cancel_prob * 100, 2)
        keep_percent = round(keep_prob * 100, 2)

        if cancel_percent < 35:
            risk_level = "Low"
        elif cancel_percent < 65:
            risk_level = "Medium"
        else:
            risk_level = "High"

        return {
            **output,
            "cancel_probability": cancel_percent,
            "keep_probability": keep_percent,
            "risk_level": risk_level,
            "decision": "Likely Cancellation" if cancel_percent >= 50 else "Likely Maintained",
            "probabilities_percent": {
                class_name: round(float(prob) * 100, 2)
                for class_name, prob in probabilities.items()
            },
        }

    @classmethod
    def _format_kmeans_result(cls, model: Any, output: dict[str, Any]) -> dict[str, Any]:
        cluster_id = int(float(output.get("prediction", 0)))
        cluster_map = cls._describe_kmeans_clusters(model)
        cluster_info = cluster_map.get(
            cluster_id,
            {
                "cluster_id": cluster_id,
                "cluster_name": f"Cluster {cluster_id}",
                "centroid_guests": None,
                "centroid_price": None,
                "size_label": "Unknown",
            },
        )

        return {
            **output,
            "cluster_id": cluster_id,
            "cluster_name": cluster_info["cluster_name"],
            "cluster_profile": cluster_info,
            "all_clusters": list(cluster_map.values()),
        }

    @classmethod
    def _describe_kmeans_clusters(cls, model: Any) -> dict[int, dict[str, Any]]:
        scaler = None
        kmeans = None

        if hasattr(model, "named_steps"):
            scaler = model.named_steps.get("scaler")
            kmeans = model.named_steps.get("kmeans")

        if kmeans is None or not hasattr(kmeans, "cluster_centers_"):
            return {}

        centers = kmeans.cluster_centers_
        if scaler is not None and hasattr(scaler, "inverse_transform"):
            centers = scaler.inverse_transform(centers)

        centers_list = [
            {
                "cluster_id": idx,
                "centroid_guests": round(float(center[0]), 2),
                "centroid_price": round(float(center[1]), 2),
            }
            for idx, center in enumerate(centers)
        ]

        ordered = sorted(
            centers_list,
            key=lambda item: (item["centroid_guests"], item["centroid_price"]),
        )

        total = max(1, len(ordered) - 1)
        for rank, item in enumerate(ordered):
            band = rank / total
            if band <= 0.33:
                size_label = "Compact"
                cluster_name = "Compact / Budget Segment"
            elif band <= 0.66:
                size_label = "Balanced"
                cluster_name = "Balanced / Standard Segment"
            else:
                size_label = "Premium"
                cluster_name = "Premium / Large Segment"

            item["size_label"] = size_label
            item["cluster_name"] = cluster_name
            item["rank"] = rank + 1

        return {item["cluster_id"]: item for item in ordered}

    @classmethod
    def _format_regression_result(cls, output: dict[str, Any]) -> dict[str, Any]:
        estimated_price = round(float(output.get("prediction", 0.0)), 2)
        guests = float(output.get("input", {}).get("guests", 0.0) or 0.0)
        per_guest = round(estimated_price / guests, 2) if guests > 0 else None

        if estimated_price < 5000:
            budget_band = "Budget"
        elif estimated_price < 15000:
            budget_band = "Standard"
        else:
            budget_band = "Premium"

        output["estimated_price"] = estimated_price
        output["price_per_guest"] = per_guest
        output["budget_band"] = budget_band
        return output

    @classmethod
    def _predict_event_dates(cls, model: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        event_type = str(payload.get("event_type", "")).strip()
        if not event_type:
            raise ValueError("Field 'event_type' is required.")

        dates = model.get(event_type)
        if dates is None:
            raise ValueError(f"No dates found for event_type '{event_type}'.")

        parsed_dates = []
        for item in dates:
            try:
                parsed_dates.append(datetime.strptime(str(item), "%Y-%m-%d").date())
            except ValueError:
                continue

        parsed_dates.sort()
        today = date.today()
        upcoming = [item for item in parsed_dates if item >= today]

        return {
            "event_type": event_type,
            "recommended_dates": dates,
            "count": len(dates),
            "next_recommended_date": upcoming[0].isoformat() if upcoming else None,
        }

    @classmethod
    def _predict_label_encoder(cls, model: Any, payload: dict[str, Any]) -> dict[str, Any]:
        action = str(payload.get("action", "encode")).strip().lower()

        if action == "encode":
            label = str(payload.get("label", "")).strip()
            if not label:
                raise ValueError("Field 'label' is required for action='encode'.")

            encoded = model.transform([label])[0]
            return {
                "action": "encode",
                "label": label,
                "code": int(encoded),
                "available_labels": [str(item) for item in model.classes_],
            }

        if action == "decode":
            code_value = payload.get("code")
            if code_value is None or str(code_value).strip() == "":
                raise ValueError("Field 'code' is required for action='decode'.")

            code = int(float(code_value))
            label = model.inverse_transform([code])[0]
            return {
                "action": "decode",
                "code": code,
                "label": str(label),
                "available_labels": [str(item) for item in model.classes_],
            }

        raise ValueError("Field 'action' must be either 'encode' or 'decode'.")

    @classmethod
    def _predict_provider_lookup(cls, model: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        budget_value = payload.get("budget")
        if budget_value is None or str(budget_value).strip() == "":
            raise ValueError("Field 'budget' is required.")

        budget = float(budget_value)
        event_type = str(payload.get("event_type", "")).strip()
        city = str(payload.get("city", "")).strip()

        type_multiplier = {
            "Birthday": 0.9,
            "Concert": 1.1,
            "Conference": 1.0,
            "Corporate": 1.08,
            "Corporate Event": 1.08,
            "Gala": 1.15,
            "Private Party": 1.0,
            "Wedding": 1.2,
        }
        adjusted_target = budget * float(type_multiplier.get(event_type, 1.0))

        top_k_value = payload.get("top_k", 8)
        try:
            top_k = max(1, int(float(top_k_value)))
        except (TypeError, ValueError):
            top_k = 8

        candidates = cls._provider_records
        if not candidates:
            dedup: dict[int, dict[str, Any]] = {}
            for key, value in model.items():
                if not (isinstance(value, dict) and str(key).isdigit()):
                    continue

                provider_id = int(value.get("provider_id", key))
                dedup[provider_id] = {
                    "provider_id": provider_id,
                    "provider": str(value.get("provider", "Unknown Provider")),
                    "provider_service_type": cls._extract_provider_specialty(value),
                    "specialty": cls._extract_provider_specialty(value),
                    "city": str(value.get("city", "")).strip(),
                    "avg_price": float(value.get("avg_price", 0.0) or 0.0),
                }

            candidates = list(dedup.values())
        city_filter_used = bool(city)
        if city_filter_used:
            city_candidates = [item for item in candidates if item.get("city", "").lower() == city.lower()]
            if city_candidates:
                candidates = city_candidates
            else:
                city_filter_used = False

        scored = []
        for provider in candidates:
            avg_price = float(provider.get("avg_price", 0.0) or 0.0)
            diff = abs(avg_price - adjusted_target)
            fit_score = max(0.0, 100.0 - (diff / max(adjusted_target, 1.0) * 100.0))

            scored.append(
                {
                    "provider_id": provider.get("provider_id"),
                    "provider": provider.get("provider"),
                    "provider_service_type": provider.get("provider_service_type") or provider.get("specialty", "-"),
                    "specialty": provider.get("specialty", "-"),
                    "city": provider.get("city"),
                    "avg_price": round(avg_price, 2),
                    "price_gap": round(diff, 2),
                    "fit_score": round(fit_score, 2),
                }
            )

        scored.sort(key=lambda item: (item["price_gap"], -item["fit_score"]))
        recommendations = scored[:top_k]

        return {
            "budget": round(budget, 2),
            "adjusted_target_budget": round(adjusted_target, 2),
            "event_type": event_type,
            "city": city,
            "city_filter_applied": city_filter_used,
            "top_k": top_k,
            "recommendations": recommendations,
            "note": "Recommendations are budget-based using provider average prices from dataset, with event-type weighting.",
        }

    @classmethod
    def _predict_svd_defaults(cls, model: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        top_k_value = payload.get("top_k", 5)
        try:
            top_k = max(1, int(float(top_k_value)))
        except (TypeError, ValueError):
            top_k = 5

        default_items = model.get("default_items", [])
        return {
            "recommender_type": model.get("type", "unknown"),
            "recommended_items": default_items[:top_k],
            "top_k": top_k,
            "summary": f"{min(top_k, len(default_items))} recommendations returned",
        }

    @classmethod
    def _get_analytics_data(cls) -> pd.DataFrame:
        fallback_csv_path = cls._data_dir() / "demand_monthly_cache.csv"
        if cls._analytics_data_cache is not None:
            if not cls._analytics_data_cache.empty:
                return cls._analytics_data_cache
            if not fallback_csv_path.exists():
                return cls._analytics_data_cache

        dataset_path = cls._data_dir() / "eventzella_schema.xlsx"
        if not dataset_path.exists():
            if fallback_csv_path.exists():
                fallback_df = pd.read_csv(fallback_csv_path)
                if "event_month" in fallback_df.columns:
                    fallback_df["event_month"] = pd.to_datetime(fallback_df["event_month"], errors="coerce")
                cls._analytics_data_cache = fallback_df
            else:
                cls._analytics_data_cache = pd.DataFrame()
            return cls._analytics_data_cache

        try:
            event_df = pd.read_excel(dataset_path, sheet_name="EVENT")
            reservation_df = pd.read_excel(dataset_path, sheet_name="RESERVATION")
            service_df = pd.read_excel(dataset_path, sheet_name="SERVICE")
            provider_df = pd.read_excel(dataset_path, sheet_name="PROVIDER")
        except Exception:
            if fallback_csv_path.exists():
                fallback_df = pd.read_csv(fallback_csv_path)
                if "event_month" in fallback_df.columns:
                    fallback_df["event_month"] = pd.to_datetime(fallback_df["event_month"], errors="coerce")
                cls._analytics_data_cache = fallback_df
            else:
                cls._analytics_data_cache = pd.DataFrame()
            return cls._analytics_data_cache

        if "event_date" in event_df.columns:
            event_df["event_date"] = pd.to_datetime(event_df["event_date"], errors="coerce", dayfirst=True)

        merged = reservation_df.merge(
            event_df[["id_event", "type", "event_date", "budget"]],
            how="left",
            on="id_event",
        )
        merged = merged.merge(service_df[["id_service", "id_provider", "title"]], how="left", on="id_service")
        merged = merged.merge(provider_df[["id_provider", "city", "name"]], how="left", on="id_provider")

        merged = merged.rename(
            columns={
                "type": "event_type",
                "name": "provider_name",
                "title": "service_title",
            }
        )

        if "event_date" in merged.columns:
            merged["event_month"] = merged["event_date"].dt.to_period("M").dt.to_timestamp()
        else:
            merged["event_month"] = pd.NaT

        cls._analytics_data_cache = merged
        return cls._analytics_data_cache

    @classmethod
    def _predict_demand_forecast(cls, payload: dict[str, Any]) -> dict[str, Any]:
        demand_df = cls._get_analytics_data()
        if demand_df.empty:
            return {
                "historical_points": [],
                "forecast_points": [],
                "insight": "No analytics data available for forecasting.",
            }

        city = str(payload.get("city", "")).strip()
        event_type = str(payload.get("event_type", "")).strip()

        def normalize_text(value: Any) -> str:
            text = str(value or "").strip().lower()
            if not text:
                return ""
            text = unicodedata.normalize("NFKD", text)
            text = "".join(ch for ch in text if not unicodedata.combining(ch))
            return re.sub(r"\s+", " ", text).strip()

        try:
            horizon = max(1, min(18, int(float(payload.get("forecast_horizon", 6) or 6))))
        except (TypeError, ValueError):
            horizon = 6

        filtered = demand_df.copy()
        city_filter_applied = False
        event_type_filter_applied = False

        if city:
            city_norm = normalize_text(city)
            city_subset = filtered[
                filtered["city"].fillna("").map(normalize_text) == city_norm
            ]
            if not city_subset.empty:
                filtered = city_subset
                city_filter_applied = True

        if event_type:
            event_type_norm = normalize_text(event_type)
            event_subset = filtered[
                filtered["event_type"].fillna("").map(normalize_text) == event_type_norm
            ]
            if not event_subset.empty:
                filtered = event_subset
                event_type_filter_applied = True

        if filtered.empty:
            return {
                "city": city,
                "event_type": event_type,
                "forecast_horizon": horizon,
                "trend": "Stable",
                "historical_points": [],
                "forecast_points": [],
                "peak_forecast_months": [],
                "city_filter_applied": city_filter_applied,
                "event_type_filter_applied": event_type_filter_applied,
                "insight": "No data available for selected city/event type filters.",
            }

        filtered = filtered.dropna(subset=["event_month"])
        if "demand_count" in filtered.columns:
            monthly_counts = filtered.groupby("event_month")["demand_count"].sum().sort_index()
        else:
            monthly_counts = filtered.groupby("event_month").size().sort_index()
        if monthly_counts.empty:
            return {
                "historical_points": [],
                "forecast_points": [],
                "insight": "Insufficient data after filtering.",
            }

        full_index = pd.date_range(monthly_counts.index.min(), monthly_counts.index.max(), freq="MS")
        monthly_counts = monthly_counts.reindex(full_index, fill_value=0)

        lookback = min(12, len(monthly_counts))
        history_series = monthly_counts.tail(lookback)

        x_axis = np.arange(len(history_series), dtype=float)
        y_axis = history_series.values.astype(float)

        slope = float(np.polyfit(x_axis, y_axis, 1)[0]) if len(history_series) >= 2 else 0.0
        baseline = float(history_series.tail(3).mean()) if len(history_series) >= 3 else float(history_series.mean())

        last_month = monthly_counts.index[-1]
        forecast_points = []
        for step in range(1, horizon + 1):
            month_value = last_month + pd.DateOffset(months=step)
            predicted = max(0.0, baseline + (slope * step))
            forecast_points.append(
                {
                    "month": month_value.strftime("%Y-%m"),
                    "predicted_demand": int(round(predicted)),
                }
            )

        historical_points = [
            {"month": idx.strftime("%Y-%m"), "demand": int(value)}
            for idx, value in history_series.items()
        ]

        peak_forecast = sorted(forecast_points, key=lambda item: item["predicted_demand"], reverse=True)[:3]
        if slope > 1.0:
            trend_label = "Growing"
        elif slope < -1.0:
            trend_label = "Declining"
        else:
            trend_label = "Stable"

        return {
            "city": city,
            "event_type": event_type,
            "forecast_horizon": horizon,
            "trend": trend_label,
            "historical_points": historical_points,
            "forecast_points": forecast_points,
            "peak_forecast_months": peak_forecast,
            "city_filter_applied": city_filter_applied,
            "event_type_filter_applied": event_type_filter_applied,
            "insight": f"Demand trend is {trend_label.lower()} based on recent monthly history.",
        }

    @classmethod
    def _predict_quote_generator(cls, payload: dict[str, Any]) -> dict[str, Any]:
        event_type = str(payload.get("event_type", "")).strip()
        city = str(payload.get("city", "")).strip()
        guests_raw = payload.get("guests")

        if not event_type:
            raise ValueError("Field 'event_type' is required.")
        if not city:
            raise ValueError("Field 'city' is required.")
        if guests_raw is None or str(guests_raw).strip() == "":
            raise ValueError("Field 'guests' is required.")

        guests = max(1, int(float(guests_raw)))
        margin_raw = payload.get("target_margin", 18)
        try:
            target_margin = max(0.0, float(margin_raw))
        except (TypeError, ValueError):
            target_margin = 18.0

        estimated_price = cls._estimate_price_from_model(event_type, city, guests)
        if estimated_price is None:
            estimated_price = round(guests * 90.0, 2)

        line_distribution = [
            ("Venue & Logistics", 0.32),
            ("Catering", 0.28),
            ("Production & AV", 0.20),
            ("Staff & Operations", 0.12),
            ("Contingency", 0.08),
        ]
        line_items = [
            {
                "label": label,
                "percentage": round(ratio * 100, 2),
                "amount": round(estimated_price * ratio, 2),
            }
            for label, ratio in line_distribution
        ]

        margin_value = round(estimated_price * (target_margin / 100.0), 2)
        total_quote = round(estimated_price + margin_value, 2)

        provider_model = cls._load_model("provider_budget_model")
        provider_result = cls._predict_provider_lookup(
            provider_model,
            {
                "budget": estimated_price,
                "event_type": event_type,
                "city": city,
                "top_k": 5,
            },
        )

        client_name = str(payload.get("client_name", "")).strip() or "Client"
        extra_notes = str(payload.get("extra_notes", "")).strip()

        llm_prompt = (
            "Generate a concise professional quotation summary in French. "
            f"Client: {client_name}. Event type: {event_type}. City: {city}. Guests: {guests}. "
            f"Base price: {estimated_price}. Margin percent: {target_margin}. Total quote: {total_quote}. "
            f"Extra notes: {extra_notes}."
        )
        llm_summary = cls._call_ollama(llm_prompt) or (
            f"Devis pour {client_name}: événement {event_type} à {city} pour {guests} invités. "
            f"Montant estimé {estimated_price}, marge {target_margin}%, total proposé {total_quote}."
        )

        return {
            "quote_id": datetime.now().strftime("Q-%Y%m%d-%H%M%S"),
            "client_name": client_name,
            "event_type": event_type,
            "city": city,
            "guests": guests,
            "base_estimated_cost": round(estimated_price, 2),
            "target_margin_percent": round(target_margin, 2),
            "margin_value": margin_value,
            "total_quote": total_quote,
            "line_items": line_items,
            "provider_alternatives": provider_result.get("recommendations", [])[:3],
            "llm_summary": llm_summary,
            "notes": extra_notes,
        }

    @classmethod
    def _predict_planning_copilot(cls, payload: dict[str, Any]) -> dict[str, Any]:
        request_text = str(payload.get("request_text", "")).strip()
        if not request_text:
            raise ValueError("Field 'request_text' is required.")

        try:
            top_k = max(1, int(float(payload.get("top_k", 5) or 5)))
        except (TypeError, ValueError):
            top_k = 5

        extracted = cls._extract_requirements_from_text(request_text)
        event_type = str(extracted.get("event_type", "")).strip() or (cls._event_types[0] if cls._event_types else "Wedding")
        city = str(extracted.get("city", "")).strip() or (cls._city_options[0] if cls._city_options else "Tunis")

        guests_raw = extracted.get("guests", 120)
        try:
            guests = max(1, int(float(guests_raw)))
        except (TypeError, ValueError):
            guests = 120

        budget_raw = extracted.get("budget")
        budget_value: float | None
        try:
            budget_value = float(budget_raw) if budget_raw is not None and str(budget_raw).strip() != "" else None
        except (TypeError, ValueError):
            budget_value = None

        estimated_price = cls._estimate_price_from_model(event_type, city, guests)
        if estimated_price is None:
            estimated_price = round(guests * 90.0, 2)

        effective_budget = budget_value if budget_value is not None else estimated_price

        provider_model = cls._load_model("provider_budget_model")
        provider_result = cls._predict_provider_lookup(
            provider_model,
            {
                "budget": effective_budget,
                "event_type": event_type,
                "city": city,
                "top_k": top_k,
            },
        )

        date_suggestions: list[str] = []
        next_date: str | None = None
        try:
            date_model = cls._load_model("event_date_model")
            date_result = cls._predict_event_dates(date_model, {"event_type": event_type})
            date_suggestions = date_result.get("recommended_dates", [])
            next_date = date_result.get("next_recommended_date")
        except Exception:
            date_suggestions = []

        forecast_result = cls._predict_demand_forecast(
            {
                "city": city,
                "event_type": event_type,
                "forecast_horizon": 3,
            }
        )

        plan_steps = [
            f"Validate scope: {event_type} in {city} for around {guests} guests.",
            f"Set working budget around {round(effective_budget, 2)} and compare with estimated price {round(estimated_price, 2)}.",
            "Select top providers from recommendations and request availability.",
            "Lock event date and finalize service package and contingency plan.",
        ]

        llm_prompt = (
            "Create a concise event execution plan in French with 5 bullets. "
            f"Request: {request_text}. Event type: {event_type}. City: {city}. Guests: {guests}. "
            f"Budget: {effective_budget}. Estimated price: {estimated_price}. Next date: {next_date}."
        )
        llm_plan = cls._call_ollama(llm_prompt)

        return {
            "request_text": request_text,
            "extracted_requirements": {
                "event_type": event_type,
                "city": city,
                "guests": guests,
                "budget": round(effective_budget, 2),
                "requested_date": extracted.get("date"),
            },
            "estimated_price": round(estimated_price, 2),
            "recommended_dates": date_suggestions,
            "next_recommended_date": next_date,
            "providers": provider_result.get("recommendations", []),
            "demand_forecast_snapshot": forecast_result,
            "plan_steps": plan_steps,
            "llm_plan": llm_plan,
        }

    @classmethod
    def _extract_requirements_from_text(cls, request_text: str) -> dict[str, Any]:
        llm_prompt = (
            "Extract event planning requirements from the user text and return JSON only with keys: "
            "event_type, city, guests, budget, date. "
            f"Text: {request_text}"
        )
        llm_response = cls._call_ollama(llm_prompt)
        if llm_response:
            parsed = cls._try_parse_json_from_text(llm_response)
            if parsed:
                return parsed

        text_lower = request_text.lower()

        event_type = ""
        for option in cls._event_types:
            if option.lower() in text_lower:
                event_type = option
                break
        if not event_type:
            if "wedding" in text_lower:
                event_type = "Wedding"
            elif "corporate" in text_lower:
                event_type = "Corporate Event"
            elif "birthday" in text_lower:
                event_type = "Birthday"
            elif "party" in text_lower:
                event_type = "Private Party"

        city = ""
        for option in cls._city_options:
            if option.lower() in text_lower:
                city = option
                break

        guest_match = re.search(r"(\d{2,4})\s*(guests|invite|invites|person|people|participants)", text_lower)
        guests = int(guest_match.group(1)) if guest_match else None

        budget_match = re.search(r"(\d{3,8}(?:[\.,]\d+)?)\s*(tnd|dt|dinar|budget)", text_lower)
        budget = None
        if budget_match:
            budget_str = budget_match.group(1).replace(",", ".")
            try:
                budget = float(budget_str)
            except ValueError:
                budget = None

        date_match = re.search(r"(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})", request_text)
        request_date = date_match.group(1) if date_match else None

        return {
            "event_type": event_type,
            "city": city,
            "guests": guests,
            "budget": budget,
            "date": request_date,
        }

    @staticmethod
    def _try_parse_json_from_text(text: str) -> dict[str, Any] | None:
        text = text.strip()
        candidates = [text]

        json_match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if json_match:
            candidates.append(json_match.group(0))

        for candidate in candidates:
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                continue
        return None

    @classmethod
    def _estimate_price_from_model(cls, event_type: str, city: str, guests: int) -> float | None:
        try:
            model = cls._load_model("xgboost_price_regression")
            frame = pd.DataFrame(
                [
                    {
                        "guests": float(guests),
                        "event_type": cls._normalize_event_type_for_ml(event_type),
                        "city": city,
                    }
                ]
            )
            prediction = float(model.predict(frame)[0])
            return round(prediction, 2)
        except Exception:
            return None

    @classmethod
    def _call_ollama(cls, prompt: str, model_name: str = "llama3:latest") -> str | None:
        ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
        request_body = json.dumps(
            {
                "model": model_name,
                "prompt": prompt,
                "stream": False,
            }
        ).encode("utf-8")

        request = urllib.request.Request(
            ollama_url,
            data=request_body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = json.loads(response.read().decode("utf-8"))
            text = str(payload.get("response", "")).strip()
            return text or None
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            return None
        except Exception:
            return None

    @classmethod
    def _format_chatbot_intent_result(cls, output: dict[str, Any]) -> dict[str, Any]:
        probabilities = output.get("probabilities", {})
        ranked = sorted(probabilities.items(), key=lambda item: item[1], reverse=True)

        top_intents = [
            {"intent": str(intent), "confidence": round(float(prob) * 100, 2)}
            for intent, prob in ranked[:5]
        ]

        best_conf = top_intents[0]["confidence"] if top_intents else None

        return {
            **output,
            "predicted_intent": output.get("prediction"),
            "confidence_percent": best_conf,
            "top_intents": top_intents,
        }

    @classmethod
    def _format_complaint_result(cls, output: dict[str, Any]) -> dict[str, Any]:
        probabilities = output.get("probabilities", {})
        risk_prob = 0.0
        for class_name, prob in probabilities.items():
            if str(class_name).strip() in {"1", "True", "true"}:
                risk_prob = float(prob)
                break

        risk_percent = round(risk_prob * 100, 2)
        safe_percent = round((1.0 - risk_prob) * 100, 2)

        if risk_percent < 35:
            risk_level = "Low"
        elif risk_percent < 65:
            risk_level = "Medium"
        else:
            risk_level = "High"

        return {
            **output,
            "risk_probability": risk_percent,
            "safe_probability": safe_percent,
            "risk_level": risk_level,
            "decision": "Likely Complaint" if risk_percent >= 50 else "Likely No Complaint",
        }

    @classmethod
    def _normalize_event_type_for_ml(cls, value: str) -> str:
        if not value:
            return value

        aliases = {
            "Corporate Event": "Corporate",
            "Private Party": "Birthday",
        }
        normalized = aliases.get(value, value)
        return normalized

    @staticmethod
    def _extract_classes(model: Any) -> list[Any] | None:
        if hasattr(model, "classes_"):
            return list(model.classes_)

        if hasattr(model, "named_steps"):
            for step in reversed(list(model.named_steps.values())):
                if hasattr(step, "classes_"):
                    return list(step.classes_)

        return None

    @staticmethod
    def _to_python(value: Any) -> Any:
        if isinstance(value, (np.integer,)):
            return int(value)
        if isinstance(value, (np.floating,)):
            return float(value)
        if isinstance(value, (np.ndarray,)):
            return value.tolist()
        return value

    @classmethod
    def get_domain_context(cls) -> str:
        cls._ensure_dynamic_registry_data()

        lines = [
            "Eventzella domain context:",
            "- Platform for event planning and provider recommendations.",
            "- ML models available:",
        ]

        for model_key, meta in MODEL_REGISTRY.items():
            lines.append(f"  - {model_key}: {meta['description']}")

        if cls._event_types:
            lines.append(f"- Event types: {', '.join(cls._event_types)}")

        if cls._city_options:
            sample_cities = ", ".join(cls._city_options[:10])
            lines.append(f"- Cities sample: {sample_cities}")

        if cls._provider_records:
            top_affordable = cls._provider_records[:5]
            snippets = [
                f"{item['provider']} ({item['city']}, avg={round(item['avg_price'], 2)})"
                for item in top_affordable
            ]
            lines.append("- Affordable provider examples: " + "; ".join(snippets))

        return "\n".join(lines)
