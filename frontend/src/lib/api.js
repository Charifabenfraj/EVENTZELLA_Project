const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const N8N_PROVIDER_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_PROVIDER_WEBHOOK_URL ||
  "http://localhost:5678/webhook-test/eventzella/provider-budget-lookup";
const N8N_EVENT_DATE_WEATHER_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_EVENT_DATE_WEATHER_WEBHOOK_URL ||
  "http://localhost:5678/webhook-test/eventzella/event-date-weather-ai";
const N8N_DEMAND_FORECAST_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_DEMAND_FORECAST_WEBHOOK_URL ||
  "http://localhost:5678/webhook-test/eventzella/demand-forecast-ai";
const N8N_INTELLIGENT_QUOTE_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_INTELLIGENT_QUOTE_WEBHOOK_URL ||
  "http://localhost:5678/webhook-test/eventzella/intelligent-quote";

function normalizePredictionPayload(modelKey, payload) {
  const safePayload = payload && typeof payload === "object" ? { ...payload } : {};

  if (modelKey === "xgboost_price_regression") {
    const rawBudget = safePayload.budget;
    const missingBudget =
      rawBudget === undefined ||
      rawBudget === null ||
      (typeof rawBudget === "string" && rawBudget.trim() === "");

    if (missingBudget) {
      safePayload.budget = 0;
    }
  }

  return safePayload;
}

export async function fetchModels() {
  const response = await fetch(`${API_BASE_URL}/models/`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Impossible de charger les modèles depuis l'API Django.");
  }

  return response.json();
}

export async function predictModel(modelKey, payload) {
  const normalizedPayload = normalizePredictionPayload(modelKey, payload);

  const response = await fetch(`${API_BASE_URL}/models/${modelKey}/predict/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizedPayload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erreur de prédiction.");
  }

  return data;
}

export async function submitTrainingSample(modelKey, payload) {
  const response = await fetch(`${API_BASE_URL}/training/samples/${modelKey}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erreur d'enregistrement du sample de training.");
  }

  return data;
}

export async function fetchMlopsStatus() {
  const response = await fetch(`${API_BASE_URL}/mlops/status/`, {
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erreur de récupération du statut MLOps.");
  }

  return data;
}

export async function triggerMlopsRetrain() {
  const response = await fetch(`${API_BASE_URL}/mlops/retrain/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = await response.json();
  if (!response.ok && response.status !== 409) {
    throw new Error(data.error || "Erreur de lancement du retrain.");
  }

  return data;
}

export async function chatWithOllama(payload) {
  const response = await fetch(`${API_BASE_URL}/chat/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erreur de chat Ollama.");
  }

  return data;
}

export async function submitProviderBudgetWebhook(payload) {
  const response = await fetch(N8N_PROVIDER_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erreur webhook n8n Provider Budget Lookup.");
  }

  return data;
}

export async function submitEventDateWeatherWebhook(payload) {
  const response = await fetch(N8N_EVENT_DATE_WEATHER_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erreur webhook n8n Event Date Weather.");
  }

  return data;
}

export async function submitDemandForecastWebhook(payload) {
  const response = await fetch(N8N_DEMAND_FORECAST_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erreur webhook n8n Demand Forecast.");
  }

  return data;
}

export async function submitIntelligentQuoteWebhook(payload) {
  const response = await fetch(N8N_INTELLIGENT_QUOTE_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let data = {};

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Erreur webhook n8n Intelligent Quote (HTTP ${response.status}).`);
  }

  return Object.keys(data).length ? data : { ok: true, message: "Webhook executed with empty response body." };
}
