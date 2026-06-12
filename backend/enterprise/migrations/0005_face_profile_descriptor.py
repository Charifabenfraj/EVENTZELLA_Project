from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("enterprise", "0004_face_profiles"),
    ]

    operations = [
        migrations.AddField(
            model_name="faceprofile",
            name="descriptor",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name="faceprofile",
            name="image_path",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
