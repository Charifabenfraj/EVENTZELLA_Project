import pymysql
from django.core.management.base import BaseCommand
from dwh_sync.models import DWHEventData
from django.utils import timezone

class Command(BaseCommand):
    help = 'Synchronize data from the external Data Warehouse (dwh_eventzella) to eventzella_db'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.NOTICE("Starting DWH synchronization..."))
        
        # NOTE: Configurer les identifiants de la base de données DWH ici
        dwh_config = {
            'host': '127.0.0.1',
            'user': 'root',
            'password': '',  # XAMPP par défaut
            'database': 'dwh_eventzella',
            'cursorclass': pymysql.cursors.DictCursor
        }

        try:
            # 1. Se connecter à dwh_eventzella
            connection = pymysql.connect(**dwh_config)
            
            with connection.cursor() as cursor:
                # 2. Lire les données
                # Remplacer par votre propre table/requête
                sql = "SELECT * FROM fact_events LIMIT 100" 
                try:
                    cursor.execute(sql)
                    rows = cursor.fetchall()
                except pymysql.err.ProgrammingError:
                    self.stdout.write(self.style.WARNING("Table fact_events non trouvée dans le DWH. C'est juste un exemple."))
                    rows = []

                # 3. Synchroniser avec Django (eventzella_db)
                count = 0
                for row in rows:
                    DWHEventData.objects.update_or_create(
                        dwh_id=str(row.get('id', 'N/A')),
                        defaults={
                            'event_type': row.get('event_type', 'Unknown'),
                            'city': row.get('city', 'Unknown'),
                            'budget': row.get('budget', 0),
                            'guests': row.get('guests', 0),
                            'date_from_dwh': row.get('date', timezone.now()),
                        }
                    )
                    count += 1
                    
            connection.close()
            self.stdout.write(self.style.SUCCESS(f"Successfully synchronized {count} records from DWH."))
            
        except pymysql.err.OperationalError as e:
            self.stdout.write(self.style.ERROR(f"Impossible de se connecter à la base DWH: {e}"))
            self.stdout.write(self.style.NOTICE("Veuillez vous assurer que la base 'dwh_eventzella' existe dans XAMPP MySQL."))
