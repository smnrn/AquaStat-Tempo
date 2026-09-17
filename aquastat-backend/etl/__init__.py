# AquaStat ETL Pipeline Package
# Stage 1 → extractor.py      : Ingest & cleanse raw CSV/Excel billing & production files
# Stage 2 → extrapolator.py   : Distribute monthly totals to daily time-series
# Stage 3 → weather_client.py : Fetch PAGASA meteorological data & merge with operational data
# Stage 4 → loader.py         : SQLAlchemy ORM models + upsert logic → PostgreSQL
