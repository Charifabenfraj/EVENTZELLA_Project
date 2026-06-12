from django.urls import path

from . import views

urlpatterns = [
    path("auth/signup/", views.signup, name="enterprise-signup"),
    path("auth/login/", views.login, name="enterprise-login"),
    path("auth/google/", views.google_login, name="enterprise-google-login"),
    path("auth/refresh/", views.refresh, name="enterprise-refresh"),
    path("auth/logout/", views.logout, name="enterprise-logout"),
    path("auth/forgot-password/", views.forgot_password, name="enterprise-forgot"),
    path("auth/reset-password/", views.reset_password, name="enterprise-reset"),
    path("users/me/", views.me, name="enterprise-me"),
    path("roles/", views.roles, name="enterprise-roles"),
    path("dashboards/<str:role>/", views.dashboard, name="enterprise-dashboard"),
    path("notifications/", views.notifications_list, name="enterprise-notifications"),
    path("notifications/<int:notification_id>/read/", views.notification_read, name="enterprise-notification-read"),
    path("activity/", views.activity_list, name="enterprise-activity"),
    path("analytics/history/", views.analytics_history, name="enterprise-analytics-history"),
    path("dwh/summary/", views.dwh_summary, name="enterprise-dwh-summary"),
    path("search/", views.search, name="enterprise-search"),
    path("admin/users/", views.admin_users, name="enterprise-admin-users"),
    path("admin/users/<int:user_id>/role/", views.admin_update_role, name="enterprise-admin-role"),
    path("ai/suggestions/", views.ai_profile_suggestions, name="enterprise-ai-suggestions"),
    path("ai/eagle-eye/", views.eagle_eye_alerts, name="enterprise-ai-eagle-eye"),
    path("ai/top-providers/", views.top_providers, name="enterprise-ai-top-providers"),
    path("ai/recommend-by-budget/", views.recommend_providers_by_budget, name="enterprise-ai-recommend-by-budget"),
    path("providers/map/", views.providers_map, name="enterprise-providers-map"),
    path("face/enroll/", views.face_enroll, name="enterprise-face-enroll"),
    path("face/verify/", views.face_verify, name="enterprise-face-verify"),
    path("exports/excel/", views.export_excel, name="enterprise-export-excel"),
    path("exports/pdf/", views.export_pdf, name="enterprise-export-pdf"),
    path("audit/", views.audit_list, name="enterprise-audit"),
]
