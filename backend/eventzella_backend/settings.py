import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-eventzella-dev-key")
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = [host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "*").split(",") if host.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "ml_api",
    "enterprise",
    "dwh_sync",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "ml_api.monitoring.PrometheusMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "eventzella_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "eventzella_backend.wsgi.application"
ASGI_APPLICATION = "eventzella_backend.asgi.application"

# ---------------------------------------------------------------------------
# Database — XAMPP MySQL
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.getenv("DB_NAME", "eventzella_db"),
        "USER": os.getenv("DB_USER", "root"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "127.0.0.1"),
        "PORT": os.getenv("DB_PORT", "3306"),
        "OPTIONS": {
            "charset": "utf8mb4",
        },
    },
    "dwh": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.getenv("DWH_DB_NAME", "dwh_eventzella"),
        "USER": os.getenv("DWH_DB_USER", "root"),
        "PASSWORD": os.getenv("DWH_DB_PASSWORD", ""),
        "HOST": os.getenv("DWH_DB_HOST", "127.0.0.1"),
        "PORT": os.getenv("DWH_DB_PORT", "3306"),
        "OPTIONS": {
            "charset": "utf8mb4",
        },
    },
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Tunis"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Enterprise JWT — used by enterprise app for auth
# ---------------------------------------------------------------------------
ENTERPRISE_JWT_SECRET = os.getenv("ENTERPRISE_JWT_SECRET", "eventzella-jwt-secret-change-me")
ENTERPRISE_REFRESH_SECRET = os.getenv("ENTERPRISE_REFRESH_SECRET", "eventzella-refresh-secret-change-me")
ENTERPRISE_ACCESS_TTL = os.getenv("ENTERPRISE_ACCESS_TTL", "15m")
ENTERPRISE_REFRESH_TTL = os.getenv("ENTERPRISE_REFRESH_TTL", "7d")
