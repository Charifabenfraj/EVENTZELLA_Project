import pymysql
import json

connection = pymysql.connect(
    host='127.0.0.1',
    user='root',
    password='',
    database='eventzella_db',
    cursorclass=pymysql.cursors.DictCursor
)

mappings = {
    'ceo': ['intelligent_quote_generator', 'demand_forecast_ai', 'xgboost_price_regression', 'cancellation_rate_model', 'kmeans_clustering', 'planning_copilot'],
    'business': ['intelligent_quote_generator', 'provider_budget_model', 'xgboost_price_regression', 'demand_forecast_ai', 'kmeans_clustering', 'event_date_model', 'planning_copilot', 'cancellation_rate_model'],
    'quality': ['complaint_risk_model', 'cancellation_rate_model', 'chatbot_intent_classifier', 'planning_copilot', 'provider_budget_model'],
    'marketing': ['demand_forecast_ai', 'kmeans_clustering', 'svd_collaborative_filter', 'xgboost_price_regression', 'event_date_model', 'chatbot_intent_classifier', 'intelligent_quote_generator']
}

try:
    with connection.cursor() as cursor:
        for slug, models in mappings.items():
            sql = "UPDATE enterprise_role SET allowed_ml_models = %s WHERE slug = %s"
            cursor.execute(sql, (json.dumps(models), slug))
    connection.commit()
    print("Roles ML models successfully mapped according to user specification via PyMySQL!")
finally:
    connection.close()
