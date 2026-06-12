from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("enterprise", "0003_role_allowed_ml_models"),
    ]

    operations = [
        migrations.CreateModel(
            name="FaceProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("display_name", models.CharField(max_length=120)),
                ("image_path", models.CharField(max_length=255)),
                ("consent", models.BooleanField(default=False)),
                ("consent_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="FaceCheckIn",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("matched_name", models.CharField(blank=True, max_length=120)),
                ("confidence", models.FloatField(blank=True, null=True)),
                ("success", models.BooleanField(default=False)),
                ("ip_address", models.CharField(blank=True, max_length=64)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "profile",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="enterprise.faceprofile",
                    ),
                ),
            ],
        ),
    ]
