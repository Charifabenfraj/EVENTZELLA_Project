import pymysql

connection = pymysql.connect(
    host='127.0.0.1',
    user='root',
    password='',
    database='eventzella_db',
    cursorclass=pymysql.cursors.DictCursor
)

try:
    with connection.cursor() as cursor:
        sql = """
        INSERT IGNORE INTO enterprise_role (name, slug, description, permissions, powerbi_embed_url, created_at, updated_at) 
        VALUES 
        ('CEO', 'ceo', 'Chief Executive Officer', '["view_all_dashboards","manage_users","export_data","view_activity"]', 'https://app.powerbi.com/reportEmbed?reportId=dc7eba58-d54c-40a8-a33e-bd09752178b0&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730', NOW(), NOW()),
        ('Quality Manager', 'quality', 'Quality and risk', '["view_quality_dashboard","export_data","view_activity"]', 'https://app.powerbi.com/reportEmbed?reportId=538cfe4d-7e77-4f86-9e09-9a32fc358a86&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730', NOW(), NOW()),
        ('Business Manager', 'business', 'Operations', '["view_business_dashboard","export_data"]', 'https://app.powerbi.com/reportEmbed?reportId=08789f8c-f1b3-4533-849a-bf5ff4671d14&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730', NOW(), NOW()),
        ('Marketing Manager', 'marketing', 'Campaigns', '["view_marketing_dashboard","export_data"]', 'https://app.powerbi.com/reportEmbed?reportId=77fe263b-b50b-41df-a2bc-9c2ac6637373&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730', NOW(), NOW());
        """
        cursor.execute(sql)
    connection.commit()
    print("Seeded successfully via PyMySQL!")
finally:
    connection.close()
