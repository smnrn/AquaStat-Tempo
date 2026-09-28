/**
 * @file src/database/seed_constellation.ts
 * @description Seed mock dimensions and facts for the AquaStat Constellation Schema.
 *
 * Populates:
 *   - dim_time (August 2026 calendar days)
 *   - dim_location (Service zones & barangays)
 *   - dim_weather (PAGASA weather data)
 *   - dim_pump_station (Water booster & pumping assets)
 *   - dim_customer (Customer accounts & meter links)
 *   - dim_ml_model (ML forecasting model registry)
 *   - fact_production, fact_billing, fact_ml_forecast
 *
 * Run with:
 *   npm run db:seed:constellation
 */

import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import type { PoolClient } from 'pg';

loadDotenv({ path: path.resolve(__dirname, '../../.env') });

import { pool, closePool } from './pool';
import { logger } from '../utils/logger';

interface LocRow { location_id: number; }
interface PumpRow { pump_id: number; }
interface CustRow { customer_id: number; }
interface ModelRow { model_id: number; }

async function seedDimTime(client: PoolClient): Promise<void> {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (let day = 1; day <= 31; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const fullDate = `2026-08-${dayStr}`;
    const timeId = Number.parseInt(`202608${dayStr}`, 10);
    const dateObj = new Date(fullDate);
    const dayOfWeek = dateObj.getDay() + 1;
    const dayName = dayNames[dateObj.getDay()];
    const isWeekend = dayOfWeek === 1 || dayOfWeek === 7;

    await client.query(
      `INSERT INTO dim_time 
        (time_id, full_date, day_of_month, day_name, day_of_week, month_number, month_name, quarter, year, season, is_weekend, is_holiday)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (time_id) DO NOTHING;`,
      [
        timeId,
        fullDate,
        day,
        dayName,
        dayOfWeek,
        8,
        'August',
        3,
        2026,
        'Habagat',
        isWeekend,
        day === 21 || day === 31,
      ]
    );
  }
}

async function seedDimLocation(client: PoolClient): Promise<void> {
  const locations = [
    { zone: 'Zone 1',  barangay: 'Tabaco Center',     pop: 4120, lat: 13.3582, lon: 123.7298 },
    { zone: 'Zone 2',  barangay: 'Panal / Poblacion', pop: 5280, lat: 13.3615, lon: 123.7312 },
    { zone: 'Zone 3',  barangay: 'Magallanes',        pop: 3140, lat: 13.3541, lon: 123.7245 },
    { zone: 'Zone 4',  barangay: 'Rawis',             pop: 2680, lat: 13.3690, lon: 123.7350 },
    { zone: 'Zone 5',  barangay: 'Quinartisan',       pop: 2100, lat: 13.3489, lon: 123.7180 },
    { zone: 'Zone 6',  barangay: 'Buang',             pop: 1980, lat: 13.3320, lon: 123.6890 },
    { zone: 'Zone 7',  barangay: 'Sagrada',           pop: 3720, lat: 13.3610, lon: 123.7120 },
    { zone: 'Zone 8',  barangay: 'Tayhi',             pop: 1760, lat: 13.3670, lon: 123.7280 },
    { zone: 'Zone 9',  barangay: 'Tula-tula Grande',  pop: 2320, lat: 13.3410, lon: 123.7040 },
    { zone: 'Zone 10', barangay: 'Tula-tula Pequeño', pop: 1440, lat: 13.3380, lon: 123.6980 },
    { zone: 'Zone 11', barangay: 'San Lorenzo',       pop: 2020, lat: 13.3720, lon: 123.7210 },
    { zone: 'Zone 12', barangay: 'Hacienda',          pop: 1320, lat: 13.3850, lon: 123.7150 },
    { zone: 'Zone 13', barangay: 'Banao',             pop: 2080, lat: 13.3460, lon: 123.7380 },
    { zone: 'Zone 14', barangay: 'Salvacion',         pop: 1680, lat: 13.3790, lon: 123.7420 },
    { zone: 'Zone 15', barangay: 'Sto. Cristo',       pop: 3360, lat: 13.3520, lon: 123.7410 },
    { zone: 'Zone 16', barangay: 'Gogon',             pop: 1960, lat: 13.3640, lon: 123.7490 },
    { zone: 'Zone 17', barangay: 'Arimbay',           pop: 2380, lat: 13.3590, lon: 123.7540 },
    { zone: 'Zone 18', barangay: 'Sulong',            pop: 1540, lat: 13.3710, lon: 123.7580 },
    { zone: 'Zone 19', barangay: 'Pigcale',           pop: 2180, lat: 13.3550, lon: 123.7620 },
    { zone: 'Zone 20', barangay: 'Fatima',            pop: 2540, lat: 13.3490, lon: 123.7680 },
  ];

  for (const loc of locations) {
    await client.query(
      `INSERT INTO dim_location (service_zone, barangay_name, city_municipality, province, population_density, latitude, longitude)
       VALUES ($1, $2, 'Tabaco City', 'Albay', $3, $4, $5)
       ON CONFLICT (service_zone, barangay_name) DO NOTHING;`,
      [loc.zone, loc.barangay, loc.pop, loc.lat, loc.lon]
    );
  }
}

async function seedDimWeather(client: PoolClient): Promise<void> {
  for (let day = 1; day <= 25; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const recDate = `2026-08-${dayStr}`;
    const temp = 29.5 + Math.sin(day) * 2.5;

    let rain = 0.0;
    if (day % 3 === 0) {
      rain = 35.4;
    } else if (day % 2 === 0) {
      rain = 12.0;
    }

    let cond = 'Partly Cloudy';
    if (rain > 20) {
      cond = 'Moderate Rain';
    } else if (rain > 0) {
      cond = 'Light Rain';
    }

    const heatIdx = temp + (78.5 / 100) * 4.2;

    await client.query(
      `INSERT INTO dim_weather (recorded_date, temperature_celsius, rainfall_mm, humidity_pct, pagasa_condition, heat_index_celsius)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [recDate, temp.toFixed(2), rain, 78.5, cond, heatIdx.toFixed(2)]
    );
  }
}

async function seedDimPumpStation(client: PoolClient): Promise<void> {
  const pumps = [
    { code: 'PS-MAIN-01',    name: 'TCWD Main Pumping Station (San Vicente)', cap: 120000, status: 'Operational' },
    { code: 'PS-BOOSTER-A',  name: 'Booster Station A — Panal Intermediate',   cap: 65000,  status: 'Operational' },
    { code: 'PS-BOOSTER-B',  name: 'Booster Station B — Buang High-Elevation', cap: 45000,  status: 'Operational' },
    { code: 'PS-STANDBY-01', name: 'Sto. Cristo Auxiliary Well & Pump',        cap: 35000,  status: 'Standby' },
  ];

  for (const p of pumps) {
    await client.query(
      `INSERT INTO dim_pump_station (station_code, station_name, rated_capacity_m3_day, maintenance_status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (station_code) DO NOTHING;`,
      [p.code, p.name, p.cap, p.status]
    );
  }
}

async function seedDimCustomer(client: PoolClient): Promise<void> {
  const customers = [
    { acc: 'ACC-00023', name: 'Tabaco City Hall / LGU Complex',  type: 'Government',     meter: 'MTR-GOV-0023' },
    { acc: 'ACC-00487', name: 'Tabaco Commercial Center Plaza',  type: 'Commercial',     meter: 'MTR-COM-0487' },
    { acc: 'ACC-01094', name: 'Albay Agro-Industrial Warehouse', type: 'Commercial',     meter: 'MTR-COM-1094' },
    { acc: 'ACC-00318', name: 'Panal Residential Compound',      type: 'Residential',    meter: 'MTR-RES-0318' },
    { acc: 'ACC-00762', name: 'Magallanes Agro Farm / Nursery',  type: 'Semi-Commercial',meter: 'MTR-SMC-0762' },
    { acc: 'ACC-00891', name: 'Rawis Fishery & Ice Plant',       type: 'Commercial',     meter: 'MTR-COM-0891' },
    { acc: 'ACC-01124', name: 'Sagrada Community Water Cluster', type: 'Residential',    meter: 'MTR-RES-1124' },
  ];

  for (const c of customers) {
    await client.query(
      `INSERT INTO dim_customer (account_number, account_name, account_type, meter_serial_no)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (account_number) DO NOTHING;`,
      [c.acc, c.name, c.type, c.meter]
    );
  }
}

async function seedDimMlModel(client: PoolClient): Promise<void> {
  const mlModels = [
    { code: 'SARIMAX-V1', name: 'Seasonal ARIMA with Weather Regressors', algo: 'SARIMAX (1,1,1)x(1,1,1,7)', version: '1.0.0', rmse: 142.50, mape: 3.20 },
    { code: 'LSTM-MULTI-V1', name: 'Multivariate Deep LSTM Recurrent Net', algo: 'Multivariate LSTM', version: '1.0.0', rmse: 118.40, mape: 2.85 },
    { code: 'PROPHET-V1', name: 'Meta Prophet Additive Decomposition', algo: 'Prophet with Weather Regressors', version: '1.0.0', rmse: 135.10, mape: 3.10 },
    { code: 'XGB-DEMAND-V1', name: 'Extreme Gradient Boosted Demand Model', algo: 'Gradient Boosted Decision Trees', version: '1.0.0', rmse: 124.60, mape: 2.95 },
  ];

  for (const m of mlModels) {
    await client.query(
      `INSERT INTO dim_ml_model 
        (model_code, model_name, algorithm_name, model_version, current_rmse_score, mape_score, trained_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), TRUE)
       ON CONFLICT (model_code) DO NOTHING;`,
      [m.code, m.name, m.algo, m.version, m.rmse, m.mape]
    );
  }
}

async function seedFactProduction(client: PoolClient, locRows: LocRow[]): Promise<void> {
  const pumpRows = await client.query<PumpRow>('SELECT pump_id FROM dim_pump_station;');
  for (let day = 1; day <= 25; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const timeId = Number.parseInt(`202608${dayStr}`, 10);

    for (let pIdx = 0; pIdx < pumpRows.rows.length; pIdx++) {
      const pumpId = pumpRows.rows[pIdx].pump_id;
      const locId = locRows[pIdx % locRows.length].location_id;
      const volume = 45000 + (day * 170) % 20000;
      const power = volume * 0.42 + ((day * 29) % 500);
      const hours = 22.5 + ((day % 3) * 0.5);

      await client.query(
        `INSERT INTO fact_production 
          (time_id, location_id, pump_id, produced_volume_m3, power_consumed_kwh, operating_hours)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [timeId, locId, pumpId, volume.toFixed(4), power.toFixed(4), hours.toFixed(2)]
      );
    }
  }
}

async function seedFactBilling(client: PoolClient, locRows: LocRow[]): Promise<void> {
  const custRows = await client.query<CustRow>('SELECT customer_id FROM dim_customer;');
  for (let day = 1; day <= 25; day += 5) {
    const dayStr = day.toString().padStart(2, '0');
    const timeId = Number.parseInt(`202608${dayStr}`, 10);

    for (let cIdx = 0; cIdx < custRows.rows.length; cIdx++) {
      const custId = custRows.rows[cIdx].customer_id;
      const locId = locRows[cIdx % locRows.length].location_id;
      const volume = 25000 + (day * 310) % 10000;
      const revenue = volume * 42.50;
      const arrears = (cIdx % 3 === 0) ? 15000.00 : 0.00;

      await client.query(
        `INSERT INTO fact_billing 
          (time_id, location_id, customer_id, billed_volume_m3, revenue_amount, arrears_amount, billing_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [timeId, locId, custId, volume.toFixed(4), revenue.toFixed(2), arrears, 'Billed']
      );
    }
  }
}

async function seedFactMlForecast(client: PoolClient, locRows: LocRow[]): Promise<void> {
  const modelRows = await client.query<ModelRow>('SELECT model_id FROM dim_ml_model LIMIT 1;');
  if (modelRows.rows.length === 0) return;

  const modelId = modelRows.rows[0].model_id;
  for (let day = 20; day <= 31; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const timeId = Number.parseInt(`202608${dayStr}`, 10);
    for (const loc of locRows) {
      const demand = 65000 + (day * 430) % 15000;
      const shortage = demand > 75000 ? demand - 75000 : 0.00;
      await client.query(
        `INSERT INTO fact_ml_forecast 
          (time_id, location_id, model_id, predicted_demand_m3, predicted_shortage_m3, confidence_interval_low, confidence_interval_high)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [timeId, loc.location_id, modelId, demand.toFixed(4), shortage.toFixed(4), (demand * 0.95).toFixed(4), (demand * 1.05).toFixed(4)]
      );
    }
  }
}

async function seedConstellation(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info('[Seed:Constellation] Seeding constellation schema...');
    await client.query('BEGIN');

    await seedDimTime(client);
    await seedDimLocation(client);
    await seedDimWeather(client);
    await seedDimPumpStation(client);
    await seedDimCustomer(client);
    await seedDimMlModel(client);

    const locResult = await client.query<LocRow>('SELECT location_id FROM dim_location LIMIT 3;');
    const locRows = locResult.rows;

    await seedFactProduction(client, locRows);
    await seedFactBilling(client, locRows);
    await seedFactMlForecast(client, locRows);

    await client.query('COMMIT');
    logger.info('[Seed:Constellation] ✓ Seed data loaded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('[Seed:Constellation] Seeding failed — rolled back.', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    client.release();
    await closePool();
  }
}

if (require.main === module) {
  seedConstellation().catch((err: unknown) => {
    logger.error('[Seed:Constellation] Fatal error.', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  });
}

export { seedConstellation };
