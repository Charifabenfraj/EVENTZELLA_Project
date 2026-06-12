from django.db import models


class DWHEventData(models.Model):
    """
    Modèle pour stocker les données synchronisées depuis la base dwh_eventzella.
    À adapter avec vos colonnes spécifiques (ex: dimension_client, fait_vente, etc.)
    """
    dwh_id = models.CharField(max_length=100, unique=True, help_text="ID unique depuis le DWH")
    event_type = models.CharField(max_length=120)
    city = models.CharField(max_length=120)
    budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    guests = models.IntegerField(null=True, blank=True)
    date_from_dwh = models.DateTimeField(null=True, blank=True)
    
    # Metadonnées de synchronisation
    synced_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.event_type} - {self.city} ({self.dwh_id})"
