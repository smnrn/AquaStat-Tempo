# 💧 TCWD AquaStat — Decision Support System (DSS)
> **Data-Driven Water Supply Forecasting and Water Demand Optimization for Tabaco City Water District**  
> *University of Santo Tomas — College of Information and Computing Sciences*  
> *BS Information Systems (Business Analytics Track)*

---

## 📌 Executive Overview
**AquaStat** is an enterprise-grade Decision Support System (DSS) developed for the **Tabaco City Water District (TCWD)** in Albay, Philippines. It integrates **descriptive customer segmentation**, **predictive multivariate demand forecasting**, **IWA-standard non-revenue water (NRW) accounting**, and **prescriptive pump scheduling optimization** under Time-of-Use (TOU) electricity tariffs.

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Framer Motion, Radix UI, Lucide Icons, Sonner.
- **Backend**: Node.js, Express, TypeScript, PostgreSQL Connection Pool (`pg`), Winston Logger.
- **Database**: Cloud Supabase PostgreSQL (1.7M+ historical billing records, 21 service zones, 21k+ accounts).
- **External Regressors**: Open-Meteo Real-time Doppler & Weather API (Tabaco City: 13.3584° N, 123.7314° E).

---

## 🚀 Step-by-Step Terminal Launch Instructions

To run the complete system with live Supabase database connectivity, you will need **two terminal windows**:

### Step 1: Open Terminal 1 — Start the Backend Server (Supabase API)

1. Open your terminal (PowerShell, Command Prompt, or VS Code / IDE Terminal).
2. Navigate into the `aquastat-backend` directory:
   ```bash
   cd aquastat-backend
   ```
3. Install backend dependencies (only needed on first run):
   ```bash
   npm install
   ```
4. Verify your database connection settings in `aquastat-backend/.env` *(already pre-configured)*:
   ```env
   PORT=8000
   DB_HOST=aws-0-ap-northeast-2.pooler.supabase.com
   DB_PORT=6543
   DB_NAME=postgres
   DB_USER=postgres.liwjkumbuzfdsfngaddt
   DB_PASSWORD="CapstoneProj26/27"
   DB_SSL=true
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
6. **Expected Terminal Output**:
   ```text
   [INFO] [DB] Testing PostgreSQL connection pool...
   [INFO] [DB] Connected to PostgreSQL (Supabase) successfully.
   [INFO] Server running on http://localhost:8000 in development mode
   ```
   > 💡 **Verification**: Open [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) in your browser. It should return `{"success": true, "status": "healthy"}`.

---

### Step 2: Open Terminal 2 — Start the Frontend Web Application

1. Open a **new, separate terminal window** (do not close Terminal 1).
2. Ensure you are at the **root project directory** (`capstonefinals`):
   ```bash
   cd "c:\Users\Moi Yu\Documents\GitHub\capstonefinals"
   ```
3. Install frontend dependencies (only needed on first run):
   ```bash
   npm install
   ```
4. Start the Vite React development server:
   ```bash
   npm run dev
   ```
5. **Expected Terminal Output**:
   ```text
     VITE v6.3.5  ready in 480 ms

     ➜  Local:   http://localhost:5173/
     ➜  Network: use --host to expose
     ➜  press h + enter to show help
   ```

---

### Step 3: Access the System in Your Browser

Open your web browser (Chrome, Edge, Firefox, or Safari) and navigate to:
```text
http://localhost:5173
```

---

## 🔐 Executive Management Login Credentials

The system includes pre-configured **official TCWD management accounts** for presentation and defense, as well as support for entering custom credentials:

| Role / Designation | Official Full Name | Username | Password | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Operations Manager** *(Default)* | Engr. Julian Reyes, P.E. | `j.reyes.tcwd` | `Password123!` | Level 4 · Operations & Dispatch |
| **General Manager** | Engr. Joseph Richard G. Catubag, MBA | `gm.catubag` | `Password123!` | Level 5 · Executive Administrator |
| **System Administrator** | AquaStat Lead MIS Specialist | `admin` | `Password123!` | Level 5 · Superuser Admin |
| **Commercial Accounts Head** | Maria Mallari, CPA | `m.mallari.tcwd` | `Password123!` | Level 3 · Billing & Revenue |
| **Custom Management Account** | *Your Name* | *Any username* | *Any 4+ chars* | Level 4 · Custom Officer Session |

> ⚡ **Quick Preset Buttons**: On the login screen, you can also click any of the **Quick Executive Management Presets** below the form to sign in with one click without typing!

---

## 🧭 Key System Capabilities & Shortcuts

### 1. Global Command Palette (`Ctrl + K`)
- Press `Ctrl + K` (or `Cmd + K` on Mac) anywhere in the application to open the **Command Palette**.
- Search for any of the **20 Tabaco City Barangays** (e.g. *Panal, Tagas, San Roque, Sto. Cristo, Buang*). Selecting a barangay will **deep-link and automatically open that zone's 6-month consumption and NRW drill-down card**!
- Navigate using keyboard `↑` and `↓` arrows and press `Enter` to select.

### 2. User Profile & Two-Step Sign Out Confirmation
- Click the **user profile avatar** in the top-right header or bottom-left sidebar to view your **Official Executive Credentials, Employee ID, Security Tier, and Active TLS 1.3 Session**.
- Click **"Sign Out"** to trigger the **two-step confirmation modal** (*"Are you sure you want to sign out?"*), safely ending your authenticated session and clearing local caches.

### 3. Prescriptive Pump Optimization (MILP CBC Solver)
- Navigate to the **Optimization** tab to inspect the **Mixed-Integer Linear Programming (MILP)** pump dispatch model.
- Test Time-of-Use (TOU) tariffs across Night Off-Peak (₱6.20/kWh), Morning (₱8.50/kWh), Afternoon (₱8.50/kWh), and Evening Peak (₱11.80/kWh).
- Interactively edit pump running hours per station and click **"Solve with LP Optimization"** to recalculate global energy costs and monthly savings.
- Use **"Copy Dispatch Order"** to copy formatted operational pump schedules for TCWD pump operators.

### 4. International Water Balance Matrix (IWA / LWUA Standard)
- Navigate to the **NRW Hotspots** tab to view the full **System Input Volume (SIV)** reconciliation:
  - Billed Authorised Consumption (Revenue Water: 72.0%)
  - Unbilled Authorised Consumption (1.5%)
  - Commercial Apparent Losses (6.9%)
  - Physical Real Losses (19.6%)
- Monitor the **District Metered Area (DMA) Acoustic Leak Sweep Schedule** with Minimum Night Flow (MNF) ratios.

### 5. Water Supply & Reservoir Storage Monitoring
- Navigate to the **Supply & Shortage** tab to view production source capacities:
  - Mayon Mountain Gravity Springs (Pinagbobong & Buang: 1,800 m³/day at ₱0.00/kWh)
  - San Vicente Deep Well PS-01 (6,000 m³/day)
  - Panal Booster PS-A (4,500 m³/day)
  - Buang Booster PS-B (3,200 m³/day)
- Monitor real-time **distribution reservoir level gauges** with pressure heads and drawdown buffer hours.

### 6. Executive Report Builder with Manual Annotations
- Navigate to the **Export & Reports** tab to generate official LWUA and TCWD Board compliance reports.
- Type qualitative field commentary in **Step 3 (Executive Commentary & Operational Caveats)** with designated signatories.
- Live preview changes instantly and export certified board memos with **"Copy Board Memo"**.

---

## 🗄️ Database Architecture (Supabase PostgreSQL)

The backend queries live tables in Supabase:
- `fact_billing`: 1.7M+ monthly billing transactions (volumes, amounts, brackets).
- `dim_location`: 21 geographical service zones and barangays in Tabaco City.
- `dim_customer`: 21,000+ consumer accounts and customer classifications.
- `ref_mds_monthly`: 108 monthly engineering records (2017–2025 SIV, NRW %, production).
- `ref_mds_annual_summary`: 9 annual water audit summary rows.
- `fact_nrw`: 108 zone-level leakage records.

---

## 🛠️ Common Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Port 8000 already in use** | Another backend instance is running | Kill the previous process: `npx kill-port 8000` or restart terminal |
| **Port 5173 already in use** | Vite selected 5174 | Vite will automatically forward; open the URL printed in Terminal 2 |
| **"Could not sync with Supabase"** | Internet drop or Supabase pooler sleep | The app automatically uses graceful offline fallbacks. Check your WiFi connection and click "Refresh Data" |
| **Blank screen on older browser** | ESNext JavaScript feature | Use an updated version of Google Chrome, Microsoft Edge, or Firefox |

---

## 👥 Authors & Academic Context
- **Institution**: University of Santo Tomas (UST), Manila, Philippines
- **College**: College of Information and Computing Sciences (CICS)
- **Program**: Bachelor of Science in Information Systems — Business Analytics Track
- **Authors**: Dionela, Mallari, Roaring, Yu
- **Adviser**: Inst. Joseph Richard G. Catubag, MBA