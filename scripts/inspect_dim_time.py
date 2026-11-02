import psycopg2
conn = psycopg2.connect(
    host='aws-0-ap-northeast-2.pooler.supabase.com', port=5432,
    dbname='postgres', user='postgres.liwjkumbuzfdsfngaddt',
    password='CapstoneProj26/27', sslmode='require', connect_timeout=15
)
cur = conn.cursor()
cur.execute("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='fact_production'
    ORDER BY ordinal_position;
""")
print("fact_production columns:")
for row in cur.fetchall():
    print(f"  {row[0]:40s} {row[1]:20s} nullable={row[2]}")

# Also get unique constraint info
cur.execute("""
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'public.fact_production'::regclass AND contype IN ('u','p');
""")
print("\nUnique/PK constraints:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

conn.close()
