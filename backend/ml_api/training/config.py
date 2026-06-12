"""Configuration MLOps - MLflow"""

from pathlib import Path

# Chemin racine du projet
BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent

# Configuration MLflow - Backend Store
MLFLOW_TRACKING_URI = "file:" + str(BASE_DIR / "mlruns")
MLFLOW_REGISTRY_URI = str(BASE_DIR / "model_registry.db")

print(f"✅ MLflow Tracking URI: {MLFLOW_TRACKING_URI}")
print(f"✅ MLflow Models Registry: {MLFLOW_REGISTRY_URI}")

# Configuration des expériences
EXPERIMENT_NAMES = {
    "cancellation_rate": "Cancellation_Rate_Classifier",
    "price_regression": "Price_Regression_Gradient_Boosting",
    "chatbot_intent": "Chatbot_Intent_Classifier",
    "complaint_risk": "Complaint_Risk_NLP",
    "event_date": "Event_Date_Recommender",
    "event_type_encoder": "Event_Type_Encoder",
    "kmeans_clustering": "KMeans_Event_Clustering",
    "svd_recommender": "SVD_Collaborative_Filter",
    "demand_forecast": "Demand_Forecast_Baseline",
    "provider_budget_lookup": "Provider_Budget_Lookup",
}

# Hyperparamètres par modèle
HYPERPARAMETERS = {
    "cancellation_rate": {
        "n_estimators": [50, 100, 200],
        "max_depth": [5, 10, 15],
        "min_samples_split": [2, 5],
        "learning_rate": [0.01, 0.1],
    },
    "price_regression": {
        "n_estimators": [100, 200, 300],
        "max_depth": [5, 10, 15],
        "learning_rate": [0.01, 0.05, 0.1],
        "subsample": [0.8, 0.9, 1.0],
    },
}

# Chemins de données
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"

# S'assurer que les répertoires existent
DATA_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)

print(f"✅ Data Directory: {DATA_DIR}")
print(f"✅ Models Directory: {MODELS_DIR}")
