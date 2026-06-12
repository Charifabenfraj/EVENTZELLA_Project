# Eventzella ML Dashboard and n8n Workflows

Application full-stack pour tester des modèles ML, exécuter des workflows n8n metier, stocker les résultats en base MySQL et envoyer des emails automatiques.

## Vue D'ensemble

Le projet combine:

- un frontend Next.js pour tester les modèles et déclencher les workflows,
- un backend Django pour servir les modèles et les modules IA,
- un moteur n8n pour l'automatisation (cron, webhook, email, MySQL),
- une base MySQL / DWH Eventzella,
- des modèles `.pkl` et des modules IA virtuels.

## Fonctionnalites Principales

- Dashboard central avec sidebar par catégorie de modèles.
- Formulaires dynamiques pour les modèles ML et les workflows.
- Affichage métier des résultats pour les modèles les plus utiles.
- Forecast de demande par ville / type / horizon.
- Générateur de devis intelligent avec marge, alternatives et email HTML.
- Assistant de planification événementielle.
- Intégration du chatbot LLM via Ollama.

## Architecture

- `backend/`: API Django.
- `frontend/`: interface Next.js.
- `models/`: modèles ML pickle.
- `workflows/`: exports n8n JSON.
- `data/`: jeux de données et cache de forecast.

## Catalogue Des Workflows n8n

### 1. Monthly BO Report

Fichier: [workflows/monthly_bo_report_email.n8n.json](workflows/monthly_bo_report_email.n8n.json)

Role:

- déclenchement mensuel via schedule trigger,
- exécution du script Python de reporting BO,
- génération et lecture des fichiers Excel / PDF,
- envoi d'un email Gmail avec pièces jointes au management.

Ce workflow sert au reporting opérationnel mensuel. Il ne fait pas d'inférence ML, il automatise la production du rapport BO.

### 2. Demand Forecast AI

Fichier: [workflows/demand_forecast_city_type_date.n8n.json](workflows/demand_forecast_city_type_date.n8n.json)

Role:

- déclenchement cron quotidien ou webhook,
- normalisation des paramètres `city`, `event_type`, `forecast_horizon`, `alert_peak_threshold`,
- appel du modèle Django `demand_forecast_ai`,
- enrichissement des KPIs de tendance et de pic de demande,
- génération d'une recommandation IA optionnelle,
- retour JSON au front, avec possibilité d'audit.

Cas d'usage:

- prioriser les dates ou les campagnes en fonction de la demande future,
- détecter les pics de demande par ville et type d'événement.

### 3. Event Date Weather AI

Fichier: [workflows/event_date_weather_ai.n8n.json](workflows/event_date_weather_ai.n8n.json)

Role:

- déclenchement cron quotidien ou webhook,
- récupération météo Open-Meteo pour une ville,
- fusion avec les dates recommandées par le modèle événementiel,
- calcul d'un score météo et des meilleures dates candidates,
- génération d'un conseil IA optionnel,
- réponse JSON pour le front.

Cas d'usage:

- recommander des dates d'événements avec une météo plus favorable,
- comparer plusieurs créneaux avant validation d'un planning.

### 4. Provider Budget Lookup

Fichier: [workflows/provider_budget_lookup.n8n.json](workflows/provider_budget_lookup.n8n.json)

Role:

- déclenchement webhook,
- normalisation de `budget`, `event_type`, `city`, `top_k`,
- appel du modèle Django `provider_budget_model`,
- récupération et enrichissement des prestataires compatibles,
- préparation d'un résumé IA optionnel,
- réponse JSON structurée pour le front.

Cas d'usage:

- trouver rapidement les meilleurs prestataires selon le budget,
- construire un package événementiel simple et exploitable.

### 5. Intelligent Quote Generator

Fichier: [workflows/intelligent_quote_generator.n8n.json](workflows/intelligent_quote_generator.n8n.json)

Role:

- déclenchement webhook depuis le front,
- appel du module IA `intelligent_quote_generator`,
- sauvegarde du devis dans la table MySQL `fact_quote`,
- génération d'un email HTML soigné,
- envoi du devis au destinataire,
- réponse JSON avec les métriques clés du devis.

Champs d'entrée:

- `client_name`
- `event_type`
- `city`
- `guests`
- `target_margin`
- `extra_notes`
- `recipient_email`

Champs de sortie:

- `quote_id`
- `base_estimated_cost`
- `margin_value`
- `total_quote`
- `line_items`
- `provider_alternatives`
- `llm_summary`

## Etat Du Bonus Retraining

Le bonus suivant n'est pas encore implémenté dans le dépôt:

- pipeline de réentraînement automatique déclenché par schedule ou drift,
- versioning / stockage d'une nouvelle version du modèle,
- gestion d'un registre de modèles.

Etat actuel:

- pas de workflow n8n de retraining dans `workflows/`,
- pas de script de drift detection dans `backend/`,
- pas de model registry local ou distant déjà branché.

Si tu veux le faire ensuite, la bonne approche est:

1. Ajouter un job planifié de détection de drift.
2. Déclencher un script de réentraînement Python.
3. Versionner le nouveau modèle dans `models/` ou dans un storage dédié.
4. Mettre à jour le backend pour charger la dernière version approuvée.

## Lancement Local

### Backend Django

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend: `http://localhost:8000`

### Frontend Next.js

```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Frontend: `http://localhost:3000`

### Docker

```bash
docker compose up --build
```

## API Principales

- `GET /api/health/`
- `GET /api/models/`
- `POST /api/models/<model_key>/predict/`
- `POST /api/chat/`

## Variables D'Environnement Utiles

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_N8N_PROVIDER_WEBHOOK_URL`
- `NEXT_PUBLIC_N8N_EVENT_DATE_WEATHER_WEBHOOK_URL`
- `NEXT_PUBLIC_N8N_DEMAND_FORECAST_WEBHOOK_URL`
- `NEXT_PUBLIC_N8N_INTELLIGENT_QUOTE_WEBHOOK_URL`
- `MANAGEMENT_EMAIL`
- `EVENTZELLA_PROJECT_ROOT`

## Notes Techniques

- Le backend charge les modèles depuis le dossier racine `models/`.
- Le forecast utilise un fallback sur `data/demand_monthly_cache.csv` si nécessaire.
- Le chatbot et les fonctions IA virtuelles dépendent d'Ollama quand le mode LLM est actif.
- Les workflows n8n utilisent MySQL et Gmail; ils doivent être configurés avec les bonnes credentials.

## Fichiers Cles

- [backend/ml_api/model_service.py](backend/ml_api/model_service.py)
- [backend/ml_api/views.py](backend/ml_api/views.py)
- [frontend/src/components/ModelTestForm.jsx](frontend/src/components/ModelTestForm.jsx)
- [frontend/src/components/Sidebar.jsx](frontend/src/components/Sidebar.jsx)
- [workflows/](workflows)
