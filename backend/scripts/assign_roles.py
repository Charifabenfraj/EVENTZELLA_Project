import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eventzella_backend.settings')
django.setup()

from enterprise.models import Role

mappings = {
    'ceo': ['intelligent_quote_generator', 'demand_forecast_ai', 'xgboost_price_regression', 'cancellation_rate_model', 'kmeans_clustering', 'planning_copilot'],
    'business': ['intelligent_quote_generator', 'provider_budget_model', 'xgboost_price_regression', 'demand_forecast_ai', 'kmeans_clustering', 'event_date_model', 'planning_copilot', 'cancellation_rate_model'],
    'quality': ['complaint_risk_model', 'cancellation_rate_model', 'chatbot_intent_classifier', 'planning_copilot', 'provider_budget_model'],
    'marketing': ['demand_forecast_ai', 'kmeans_clustering', 'svd_collaborative_filter', 'xgboost_price_regression', 'event_date_model', 'chatbot_intent_classifier', 'intelligent_quote_generator']
}

for slug, models in mappings.items():
    Role.objects.filter(slug=slug).update(allowed_ml_models=models)

print("Roles ML models successfully mapped according to user specification!")
