import os
import re
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# ==============================================================================
# 1. CONFIGURATION
# ==============================================================================
SUPABASE_DB_URI = "postgresql://postgres:CapstoneProj26%2F27@db.liwjkumbuzfdsfngaddt.supabase.co:5432/postgres"
BASE_DIR = r"C:\Users\JOSHUA\Downloads\Production Data"

# Includes 'arp': 4 to handle the "Arp 2021" and "Arp 2026" filename typos!
MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'arp': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}

SOURCE_KEYWORD_MAP = {
    'BASAGAN': 'SPR-01', 'BORING': 'SPR-02', 'ISIDRO': 'SPR-02', 'NAGSIPIT': 'SPR-03',
    'BOGNABONG': 'PMP-01', 'KARANGAHAN': 'PMP-02', 'PINAGBOBONG': 'PMP-03', 'QUINASTILLOJAN': 'PMP-04',
    'SAN ANTONIO WELL #1': 'PMP-05', 'SAN ANTONIO WELL  #1': 'PMP-05',
    'SAN ANTONIO WELL #2': 'PMP-06', 'SAN ANTONIO WELL  #2': 'PMP-06',
    'SAN ANTONIO WELL #3': 'PMP-07', 'SAN ANTONIO WELL  #3': 'PMP-07',
    'SAN CARLOS': 'PMP-08', 'SAN VICENTE': 'PMP-09'
}

def clean_num(val):
    if pd.isna(val): return 0.0
    s = str(val).strip()
    if 'cu.m' in s.lower() or s == '' or s == '-': return 0.0
    s = re.sub(r'[^0-9.]', '', s)
    if s == '.' or s == '': return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0

def extract_from_df(df, time_id, fact_records):
    for row_idx in range(df.shape[0]):
        for col_idx in range(df.shape[1]):
            cell_val = str(df.iloc[row_idx, col_idx]).upper().replace('  ', ' ').strip()
            if not cell_val:
                continue
            
            matched = False
            for keyword, src_code in SOURCE_KEYWORD_MAP.items():
                if keyword in cell_val:
                    if keyword == 'SAN ANTONIO WELL #1' and 'WELL #1' not in cell_val:
                        continue
                    
                    rated_cap, prod_m3, hrs = 0.0, 0.0, 0.0
                    # Strictly scan 5 rows below header so we never bleed into the next source block
                    for offset in range(1, 6):
                        if row_idx + offset >= df.shape[0]:
                            break
                        label = str(df.iloc[row_idx + offset, col_idx]).lower().strip()
                        
                        c2 = df.iloc[row_idx + offset, col_idx + 1] if col_idx + 1 < df.shape[1] else ""
                        c3 = df.iloc[row_idx + offset, col_idx + 2] if col_idx + 2 < df.shape[1] else ""
                        c4 = df.iloc[row_idx + offset, col_idx + 3] if col_idx + 3 < df.shape[1] else ""
                        v = max(clean_num(c2), clean_num(c3), clean_num(c4))
                        
                        if 'rated' in label and 'capacity' in label:
                            rated_cap = v
                        elif 'water' in label and 'distribution' in label:
                            prod_m3 = v
                        elif 'pumping' in label and 'hour' in label:
                            hrs = v
                    
                    if prod_m3 > 0 or rated_cap > 0:
                        fact_records.append({
                            'time_id': time_id,
                            'source_code': src_code,
                            'reported_monthly_capacity_m3': rated_cap,
                            'produced_volume_m3': prod_m3,
                            'operating_hours': hrs if 'PMP' in src_code else (720.0 if prod_m3 > 0 else 0.0)
                        })
                        matched = True
                if matched:
                    break

def process_and_seed():
    fact_records = []
    print(f"Scanning {BASE_DIR} for yearly subfolders (2021-2026)...")
    
    if not os.path.exists(BASE_DIR):
        print(f"ERROR: Folder not found: {BASE_DIR}")
        return

    for year_folder in sorted(os.listdir(BASE_DIR)):
        folder_path = os.path.join(BASE_DIR, year_folder)
        if not os.path.isdir(folder_path) or not year_folder.isdigit():
            continue
        
        year = int(year_folder)
        for filename in sorted(os.listdir(folder_path)):
            if not filename.lower().endswith(('.xlsx', '.xls')) or 'YTD' in filename.upper():
                continue
            
            file_path = os.path.join(folder_path, filename)
            m_match = re.search(r'([A-Za-z]+)', filename)
            if not m_match:
                continue
            
            m_str = m_match.group(1).lower()[:3]
            if m_str not in MONTH_MAP:
                continue
            
            month = MONTH_MAP[m_str]
            time_id = int(f"{year}{month:02d}00")
            
            try:
                df = pd.read_excel(file_path, header=None).fillna("")
                extract_from_df(df, time_id, fact_records)
                print(f"  Parsed {year_folder}/{filename} -> time_id={time_id}")
            except Exception as e:
                print(f"  Error reading {file_path}: {e}")

    df_facts = pd.DataFrame(fact_records).drop_duplicates(subset=['time_id', 'source_code'], keep='last').sort_values(['time_id', 'source_code'])
    print(f"\nTotal verified source-month records extracted: {len(df_facts)}")

    if df_facts.empty:
        print("No records found. Please verify your folder path.")
        return

    # Push to Supabase
    print("Connecting to Supabase...")
    # Direct DB is IPv6-only; using pooler (IPv4). Try both Session (5432) and
    # Transaction (6543) pooler modes with both username formats.
    last_err = None
    conn = None
    for port, user in [(5432, "postgres.liwjkumbuzfdsfngaddt"), (6543, "postgres.liwjkumbuzfdsfngaddt")]:
        try:
            print(f"  Trying pooler port={port} user={user} ...")
            conn = psycopg2.connect(
                host="aws-0-ap-northeast-2.pooler.supabase.com",
                port=port,
                dbname="postgres",
                user=user,
                password="CapstoneProj26/27",
                sslmode="require",
                connect_timeout=15,
            )
            print(f"  Connected! (port={port}, user={user})")
            break
        except Exception as e:
            last_err = e
            print(f"  Failed: {e}")
    if conn is None:
        raise Exception(f"All connection attempts failed. Last error: {last_err}")
    conn.autocommit = True
    
    with conn.cursor() as cur:
        # 1. Ensure column exists
        cur.execute("ALTER TABLE public.fact_production ADD COLUMN IF NOT EXISTS reported_monthly_capacity_m3 NUMERIC(12,2) DEFAULT 0.00;")
        
        # 2. Ensure dim_water_source is seeded
        cur.execute("SELECT COUNT(*) FROM public.dim_water_source;")
        if cur.fetchone()[0] == 0:
            print("Seeding dim_water_source...")
            cur.execute("""
                INSERT INTO public.dim_water_source (source_code, source_name, source_type, barangay_location, rated_capacity_m3_day, avg_discharge_m3_per_hr) VALUES
                    ('SPR-01', 'Basagan Spring', 'Spring', 'Brgy. Basagan', 2592.00, 67.16),
                    ('SPR-02', 'San Isidro (Boring) Spring', 'Spring', 'Brgy. San Isidro', 3196.80, 83.91),
                    ('SPR-03', 'Nagsipit Spring', 'Spring', 'Sitio Nagsipit (Comon)', 2400.00, 40.73),
                    ('PMP-01', 'Bongabong Pumping Station', 'Pumping Station', 'Brgy. Bongabong', 1599.83, 44.57),
                    ('PMP-02', 'Karangahan Pumping Station', 'Pumping Station', 'Karangahan Blvd.', 2470.67, 92.69),
                    ('PMP-03', 'Pinagbobong Pumping Station', 'Pumping Station', 'Brgy. Pinagbobong', 773.80, 24.05),
                    ('PMP-04', 'Quinastillojan Pumping Station', 'Pumping Station', 'Brgy. Quinastillojan', 0.00, 0.00),
                    ('PMP-05', 'San Antonio no. 1 Pumping Station', 'Pumping Station', 'Brgy. San Antonio', 2838.00, 82.09),
                    ('PMP-06', 'San Antonio no. 2 Pumping Station', 'Pumping Station', 'Brgy. San Antonio', 3746.97, 117.18),
                    ('PMP-07', 'San Antonio no. 3 Pumping Station', 'Pumping Station', 'Brgy. San Antonio', 1129.70, 29.22),
                    ('PMP-08', 'San Carlos Pumping Station', 'Pumping Station', 'Brgy. San Carlos', 330.00, 11.71),
                    ('PMP-09', 'San Vicente Pumping Station', 'Pumping Station', 'Brgy. San Vicente', 609.83, 16.58);
            """)

        # 3. Ensure 2026 time_ids exist in dim_time (all NOT NULL columns filled)
        cur.execute("""
            INSERT INTO public.dim_time
                (time_id, full_date, year_month, day_of_month, day_name, day_of_week,
                 month_number, month_name, quarter, year, season, is_peak_season, is_weekend, is_holiday)
            VALUES
                (20260100, '2026-01-01', '2026-01', 1, 'Thursday', 4, 1, 'January',  1, 2026, 'Amihan',     false, false, false),
                (20260200, '2026-02-01', '2026-02', 1, 'Sunday',   0, 2, 'February', 1, 2026, 'Amihan',     false, true,  false),
                (20260300, '2026-03-01', '2026-03', 1, 'Sunday',   0, 3, 'March',    1, 2026, 'Dry Season', true,  true,  false),
                (20260400, '2026-04-01', '2026-04', 1, 'Wednesday',3, 4, 'April',    2, 2026, 'Dry Season', true,  false, false)
            ON CONFLICT (time_id) DO NOTHING;
        """)

        cur.execute("SELECT source_code, source_id FROM public.dim_water_source;")
        source_map = {row[0]: row[1] for row in cur.fetchall()}
        
        insert_vals = []
        for _, r in df_facts.iterrows():
            src_id = source_map.get(r['source_code'])
            if src_id:
                is_pump = 'PMP' in r['source_code']
                kwh = round(r['produced_volume_m3'] * 0.3914, 2) if is_pump else 0.0
                php = round(r['produced_volume_m3'] * 3.5060, 2) if is_pump else 0.0
                insert_vals.append((
                    int(r['time_id']), int(src_id), 'Monthly', False,
                    float(r['produced_volume_m3']), float(r['operating_hours']),
                    kwh, php, float(r['reported_monthly_capacity_m3'])
                ))

        print(f"Upserting {len(insert_vals)} exact production records into public.fact_production...")
        execute_values(cur, """
            INSERT INTO public.fact_production (
                time_id, source_id, granularity, is_extrapolated,
                produced_volume_m3, operating_hours, power_consumed_kwh, power_cost_php,
                reported_monthly_capacity_m3
            ) VALUES %s
            ON CONFLICT (time_id, source_id, granularity) DO UPDATE SET
                is_extrapolated = false,
                produced_volume_m3 = EXCLUDED.produced_volume_m3,
                operating_hours = EXCLUDED.operating_hours,
                power_consumed_kwh = EXCLUDED.power_consumed_kwh,
                power_cost_php = EXCLUDED.power_cost_php,
                reported_monthly_capacity_m3 = EXCLUDED.reported_monthly_capacity_m3;
        """, insert_vals)

        print("Refreshing materialized view public.dm_water_balance_datamart...")
        cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY public.dm_water_balance_datamart;")

    print("===============================================================")
    print("SUCCESS! All monthly files (2021-2026) with fluctuating rated")
    print("capacities and exact production volumes are now in Supabase!")
    print("===============================================================")

if __name__ == "__main__":
    process_and_seed()
