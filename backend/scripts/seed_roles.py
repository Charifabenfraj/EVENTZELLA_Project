import os
import sys
import django

os.environ["DJANGO_SETTINGS_MODULE"] = "eventzella_backend.settings"
django.setup()

from enterprise.models import Role

roles = [
    {
        "name": "CEO",
        "slug": "ceo",
        "description": "Chief Executive Officer - full access",
        "permissions": ["view_all_dashboards", "manage_users", "export_data", "view_activity"],
    },
    {
        "name": "Quality Manager",
        "slug": "quality",
        "description": "Quality and risk management",
        "permissions": ["view_quality_dashboard", "export_data", "view_activity"],
    },
    {
        "name": "Business Manager",
        "slug": "business",
        "description": "Operations and growth",
        "permissions": ["view_business_dashboard", "export_data"],
    },
    {
        "name": "Marketing Manager",
        "slug": "marketing",
        "description": "Campaigns and acquisition",
        "permissions": ["view_marketing_dashboard", "export_data"],
    },
]

for r in roles:
    obj, created = Role.objects.update_or_create(slug=r["slug"], defaults=r)
    status = "Created" if created else "Updated"
    print(f"{status}: {obj.name} ({obj.slug})")

print("Done!")
