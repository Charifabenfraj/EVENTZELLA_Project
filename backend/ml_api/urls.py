from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("models/", views.models_catalog, name="models-catalog"),
    path("models/<str:model_key>/predict/", views.model_predict, name="model-predict"),
    path("training/samples/<str:model_key>/", views.training_sample_ingest, name="training-sample-ingest"),
    path("mlops/status/", views.mlops_status, name="mlops-status"),
    path("mlops/retrain/", views.mlops_retrain, name="mlops-retrain"),
    path("metrics/", views.metrics, name="metrics"),
    path("monitoring/simulate/", views.simulate_incident, name="monitoring-simulate"),
    path("audit/provider-budget/", views.audit_provider_budget, name="audit-provider-budget"),
    path("audit/event-date/", views.audit_event_date_recommendation, name="audit-event-date"),
    path("audit/demand-forecast/", views.audit_demand_forecast, name="audit-demand-forecast"),
    path("chat/", views.chat_with_ollama, name="chat-with-ollama"),
]
