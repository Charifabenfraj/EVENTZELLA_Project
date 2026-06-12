from django.conf import settings
from django.db import models


class Role(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=list, blank=True)
    powerbi_embed_url = models.URLField(blank=True, null=True, help_text="URL d'intégration PowerBI (Embed URL) spécifique à ce rôle")
    allowed_ml_models = models.JSONField(default=list, blank=True, help_text="Liste des IDs de modèles ML autorisés pour ce décideur (ex: ['provider_budget_model'])")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="profiles")
    title = models.CharField(max_length=120, blank=True)
    department = models.CharField(max_length=120, blank=True)
    avatar_url = models.URLField(blank=True)
    preferences = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.user.email} ({self.role.slug})"


class RefreshSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token_hash = models.CharField(max_length=128)
    user_agent = models.CharField(max_length=255, blank=True)
    ip_address = models.CharField(max_length=64, blank=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PasswordReset(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class DashboardConfig(models.Model):
    role = models.OneToOneField(Role, on_delete=models.CASCADE)
    layout = models.JSONField(default=dict, blank=True)
    widgets = models.JSONField(default=list, blank=True)
    default_filters = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ActivityLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=120)
    entity = models.CharField(max_length=120, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.CharField(max_length=64, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=160)
    message = models.TextField(blank=True)
    type = models.CharField(max_length=40, default="info")
    read_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class AuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    event_type = models.CharField(max_length=120)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class AnalyticsSnapshot(models.Model):
    role = models.CharField(max_length=60)
    metrics = models.JSONField(default=dict, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)


class EnterpriseExportLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    export_type = models.CharField(max_length=40)
    created_at = models.DateTimeField(auto_now_add=True)


class FaceProfile(models.Model):
    display_name = models.CharField(max_length=120)
    image_path = models.CharField(max_length=255, blank=True, default="")
    descriptor = models.JSONField(default=list, blank=True)
    consent = models.BooleanField(default=False)
    consent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.display_name


class FaceCheckIn(models.Model):
    profile = models.ForeignKey(FaceProfile, null=True, blank=True, on_delete=models.SET_NULL)
    matched_name = models.CharField(max_length=120, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    success = models.BooleanField(default=False)
    ip_address = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
