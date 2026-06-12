"""Pipeline MLOps avec MLflow - Core Training Logic"""

import json
import pickle
from pathlib import Path
from datetime import datetime

import mlflow
import mlflow.sklearn
import mlflow.xgboost
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_squared_error, mean_absolute_error, r2_score
)
from sklearn.preprocessing import LabelEncoder

from .config import MLFLOW_TRACKING_URI, EXPERIMENT_NAMES, MODELS_DIR


class MLOpsTrainingPipeline:
    """Pipeline d'entraînement avec tracking MLflow"""
    
    def __init__(self, model_name: str, model_type: str = "classification"):
        """
        Initialiser le pipeline
        
        Args:
            model_name: Clé du modèle (ex: 'cancellation_rate', 'price_regression')
            model_type: 'classification' ou 'regression'
        """
        self.model_name = model_name
        self.model_type = model_type
        self.experiment_name = EXPERIMENT_NAMES.get(model_name, model_name)
        self.trained_model = None
        self.metrics = {}
        self.X_columns = None
        
        # Configurer MLflow
        mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
        
        # Créer ou récupérer l'expérience
        try:
            mlflow.set_experiment(self.experiment_name)
            print(f"✅ Expérience créée/récupérée: {self.experiment_name}")
        except Exception as e:
            print(f"⚠️ Erreur lors de la création d'expérience: {e}")
    
    def load_data(self, csv_path: str) -> pd.DataFrame:
        """Charger les données depuis un fichier CSV"""
        print(f"\n📂 Chargement des données: {csv_path}")
        
        try:
            df = pd.read_csv(csv_path)
            print(f"✅ Données chargées: {df.shape[0]} lignes, {df.shape[1]} colonnes")
            return df
        except FileNotFoundError:
            print(f"❌ Fichier non trouvé: {csv_path}")
            raise
    
    def preprocess(self, df: pd.DataFrame, target_col: str, 
                  drop_cols: list = None) -> tuple:
        """
        Prétraitement des données
        
        Args:
            df: DataFrame à prétraiter
            target_col: Colonne cible
            drop_cols: Colonnes à supprimer
            
        Returns:
            (X, y): Features et target
        """
        print("🔧 Prétraitement en cours...")
        
        df = df.copy()
        
        # Supprimer les colonnes inutiles
        if drop_cols:
            df = df.drop(columns=drop_cols, errors='ignore')
            print(f"   - Colonnes supprimées: {drop_cols}")
        
        # Séparer features et target avant encoding
        X = df.drop(columns=[target_col])
        y = df[target_col]
        
        # ENCODER les colonnes TEXT en nombres
        print("   - Encodage des colonnes texte...")
        text_cols = X.select_dtypes(include=['object']).columns
        self.label_encoders = {}
        
        for col in text_cols:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col])
            self.label_encoders[col] = le
            print(f"     ✅ {col}: {list(le.classes_)}")
        
        # Gérer les valeurs manquantes
        numeric_cols = X.select_dtypes(include=[np.number]).columns
        X[numeric_cols] = X[numeric_cols].fillna(X[numeric_cols].mean())
        print(f"   - Valeurs manquantes remplies")
        
        self.X_columns = X.columns.tolist()
        
        print(f"✅ Prétraitement terminé: X={X.shape}, y={y.shape}")
        print(f"   - Features: {self.X_columns}")
        
        return X, y
    
    def train(self, X_train, y_train, X_test, y_test, params: dict):
        """
        Entraîner le modèle avec MLflow tracking
        
        Args:
            X_train, y_train: Données d'entraînement
            X_test, y_test: Données de test
            params: Hyperparamètres
            
        Returns:
            dict: Métriques d'entraînement
        """
        
        print(f"\n🚀 Démarrage du RUN MLflow pour {self.model_name}")
        print(f"   Paramètres: {params}")
        
        # DÉMARRER UN RUN MLFLOW
        with mlflow.start_run():
            run = mlflow.active_run()
            run_id = run.info.run_id
            print(f"   Run ID: {run_id}")
            
            # ========== ÉTAPE 1: Logger les paramètres ==========
            mlflow.log_params(params)
            print(f"✅ Paramètres loggés dans MLflow")
            
            # ========== ÉTAPE 2: Créer et entraîner le modèle ==========
            print(f"   Entraînement du modèle...")
            
            if self.model_type == "classification":
                model = RandomForestClassifier(**params, random_state=42, n_jobs=-1)
                print(f"✅ RandomForestClassifier créé")
            else:
                model = GradientBoostingRegressor(**params, random_state=42)
                print(f"✅ GradientBoostingRegressor créé")
            
            model.fit(X_train, y_train)
            self.trained_model = model
            print(f"✅ Modèle entraîné")
            
            # ========== ÉTAPE 3: Prédictions ==========
            y_pred = model.predict(X_test)
            print(f"✅ Prédictions générées")
            
            # ========== ÉTAPE 4: Calculer les métriques ==========
            print(f"   Calcul des métriques...")
            
            if self.model_type == "classification":
                accuracy = accuracy_score(y_test, y_pred)
                precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
                recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
                f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
                
                metrics = {
                    "accuracy": float(accuracy),
                    "precision": float(precision),
                    "recall": float(recall),
                    "f1_score": float(f1),
                    "test_samples": len(X_test),
                }
                print(f"   Classification Metrics:")
                print(f"   - Accuracy:  {accuracy:.4f}")
                print(f"   - Precision: {precision:.4f}")
                print(f"   - Recall:    {recall:.4f}")
                print(f"   - F1-Score:  {f1:.4f}")
                
            else:
                rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
                mae = float(mean_absolute_error(y_test, y_pred))
                r2 = float(r2_score(y_test, y_pred))
                
                metrics = {
                    "rmse": rmse,
                    "mae": mae,
                    "r2_score": r2,
                    "test_samples": len(X_test),
                }
                print(f"   Regression Metrics:")
                print(f"   - RMSE:      {rmse:.4f}")
                print(f"   - MAE:       {mae:.4f}")
                print(f"   - R² Score:  {r2:.4f}")
            
            self.metrics = metrics
            
            # ========== ÉTAPE 5: Logger les métriques dans MLflow ==========
            mlflow.log_metrics(metrics)
            print(f"✅ Métriques loggées dans MLflow")
            
            # ========== ÉTAPE 6: Logger le modèle ==========
            print(f"   Enregistrement du modèle dans MLflow Registry...")
            
            if self.model_type == "classification":
                mlflow.sklearn.log_model(
                    model, 
                    artifact_path="model",
                    registered_model_name=self.experiment_name
                )
            else:
                mlflow.sklearn.log_model(
                    model, 
                    artifact_path="model",
                    registered_model_name=self.experiment_name
                )
            
            print(f"✅ Modèle enregistré dans MLflow Registry")
            
            # ========== ÉTAPE 7: Logger les métadonnées ==========
            metadata = {
                "training_date": datetime.now().isoformat(),
                "model_name": self.model_name,
                "model_type": self.model_type,
                "training_samples": len(X_train),
                "test_samples": len(X_test),
                "features": self.X_columns,
                "run_id": run_id,
            }
            mlflow.log_dict(metadata, "metadata.json")
            print(f"✅ Métadonnées loggées")
            
            # ========== ÉTAPE 8: Logger un artifact (fichier) ==========
            model_info = {
                "model_name": self.model_name,
                "model_type": self.model_type,
                "metrics": metrics,
                "parameters": params,
                "timestamp": datetime.now().isoformat(),
            }
            
            with open("model_info.json", "w") as f:
                json.dump(model_info, f, indent=2)
            
            mlflow.log_artifact("model_info.json")
            print(f"✅ Artifacts loggés")
            
            print(f"\n✅ RUN MLflow terminé avec succès!")
            print(f"   Run ID: {run_id}")
            
            return self.metrics
    
    def save_model(self, output_path: str = None):
        """Sauvegarder le modèle en pickle avec les encoders"""
        if output_path is None:
            output_path = str(MODELS_DIR / f"{self.model_name}.pkl")
        
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Sauvegarder le modèle ET les encoders ensemble
        model_package = {
            'model': self.trained_model,
            'label_encoders': getattr(self, 'label_encoders', {}),
            'feature_names': self.X_columns
        }
        
        with open(output_path, 'wb') as f:
            pickle.dump(model_package, f)
        
        print(f"💾 Modèle sauvegardé: {output_path}")
        print(f"   - Encoders sauvegardés: {list(model_package['label_encoders'].keys())}")
        return output_path
