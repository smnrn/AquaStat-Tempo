import { useState, useEffect, useRef, type ReactNode, type FormEvent } from "react"
import { toast, Toaster } from "sonner"
import { motion, AnimatePresence } from "motion/react"
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback"
import tcwdSeal from "@/imports/image-8.png"
import {
  LayoutDashboard, BarChart3, TrendingUp, Droplets, CloudSun, Map,
  Grid3x3, Zap, Bell, Download, ChevronLeft, ChevronRight, Search, Menu,
  RefreshCw, Eye, EyeOff, AlertTriangle, Info, Clock, User,
  Shield, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle,
  Filter, Calendar, FileText, Database,
  Sun, Cloud, CloudRain, CloudLightning, MapPin, Activity,
  CheckCheck, Cpu, type LucideIcon
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, ResponsiveContainer, ReferenceLine, ReferenceArea, ComposedChart
} from "recharts"

// ── TYPES ──────────────────────────────────────────────────────────────────
type ScreenId =
  | "dashboard" | "descriptive" | "predictive" | "shortage"
  | "weather" | "nrw" | "zones" | "optimization" | "alerts" | "export"
type ZoneStatus = "normal" | "warning" | "critical"

// ── DATA ───────────────────────────────────────────────────────────────────
const ZONES = [
  { id: 1,  name: "Tabaco Center",     consumption: 18240, nrw: 24.2, accounts: 892,  population: 4120, status: "critical" as ZoneStatus, trend: [14200,15400,16100,16900,17600,18240] },
  { id: 2,  name: "Panal / Poblacion", consumption: 22150, nrw: 27.0, accounts: 1124, population: 5280, status: "critical" as ZoneStatus, trend: [18200,19400,20100,20900,21600,22150] },
  { id: 3,  name: "Magallanes",        consumption: 14320, nrw: 18.4, accounts: 698,  population: 3140, status: "warning"  as ZoneStatus, trend: [13100,13400,13800,14000,14200,14320] },
  { id: 4,  name: "Rawis",             consumption: 11840, nrw: 14.8, accounts: 582,  population: 2680, status: "normal"   as ZoneStatus, trend: [11200,11400,11500,11600,11720,11840] },
  { id: 5,  name: "Quinartisan",       consumption: 9420,  nrw: 16.2, accounts: 461,  population: 2100, status: "warning"  as ZoneStatus, trend: [8800,9000,9100,9200,9320,9420]    },
  { id: 6,  name: "Buang",             consumption: 8760,  nrw: 12.4, accounts: 428,  population: 1980, status: "normal"   as ZoneStatus, trend: [8400,8500,8580,8640,8700,8760]    },
  { id: 7,  name: "Sagrada",           consumption: 16480, nrw: 19.8, accounts: 802,  population: 3720, status: "warning"  as ZoneStatus, trend: [14800,15200,15600,15900,16200,16480] },
  { id: 8,  name: "Tayhi",             consumption: 7840,  nrw: 11.2, accounts: 384,  population: 1760, status: "normal"   as ZoneStatus, trend: [7500,7580,7640,7700,7770,7840]    },
  { id: 9,  name: "Tula-tula Grande",  consumption: 10240, nrw: 17.6, accounts: 502,  population: 2320, status: "warning"  as ZoneStatus, trend: [9600,9800,9940,10040,10140,10240]  },
  { id: 10, name: "Tula-tula Pequeño", consumption: 6480,  nrw: 10.8, accounts: 318,  population: 1440, status: "normal"   as ZoneStatus, trend: [6200,6280,6340,6400,6440,6480]    },
  { id: 11, name: "San Lorenzo",       consumption: 8920,  nrw: 15.4, accounts: 437,  population: 2020, status: "normal"   as ZoneStatus, trend: [8500,8620,8720,8800,8860,8920]    },
  { id: 12, name: "Hacienda",          consumption: 5840,  nrw: 9.8,  accounts: 286,  population: 1320, status: "normal"   as ZoneStatus, trend: [5600,5680,5720,5770,5810,5840]    },
  { id: 13, name: "Banao",             consumption: 9180,  nrw: 16.8, accounts: 449,  population: 2080, status: "warning"  as ZoneStatus, trend: [8700,8820,8940,9020,9100,9180]    },
  { id: 14, name: "Salvacion",         consumption: 7420,  nrw: 13.2, accounts: 363,  population: 1680, status: "normal"   as ZoneStatus, trend: [7100,7180,7260,7320,7380,7420]    },
  { id: 15, name: "Sto. Cristo",       consumption: 14840, nrw: 22.3, accounts: 726,  population: 3360, status: "critical" as ZoneStatus, trend: [12800,13200,13600,14000,14400,14840] },
  { id: 16, name: "Gogon",             consumption: 8640,  nrw: 14.6, accounts: 423,  population: 1960, status: "normal"   as ZoneStatus, trend: [8200,8320,8420,8500,8580,8640]    },
  { id: 17, name: "Arimbay",           consumption: 10480, nrw: 18.9, accounts: 513,  population: 2380, status: "warning"  as ZoneStatus, trend: [9800,10000,10140,10260,10380,10480] },
  { id: 18, name: "Sulong",            consumption: 6820,  nrw: 11.6, accounts: 334,  population: 1540, status: "normal"   as ZoneStatus, trend: [6500,6580,6640,6700,6760,6820]    },
  { id: 19, name: "Pigcale",           consumption: 9640,  nrw: 17.2, accounts: 472,  population: 2180, status: "warning"  as ZoneStatus, trend: [9100,9240,9360,9460,9560,9640]    },
  { id: 20, name: "Fatima",            consumption: 11240, nrw: 20.4, accounts: 550,  population: 2540, status: "critical" as ZoneStatus, trend: [10200,10480,10720,10920,11080,11240] },
]

const TOP10_ZONES = [...ZONES].sort((a, b) => b.consumption - a.consumption).slice(0, 10)

const ANNUAL_TREND = [
  { year: "2017", consumption: 168420, revenue: 4218000, nrw: 32.1 },
  { year: "2018", consumption: 172840, revenue: 4445000, nrw: 30.8 },
  { year: "2019", consumption: 178920, revenue: 4602000, nrw: 29.4 },
  { year: "2020", consumption: 165380, revenue: 4224000, nrw: 31.2 },
  { year: "2021", consumption: 171240, revenue: 4398000, nrw: 29.8 },
  { year: "2022", consumption: 180560, revenue: 4702000, nrw: 28.8 },
  { year: "2023", consumption: 187240, revenue: 4891000, nrw: 28.3 },
  { year: "2024", consumption: 190120, revenue: 5042000, nrw: 28.1 },
  { year: "2025", consumption: 193748, revenue: 5249087, nrw: 28.0 },
]

const FORECAST_DATA = [
  { month: "Jan '24", actual: 168240 },
  { month: "Apr '24", actual: 174480 },
  { month: "Jul '24", actual: 181920 },
  { month: "Oct '24", actual: 185640 },
  { month: "Jan '25", actual: 175480 },
  { month: "Apr '25", actual: 178420 },
  { month: "Jul '25", actual: 190340 },
  { month: "Sep '25", actual: 193748 },
  { month: "Oct '25", forecast: 196200, ci_low: 189000, ci_high: 203400 },
  { month: "Nov '25", forecast: 198400, ci_low: 190800, ci_high: 206000 },
  { month: "Dec '25", forecast: 195600, ci_low: 187800, ci_high: 203400 },
  { month: "Jan '26", forecast: 201800, ci_low: 193200, ci_high: 210400 },
  { month: "Feb '26", forecast: 210400, ci_low: 199800, ci_high: 221000 },
  { month: "Mar '26", forecast: 218600, ci_low: 207200, ci_high: 230000 },
  { month: "Apr '26", forecast: 222800, ci_low: 210400, ci_high: 235200 },
  { month: "May '26", forecast: 216400, ci_low: 204000, ci_high: 228800 },
]

const SUPPLY_DEMAND = [
  { month: "Jan '25", supply: 255000, demand: 175480 },
  { month: "Feb '25", supply: 255000, demand: 168240 },
  { month: "Mar '25", supply: 255000, demand: 172860 },
  { month: "Apr '25", supply: 255000, demand: 178420 },
  { month: "May '25", supply: 255000, demand: 182640 },
  { month: "Jun '25", supply: 255000, demand: 186920 },
  { month: "Jul '25", supply: 255000, demand: 190340 },
  { month: "Aug '25", supply: 255000, demand: 192480 },
  { month: "Sep '25", supply: 255000, demand: 193748 },
  { month: "Oct '25", supply: 255000, demand: 196200 },
  { month: "Nov '25", supply: 255000, demand: 198400 },
  { month: "Dec '25", supply: 255000, demand: 195600 },
  { month: "Jan '26", supply: 248000, demand: 201800 },
  { month: "Feb '26", supply: 235000, demand: 210400 },
  { month: "Mar '26", supply: 224000, demand: 218600 },
  { month: "Apr '26", supply: 218000, demand: 222800 },
  { month: "May '26", supply: 228000, demand: 216400 },
  { month: "Jun '26", supply: 242000, demand: 210800 },
]

const CUSTOMER_CLASS = [
  { name: "Residential",     value: 139186, revenue: 3482000, accounts: 8240, color: "#0038A8" },
  { name: "Commercial",      value: 9849,   revenue: 621000,  accounts: 680,  color: "#0284C7" },
  { name: "Government",      value: 18324,  revenue: 784000,  accounts: 220,  color: "#10B981" },
  { name: "Semi-Commercial", value: 4722,   revenue: 298000,  accounts: 860,  color: "#F59E0B" },
]

const ALERTS_DATA = [
  { id: 1, severity: "critical" as const, title: "Zone 2 NRW exceeds 27% — Isolation Forest Confirmed",     detail: "Detected loss gap of 4,200 m³. Correlates with drop in pump discharge pressure at Station 2.", zone: "Zone 2",     timestamp: "Sep 12, 08:42", algorithm: "Isolation Forest", category: "nrw",      status: "active" },
  { id: 2, severity: "critical" as const, title: "Dry Season Demand Spike — Zone 1 & Zone 15 (Feb–Apr '26)", detail: "LSTM predicts +22% spike above Q1 baseline. Initiate early rationing protocol.", zone: "Zone 1, 15",  timestamp: "Sep 11, 14:18", algorithm: "LSTM",             category: "shortage", status: "active" },
  { id: 3, severity: "warning"  as const, title: "Zone 7 NRW 3-month upward trend detected",                 detail: "NRW rose 16.2% → 19.8% over Q3 2025. Possible meter aging or new illegal connection.",  zone: "Zone 7",     timestamp: "Sep 10, 09:22", algorithm: "SARIMA",           category: "nrw",      status: "active" },
  { id: 4, severity: "warning"  as const, title: "Booster Station B efficiency below 78% rated capacity",    detail: "Operating at 71.4% efficiency. Maintenance interval overdue by 22 days.",              zone: "All Zones",  timestamp: "Sep 09, 16:44", algorithm: "IoT Sensor",       category: "pump",     status: "active" },
  { id: 5, severity: "warning"  as const, title: "Zone 15 anomalous night-flow — min flow 180% above avg",   detail: "Minimum Night Flow anomaly. Possible main line break in sector 15-C.",                  zone: "Zone 15",    timestamp: "Sep 08, 02:14", algorithm: "K-Means",          category: "nrw",      status: "active" },
  { id: 6, severity: "info"     as const, title: "Zone 20 approaching LWUA NRW threshold at 20.4%",          detail: "Recommend pre-emptive meter audit for accounts with >5 year meter installation.",        zone: "Zone 20",    timestamp: "Sep 07, 11:03", algorithm: "Threshold",        category: "nrw",      status: "active" },
  { id: 7, severity: "info"     as const, title: "Main Pump Station maintenance window — Sep 25–27",          detail: "Planned 48-hour maintenance. Activate reservoir buffer and contingency supply protocol.", zone: "All Zones",  timestamp: "Sep 06, 08:00", algorithm: "Scheduled",        category: "pump",     status: "active" },
  { id: 8, severity: "info"     as const, title: "Q4 2025 Rate Adjustment — LWUA Circular 004-2025",          detail: "Scheduled tariff review. Prepare billing system update for November 1, 2025.",           zone: "All Zones",  timestamp: "Sep 05, 09:15", algorithm: "System Notice",    category: "info",     status: "active" },
]

const PUMP_SCHEDULE = [
  { station: "Main Pump Station",  block: "12AM–6AM", current: 5.5, optimized: 6.0, delta: 0.5,  costCurrent: 46904, costOptimized: 38420, savings: 8.2  },
  { station: "Main Pump Station",  block: "6AM–12PM", current: 6.0, optimized: 5.2, delta: -0.8, costCurrent: 57940, costOptimized: 33180, savings: 12.4 },
  { station: "Main Pump Station",  block: "12PM–6PM", current: 5.8, optimized: 4.8, delta: -1.0, costCurrent: 36800, costOptimized: 30640, savings: 16.8 },
  { station: "Main Pump Station",  block: "6PM–12AM", current: 4.5, optimized: 5.8, delta: 1.3,  costCurrent: 38240, costOptimized: 37040, savings: -3.1 },
  { station: "Booster Station A",  block: "12AM–6AM", current: 4.0, optimized: 4.5, delta: 0.5,  costCurrent: 15400, costOptimized: 14320, savings: 7.2  },
  { station: "Booster Station A",  block: "6AM–12PM", current: 5.5, optimized: 4.2, delta: -1.3, costCurrent: 16400, costOptimized: 13380, savings: 18.4 },
  { station: "Booster Station A",  block: "12PM–6PM", current: 5.0, optimized: 3.8, delta: -1.2, costCurrent: 15660, costOptimized: 12120, savings: 22.6 },
  { station: "Booster Station A",  block: "6PM–12AM", current: 3.5, optimized: 4.8, delta: 1.3,  costCurrent: 14000, costOptimized: 15300, savings: -9.2 },
  { station: "Booster Station B",  block: "12AM–6AM", current: 3.0, optimized: 3.8, delta: 0.8,  costCurrent: 10340, costOptimized: 9640,  savings: 6.8  },
  { station: "Booster Station B",  block: "6AM–12PM", current: 4.5, optimized: 3.2, delta: -1.3, costCurrent: 10180, costOptimized: 8120,  savings: 20.4 },
  { station: "Booster Station B",  block: "12PM–6PM", current: 4.0, optimized: 2.9, delta: -1.1, costCurrent: 9420,  costOptimized: 7360,  savings: 24.2 },
  { station: "Booster Station B",  block: "6PM–12AM", current: 2.5, optimized: 3.6, delta: 1.1,  costCurrent: 8920,  costOptimized: 9140,  savings: -2.4 },
]

const WEATHER_FORECAST = [
  { day: "Fri", date: "Aug 22", icon: "sun",   high: 34, low: 26, precip: 5  },
  { day: "Sat", date: "Aug 23", icon: "cloud", high: 33, low: 26, precip: 15 },
  { day: "Sun", date: "Aug 24", icon: "rain",  high: 31, low: 25, precip: 75 },
  { day: "Mon", date: "Aug 25", icon: "rain",  high: 29, low: 24, precip: 82 },
  { day: "Tue", date: "Aug 26", icon: "cloud", high: 30, low: 25, precip: 40 },
  { day: "Wed", date: "Aug 27", icon: "sun",   high: 33, low: 26, precip: 8  },
  { day: "Thu", date: "Aug 28", icon: "sun",   high: 34, low: 27, precip: 5  },
  { day: "Fri", date: "Aug 29", icon: "cloud", high: 33, low: 26, precip: 20 },
  { day: "Sat", date: "Aug 30", icon: "storm", high: 28, low: 24, precip: 90 },
  { day: "Sun", date: "Aug 31", icon: "rain",  high: 27, low: 23, precip: 88 },
]

const TEMP_DEMAND = [
  { temp: 25, demand: 5420 }, { temp: 26, demand: 5680 }, { temp: 27, demand: 5920 },
  { temp: 28, demand: 6180 }, { temp: 29, demand: 6440 }, { temp: 30, demand: 6840 },
  { temp: 31, demand: 7220 }, { temp: 32, demand: 7680 }, { temp: 33, demand: 8240 },
  { temp: 34, demand: 8820 }, { temp: 35, demand: 9480 }, { temp: 36, demand: 10240 },
]

const TYPHOON_LOG = [
  { name: "Super Typhoon Rolly (Goni)", date: "Oct 31, 2020", rainfall: "187 mm/24hr", category: "CAT 5", recovery: "18 days", loss: "62,400 m³" },
  { name: "Typhoon Reming (Durian)",    date: "Nov 30, 2006", rainfall: "242 mm/24hr", category: "CAT 4", recovery: "31 days", loss: "N/A (pre-2017)" },
  { name: "Typhoon Nina (Nock-Ten)",    date: "Dec 25, 2016", rainfall: "134 mm/24hr", category: "CAT 3", recovery: "9 days",  loss: "N/A (pre-2017)" },
  { name: "Typhoon Quinta (Molave)",    date: "Oct 26, 2020", rainfall: "98 mm/24hr",  category: "CAT 2", recovery: "6 days",  loss: "28,100 m³" },
]

const HEATMAP_MONTHS = ["Oct '24","Nov '24","Dec '24","Jan '25","Feb '25","Mar '25","Apr '25","May '25","Jun '25","Jul '25","Aug '25","Sep '25"]

const HEATMAP_DATA = ZONES.map(z => ({
  zone: `Zone ${String(z.id).padStart(2,"0")}`,
  values: HEATMAP_MONTHS.map((_, i) => Math.round(z.consumption * (0.82 + (i / HEATMAP_MONTHS.length) * 0.2 + (Math.sin(i * 0.5) * 0.05))))
}))

const TOP_ACCOUNTS = [
  { id: "ACC-00023", zone: "Zone 2", class: "Government",    monthly: 2840, bill: 168420, flag: "82% above gov avg — Flag for audit" },
  { id: "ACC-00487", zone: "Zone 1", class: "Commercial",    monthly: 2210, bill: 132600, flag: "High-density commercial complex"    },
  { id: "ACC-01094", zone: "Zone 7", class: "Commercial",    monthly: 1980, bill: 118800, flag: "Consistent above-baseline trend"    },
  { id: "ACC-00318", zone: "Zone 15",class: "Residential",   monthly: 1740, bill: 104400, flag: "Suspected sub-metering violation"   },
  { id: "ACC-00762", zone: "Zone 3", class: "Semi-Commercial",monthly:1520, bill: 91200,  flag: "Seasonal irrigation spike"          },
]

const ALLOC_DIRECTIVES = [
  { title: "Shift Zone 21 pumping 2h to off-peak tariff window",         saving: "₱27,000/mo",  priority: "high"   },
  { title: "Reduce Booster B afternoon run by 1.1h — demand covered",    saving: "₱18,400/mo",  priority: "high"   },
  { title: "Pre-position reservoir buffer 48h before Pump Station maint.", saving: "₱9,200/mo",   priority: "medium" },
  { title: "Implement Zone 9 pressure step-down 12AM–5AM",               saving: "₱11,800/mo",  priority: "medium" },
  { title: "Schedule Zone 15 bulk meter calibration — NRW flag",         saving: "Est. ₱7,500/mo NRW recovery", priority: "low" },
]

// ── NAVIGATION ─────────────────────────────────────────────────────────────
interface NavItem { id: ScreenId; label: string; sublabel: string; icon: LucideIcon; badge?: number }

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",    label: "Dashboard",    sublabel: "Executive Overview",     icon: LayoutDashboard },
  { id: "descriptive",  label: "Descriptive",  sublabel: "Data Overview",           icon: BarChart3       },
  { id: "predictive",   label: "Predictive",   sublabel: "Demand Forecasting",      icon: TrendingUp      },
  { id: "shortage",     label: "Shortage",     sublabel: "Supply Monitoring",       icon: Droplets        },
  { id: "weather",      label: "Weather",      sublabel: "Weather & Climate",       icon: CloudSun        },
  { id: "nrw",          label: "NRW Map",      sublabel: "Hotspot Analysis",        icon: Map             },
  { id: "zones",        label: "Zones",        sublabel: "Service Zone Analysis",   icon: Grid3x3         },
  { id: "optimization", label: "Optimization", sublabel: "Pump Scheduling",         icon: Zap             },
  { id: "alerts",       label: "Alerts",       sublabel: "Notifications",           icon: Bell, badge: 8  },
  { id: "export",       label: "Export",       sublabel: "Report Builder",          icon: Download        },
]

const SCREEN_LABELS: Record<ScreenId, string> = {
  dashboard:    "Dashboard",
  descriptive:  "Descriptive Analytics",
  predictive:   "Demand Forecasting",
  shortage:     "Supply & Shortage",
  weather:      "Weather & Climate",
  nrw:          "NRW Hotspot Map",
  zones:        "Service Zone Analysis",
  optimization: "Prescriptive Optimization",
  alerts:       "Alerts & Notifications",
  export:       "Export & Reports",
}

// ── HOOKS ──────────────────────────────────────────────────────────────────
function useCountUp(target: string, duration = 1100): string {
  const [val, setVal] = useState("0")
  useEffect(() => {
    if (!target) { setVal("0"); return }
    const parts = target.replace(/,/g, "").match(/^([₱]?)([\d]+\.?[\d]*)([kMm]?)(.*)$/)
    if (!parts) { setVal(target); return }
    const [, prefix, num, suffix, rest] = parts
    const end = parseFloat(num)
    if (isNaN(end)) { setVal(target); return }
    const isFloat = target.includes(".")
    const decimals = isFloat ? (target.split(".")[1]?.replace(/\D/g, "").length ?? 1) : 0
    const t0 = performance.now()
    let raf: number
    const step = (ts: number) => {
      const p = Math.min((ts - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const cur = end * eased
      const formatted = isFloat
        ? `${prefix}${cur.toFixed(decimals)}${suffix}${rest}`
        : `${prefix}${Math.round(cur).toLocaleString()}${suffix ? suffix + rest : rest}`
      setVal(formatted)
      if (p < 1) raf = requestAnimationFrame(step)
      else setVal(target)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

// ── UTILITY COMPONENTS ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ZoneStatus }) {
  const map = {
    critical: "bg-red-50 text-red-600 border-red-200",
    warning:  "bg-amber-50 text-amber-600 border-amber-200",
    normal:   "bg-emerald-50 text-emerald-600 border-emerald-200",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${map[status]}`}>
      {status === "critical" ? "CRITICAL" : status === "warning" ? "WARNING" : "NORMAL"}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  const map = {
    critical: { bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200",    bar: "bg-[#D32F2F]" },
    warning:  { bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-200",  bar: "bg-[#F59E0B]" },
    info:     { bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-200",   bar: "bg-[#0038A8]" },
  }
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${map[severity].bg} ${map[severity].text}`}>{severity}</span>
}

function KPICard({ title, value, unit, change, changeLabel, color = "#0038A8", sparkData }: {
  title: string; value: string; unit?: string; change?: number; changeLabel?: string
  color?: string; sparkData?: number[]
}) {
  const positive = (change ?? 0) >= 0
  const animated = useCountUp(value)
  const lastIdx = (sparkData?.length ?? 0) - 1
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 16px -4px rgba(0,0,0,0.08)" }}
      transition={{ duration: 0.18 }}
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm cursor-default"
    >
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{title}</p>
      <div className="flex items-end justify-between gap-2">
        <div>
          <motion.span
            className="text-3xl font-bold text-slate-900 font-mono tabular-nums"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {animated}
          </motion.span>
          {unit && <span className="text-sm text-slate-500 ml-1">{unit}</span>}
          {change !== undefined && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${positive ? "text-emerald-600" : "text-red-500"}`}
            >
              {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              <span>{positive ? "+" : ""}{change}%</span>
              {changeLabel && <span className="text-slate-400 font-normal">{changeLabel}</span>}
            </motion.div>
          )}
        </div>
        {sparkData && (
          <div className="w-20 h-12 opacity-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData.map((v, i) => ({ v, i }))}>
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2}
                  dot={(props: any) => {
                    const k = `spk-${props.index}`
                    if (props.index !== lastIdx) return <g key={k} />
                    return (
                      <g key={k}>
                        <circle cx={props.cx} cy={props.cy} r={6} fill={color} opacity={0.18} />
                        <circle cx={props.cx} cy={props.cy} r={3.5} fill={color} stroke="white" strokeWidth={1.5} />
                      </g>
                    )
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function ChartCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function ChartTip({ active, payload, label, fmt }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string
  fmt?: (v: number, name: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-xl text-xs min-w-[140px]">
      {label && <p className="font-semibold text-slate-600 mb-2 pb-1 border-b border-slate-100">{label}</p>}
      {payload.map((item, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-slate-500">{item.name}</span>
          </div>
          <span className="font-mono font-semibold text-slate-800">
            {fmt ? fmt(item.value, item.name) : (typeof item.value === 'number' ? item.value.toLocaleString() : (item.value ?? '-'))}
          </span>
        </div>
      ))}
    </div>
  )
}

function NRWGauge({ value = 28, target = 20, max = 40 }: { value: number; target: number; max: number }) {
  const cx = 110, cy = 104, r = 74, sw = 13

  const toPoint = (pct: number) => {
    const angle = Math.PI * (1 - pct)
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) }
  }

  // sweep=1 → clockwise → top semicircle (sweep=0 was wrong, drew the bottom arc)
  const arc = (a: number, b: number) => {
    const s = toPoint(a), e = toPoint(b)
    return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${r} ${r} 0 0 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`
  }

  const pv = Math.min(value / max, 1)
  const pt = target / max       // 0.5 — LWUA limit at 20%
  const pw = 25 / max           // 0.625 — critical threshold
  const color = value > 25 ? "#EF4444" : value > 20 ? "#F59E0B" : "#10B981"
  const tp = toPoint(pt)

  return (
    <svg viewBox="0 0 220 128" className="w-full max-w-[240px] mx-auto">
      {/* Full background track */}
      <path d={arc(0, 1)} fill="none" stroke="#E2E8F0" strokeWidth={sw} strokeLinecap="round" />

      {/* Color-coded zone tints: green / amber / red */}
      <path d={arc(0, pt)}  fill="none" stroke="#10B981" strokeWidth={sw} strokeLinecap="round" opacity={0.28} />
      <path d={arc(pt, pw)} fill="none" stroke="#F59E0B" strokeWidth={sw} strokeLinecap="round" opacity={0.32} />
      <path d={arc(pw, 1)}  fill="none" stroke="#EF4444" strokeWidth={sw} strokeLinecap="round" opacity={0.28} />

      {/* Current value arc — thinner so zone tint shows at edges */}
      <path d={arc(0, pv)} fill="none" stroke={color} strokeWidth={sw - 3} strokeLinecap="round" />

      {/* LWUA target marker: tick + label + dot */}
      <line x1={tp.x} y1={tp.y - 9} x2={tp.x} y2={tp.y - 17} stroke="#0038A8" strokeWidth="1.5" />
      <text x={tp.x} y={tp.y - 20} textAnchor="middle" fontSize="9" fill="#0038A8" fontWeight="700">LWUA {target}%</text>
      <circle cx={tp.x} cy={tp.y} r={5} fill="white" stroke="#0038A8" strokeWidth="2" />

      {/* Center value */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="26" fontWeight="700" fill="#0F172A" fontFamily="JetBrains Mono, monospace">{value}%</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="10" fill="#64748B">System NRW Rate</text>

      {/* Scale endpoints */}
      <text x={cx - r - 4} y={cy + 20} textAnchor="end"   fontSize="9" fill="#94A3B8">0%</text>
      <text x={cx + r + 4} y={cy + 20} textAnchor="start" fontSize="9" fill="#94A3B8">{max}%</text>
    </svg>
  )
}

function MiniSparkline({ data, color = "#0038A8" }: { data: number[]; color?: string }) {
  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((v, i) => ({ v, i }))}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} activeDot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── SCREEN: LOGIN ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); onLogin() }, 900)
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Hero panel — compact strip on mobile, full column on desktop */}
      <div className="relative flex flex-col justify-between md:flex-[3] overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0038A8 0%, #002D80 50%, #001A5C 100%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 900 700" preserveAspectRatio="xMidYMid slice">
          <path d="M0,300 C150,220 300,380 450,300 C600,220 750,380 900,300 L900,700 L0,700 Z" fill="white" />
          <path d="M0,400 C150,320 300,480 450,400 C600,320 750,480 900,400 L900,700 L0,700 Z" fill="white" opacity="0.5" />
          <path d="M0,500 C150,420 300,560 450,500 C600,420 750,560 900,500 L900,700 L0,700 Z" fill="white" opacity="0.3" />
          <circle cx="120" cy="120" r="80" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" />
          <circle cx="780" cy="200" r="120" fill="none" stroke="white" strokeWidth="0.8" opacity="0.2" />
          <circle cx="400" cy="80" r="50" fill="none" stroke="white" strokeWidth="0.6" opacity="0.25" />
        </svg>

        {/* Brand bar — always visible */}
        <div className="relative z-10 flex items-center gap-3 px-6 py-5 md:px-14 md:py-12 md:mb-0">
          <div className="w-11 h-11 md:w-14 md:h-14 rounded-full overflow-hidden flex-shrink-0 bg-white shadow-lg shadow-black/20 ring-2 ring-white/20">
            <ImageWithFallback src={tcwdSeal} alt="Tabaco City Water District seal" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-white font-bold text-base md:text-lg tracking-tight leading-none">AquaStat</p>
            <p className="text-blue-200/70 text-xs">Tabaco City Water District</p>
          </div>
        </div>

        {/* Hero copy — hidden on mobile, visible on desktop */}
        <div className="relative z-10 hidden md:block px-14 pb-0 flex-1 flex flex-col justify-center">
          <h1 className="text-white text-4xl font-extrabold leading-snug mb-5 max-w-md">
            Smarter water operations<br />for Tabaco City.
          </h1>
          <p className="text-blue-100/80 text-sm leading-relaxed max-w-sm">
            Monitor non-revenue water, forecast demand, and act on rule-based recommendations across all 20 service zones — from a single, secure operations console.
          </p>
        </div>

        {/* Footer — desktop only */}
        <div className="relative z-10 hidden md:block px-14 py-8 text-blue-200/50 text-xs">
          © 2025 Tabaco City Water District · AquaStat DSS v2.4.1
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-start md:items-center justify-center bg-[#F8FAFC] px-5 py-8 md:flex-[2] md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">Sign In</h2>
            <p className="text-sm text-slate-500 mb-6">Welcome back. Enter your credentials to continue.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Username</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. j.reyes.tcwd"
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/10 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Shield size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/10 transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#0038A8]" />
                  <span className="text-xs text-slate-600">Remember this device</span>
                </label>
                <button type="button" className="text-xs text-[#0038A8] hover:underline">Forgot password?</button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-all mt-2"
                style={{ background: loading ? "#6B8FD4" : "#0038A8" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="inline-block"><RefreshCw size={14} /></motion.span>
                    Authenticating…
                  </span>
                ) : "Sign In to AquaStat"}
              </button>
            </form>
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-4 flex items-center justify-center gap-1.5">
            <Shield size={11} /> Authorized Personnel Only · All sessions are encrypted (TLS 1.3)
          </p>
        </motion.div>
      </div>
    </div>
  )
}

// ── SCREEN: DASHBOARD ──────────────────────────────────────────────────────
function DashboardScreen() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard — Tabaco City Water District</h1>
          <p className="text-sm text-slate-500 mt-0.5">September 2025 · Live Operations Overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
            <Calendar size={13} /> Sep 2025
          </button>
          <button className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#0038A8] rounded-lg px-3 py-2 hover:bg-[#002D80] transition-colors">
            <RefreshCw size={13} /> Refresh Data
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Accounts" value="10,000" change={0.8} changeLabel="vs prev. month"
          color="#0038A8" sparkData={[9780,9810,9840,9862,9891,9920,9960,10000]} />
        <KPICard title="Total Consumption" value="193,748" unit="m³" change={1.1} changeLabel="vs baseline"
          color="#0284C7" sparkData={[182000,184000,186000,188000,189000,191000,192000,193748]} />
        <KPICard title="Total Revenue" value="₱5.25M" change={0.6} changeLabel="vs target"
          color="#10B981" sparkData={[4800000,4900000,5000000,5050000,5100000,5150000,5200000,5249087]} />
        <KPICard title="Avg per Account" value="19.4" unit="m³" change={0.3} changeLabel="steady trend"
          color="#F59E0B" sparkData={[18.8,18.9,19.0,19.1,19.2,19.2,19.3,19.4]} />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-4">
        {/* Left column */}
        <div className="space-y-4">
          <ChartCard title="Consumption by Zone — Sep 2025 (Top 10)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={TOP10_ZONES} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <XAxis key="xaxis" type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis key="yaxis" type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} width={130} axisLine={false} tickLine={false} />
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} fmt={v => `${v.toLocaleString()} m³`} />} />
                <Bar key="bar-consumption" dataKey="consumption" name="Consumption m³" fill="#0038A8" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {TOP10_ZONES.map((z, i) => (
                    <Cell key={`zone-${i}`} fill={z.status === "critical" ? "#D32F2F" : z.status === "warning" ? "#F59E0B" : "#0038A8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Annual Consumption Trend — 2017 to 2025">
            {/* Gradient defined outside recharts SVG to avoid duplicate <defs> siblings */}
            <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
              <defs>
                <linearGradient id="consGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0038A8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0038A8" stopOpacity={0} />
                </linearGradient>
              </defs>
            </svg>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={ANNUAL_TREND} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis key="xaxis" dataKey="year" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis key="yaxis" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} fmt={(v,n) => n.includes("NRW") ? `${v}%` : `${v.toLocaleString()} m³`} />} />
                <Area key="area-consumption" type="monotone" dataKey="consumption" name="Consumption m³" stroke="#0038A8" strokeWidth={2.5}
                  fill="url(#consGrad)" dot={{ fill: "#0038A8", r: 3, strokeWidth: 0 }} activeDot={false} />
                <Line key="line-nrw" type="monotone" dataKey="nrw" name="NRW %" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 3"
                  dot={{ fill: "#F59E0B", r: 2.5, strokeWidth: 0 }} activeDot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* NRW Status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Non-Revenue Water Status</h3>
            <p className="text-xs text-slate-500 mb-3">LWUA Standard: ≤20% · Current: <span className="font-semibold text-red-500">28.0% ↑</span></p>
            <NRWGauge value={28} target={20} max={40} />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 mb-1">Billed Volume</p>
                <p className="font-mono font-bold text-slate-900 text-sm">119,671 m³</p>
                <p className="text-[10px] text-slate-400">74.0% of production</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-[10px] text-red-500 mb-1">NRW Loss Volume</p>
                <p className="font-mono font-bold text-red-600 text-sm">74,077 m³</p>
                <p className="text-[10px] text-red-400">₱1.78M/mo revenue loss</p>
              </div>
            </div>
          </div>

          {/* Customer Class Donut */}
          <ChartCard title="Customer Class Distribution">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie key="donut" data={CUSTOMER_CLASS} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                      dataKey="value" paddingAngle={2}>
                      {CUSTOMER_CLASS.map((c, i) => <Cell key={`pie-${i}`} fill={c.color} />)}
                    </Pie>
                    <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} fmt={v => `${v.toLocaleString()} m³`} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1">
                {CUSTOMER_CLASS.map(c => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-slate-700 truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{((c.value / 171081) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Active Alerts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Active Alerts</h3>
              <motion.span animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2, repeat: Infinity }}
                className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">8</motion.span>
            </div>
            <div className="divide-y divide-slate-100">
              {ALERTS_DATA.slice(0, 4).map(a => (
                <div key={a.id} className="px-4 py-2.5 flex items-start gap-2.5 hover:bg-slate-50 transition-colors">
                  <div className={`w-1 self-stretch rounded-full flex-shrink-0 mt-0.5 ${a.severity === "critical" ? "bg-red-500" : a.severity === "warning" ? "bg-amber-400" : "bg-blue-400"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 leading-tight line-clamp-1">{a.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{a.zone} · {a.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SCREEN: DESCRIPTIVE ────────────────────────────────────────────────────
function DescriptiveScreen() {
  const [activeClass, setActiveClass] = useState("All")
  const classes = ["All", "Residential", "Commercial", "Government", "Semi-Commercial"]

  // Class share of total consumption (used to scale heatmap when filtered)
  const CLASS_SHARE: Record<string, number> = {
    "Residential":     139186 / (139186 + 9849 + 18324 + 4722),
    "Commercial":      9849   / (139186 + 9849 + 18324 + 4722),
    "Government":      18324  / (139186 + 9849 + 18324 + 4722),
    "Semi-Commercial": 4722   / (139186 + 9849 + 18324 + 4722),
  }

  // Customer class bars: dim unselected entries, keep selected ones vivid
  const filteredCustomerClass = CUSTOMER_CLASS.map(c => ({
    ...c,
    dimmed: activeClass !== "All" && c.name !== activeClass,
  }))

  // Heatmap: scale zone values by class share when a class is active
  const filteredHeatmap = activeClass === "All"
    ? HEATMAP_DATA
    : HEATMAP_DATA.map(row => ({
        ...row,
        values: row.values.map(v => Math.round(v * CLASS_SHARE[activeClass])),
      }))

  // Top accounts: filter by class
  const filteredAccounts = activeClass === "All"
    ? TOP_ACCOUNTS
    : TOP_ACCOUNTS.filter(a => a.class === activeClass)

  const heatColor = (val: number) => {
    const min = 3000, max = 24000
    const t = Math.max(0, Math.min(1, (val - min) / (max - min)))
    if (t < 0.25) return "#DBEAFE"
    if (t < 0.5)  return "#93C5FD"
    if (t < 0.75) return "#3B82F6"
    return "#1D4ED8"
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Descriptive Analytics — Data Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Historical billing & bulk production analysis · 2017–2025</p>
        </div>
        <div className="flex items-center gap-2">
          {classes.map(c => (
            <button key={c} onClick={() => setActiveClass(c)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${activeClass === c ? "bg-[#0038A8] text-white border-[#0038A8]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Customer class bars */}
      <ChartCard title="Customer Class — Volume vs Revenue Breakdown">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Volume (m³)</p>
            {filteredCustomerClass.map(c => (
              <div key={c.name} className={`mb-3 transition-opacity duration-300 ${c.dimmed ? "opacity-25" : "opacity-100"}`}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`${c.dimmed ? "text-slate-400" : "text-slate-700"}`}>{c.name}</span>
                  <span className={`font-mono font-semibold ${c.dimmed ? "text-slate-400" : "text-slate-800"}`}>{c.value.toLocaleString()} m³</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    key={`vol-${c.name}-${activeClass}`}
                    initial={{ width: 0 }}
                    animate={{ width: c.dimmed ? "0%" : `${(c.value / 139186) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.05 }}
                    className="h-full rounded-full" style={{ background: c.color }} />
                </div>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Revenue (PHP)</p>
            {filteredCustomerClass.map(c => (
              <div key={c.name} className={`mb-3 transition-opacity duration-300 ${c.dimmed ? "opacity-25" : "opacity-100"}`}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`${c.dimmed ? "text-slate-400" : "text-slate-700"}`}>{c.name}</span>
                  <span className={`font-mono font-semibold ${c.dimmed ? "text-slate-400" : "text-slate-800"}`}>₱{(c.revenue/1000).toFixed(0)}k</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    key={`rev-${c.name}-${activeClass}`}
                    initial={{ width: 0 }}
                    animate={{ width: c.dimmed ? "0%" : `${(c.revenue / 3482000) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="h-full rounded-full opacity-70" style={{ background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* Heatmap */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            Historical Consumption Matrix — Oct 2024 to Sep 2025
            {activeClass !== "All" && (
              <span className="ml-2 text-[11px] font-medium text-white bg-[#0038A8] px-2 py-0.5 rounded-full">
                {activeClass}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span>Low</span>
            {["#DBEAFE","#93C5FD","#3B82F6","#1D4ED8"].map(c => <span key={c} className="w-5 h-3 rounded-sm inline-block" style={{ background: c }} />)}
            <span>High</span>
          </div>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="text-[10px] w-full">
            <thead>
              <tr>
                <th className="text-left font-semibold text-slate-500 pr-3 pb-1.5 whitespace-nowrap">Zone</th>
                {HEATMAP_MONTHS.map(m => (
                  <th key={m} className="font-medium text-slate-400 px-1 pb-1.5 whitespace-nowrap text-center">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredHeatmap.map(row => (
                <tr key={row.zone} className="hover:bg-slate-50 transition-colors">
                  <td className="pr-3 py-0.5 font-medium text-slate-700 whitespace-nowrap">{row.zone}</td>
                  {row.values.map((v, ci) => (
                    <td key={ci} className="px-0.5 py-0.5">
                      <div className="w-9 h-5 rounded flex items-center justify-center text-[9px] font-mono font-medium"
                        style={{ background: heatColor(v), color: v > 12000 ? "white" : "#1E3A5F" }}>
                        {(v/1000).toFixed(1)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top accounts */}
      <ChartCard title={`Top Highest-Consuming Accounts — Sep 2025${activeClass !== "All" ? ` · ${activeClass}` : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Account ID","Zone","Class","Monthly m³","Total Bill","Flag"].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    <div className="flex flex-col items-center gap-1.5">
                      <Database className="w-5 h-5 text-slate-300" />
                      No top accounts found for <span className="font-semibold text-slate-500">{activeClass}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAccounts.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 pr-4 font-mono text-xs font-semibold text-[#0038A8]">{a.id}</td>
                  <td className="py-2 pr-4 text-xs text-slate-700">{a.zone}</td>
                  <td className="py-2 pr-4">
                    {(() => { const cc = CUSTOMER_CLASS.find(c => c.name === a.class)?.color; return (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                      background: cc ? cc + "20" : "#e2e8f0",
                      color: cc ?? "#64748b",
                      border: `1px solid ${cc ? cc + "40" : "#e2e8f080"}`,
                    }}>{a.class}</span>
                    )})()}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs font-semibold text-slate-900">{a.monthly.toLocaleString()}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-slate-700">₱{a.bill.toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">{a.flag}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

// ── SCREEN: PREDICTIVE ─────────────────────────────────────────────────────
function PredictiveScreen() {
  const [activeModel, setActiveModel] = useState("Multivariate LSTM")
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const models = ["SARIMA", "Multivariate LSTM", "Meta Prophet", "XGBoost Regressor", "Ensemble Model"]
  const toggle = (key: string) => setHidden(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n
  })

  const MODEL_METRICS: Record<string, { rmse: string; mape: string; mae: string; note: string; best: string }> = {
    "SARIMA":             { rmse: "4,890 m³", mape: "4.12%", mae: "4,120 m³", note: "Statistical baseline model", best: "LSTM" },
    "Multivariate LSTM":  { rmse: "4,521 m³", mape: "3.24%", mae: "3,876 m³", note: "Best performer for non-linear peaks", best: "LSTM" },
    "Meta Prophet":       { rmse: "4,720 m³", mape: "3.85%", mae: "4,010 m³", note: "Additive weather & holiday model", best: "LSTM" },
    "XGBoost Regressor":  { rmse: "4,610 m³", mape: "3.50%", mae: "3,940 m³", note: "Extreme gradient boosted tree", best: "LSTM" },
    "Ensemble Model":     { rmse: "4,410 m³", mape: "3.10%", mae: "3,750 m³", note: "Weighted Bayesian combination", best: "Ensemble" },
  }

  const curMetrics = MODEL_METRICS[activeModel] || MODEL_METRICS["Multivariate LSTM"]

  const SPIKE_TABLE = [
    { month: "February 2026", zone: "Zone 1",  volume: 22480, spike: 28.4, confidence: "94.2%", risk: "critical" as ZoneStatus },
    { month: "March 2026",    zone: "Zone 15", volume: 19840, spike: 33.7, confidence: "91.8%", risk: "critical" as ZoneStatus },
    { month: "April 2026",    zone: "Zone 2",  volume: 24120, spike: 21.6, confidence: "88.4%", risk: "critical" as ZoneStatus },
    { month: "February 2026", zone: "Zone 7",  volume: 17240, spike: 16.8, confidence: "85.1%", risk: "warning"  as ZoneStatus },
    { month: "March 2026",    zone: "Zone 9",  volume: 12840, spike: 14.2, confidence: "82.6%", risk: "warning"  as ZoneStatus },
    { month: "April 2026",    zone: "Zone 17", volume: 13480, spike: 11.4, confidence: "79.3%", risk: "warning"  as ZoneStatus },
  ]

  return (
    <div className="space-y-5">
      <style>{`@keyframes dashMove{to{stroke-dashoffset:-9}}.forecast-line-animated path{animation:dashMove 0.4s linear infinite}`}</style>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Demand Forecasting — Predictive Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tier 2 Machine Learning time-series models · Q4 2025 – Q2 2026</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {models.map(m => (
            <button key={m} onClick={() => setActiveModel(m)}
              className={`text-xs px-3 py-1.5 rounded-md transition-all ${activeModel === m ? "bg-white text-[#0038A8] font-semibold shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Accuracy Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "RMSE", value: curMetrics.rmse, note: `Root Mean Sq Error (${activeModel})`, ok: true },
          { label: "MAPE", value: curMetrics.mape, note: "High prediction accuracy", ok: true },
          { label: "MAE", value: curMetrics.mae, note: "Mean Absolute Error", ok: true },
          { label: "Model Evaluation", value: curMetrics.best, note: curMetrics.note, ok: true },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{s.value}</p>
            <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 size={10} /> {s.note}
            </p>
          </div>
        ))}
      </div>

      {/* Forecast Chart */}
      <ChartCard title="Demand Forecast Chart — Historical (2024–2025) & Predicted (Q4 2025–Q2 2026)">
        <div className="mb-3 flex items-center gap-3 text-xs flex-wrap">
          {[
            { key: "actual",   label: "Historical Demand",       swatch: <span className="w-4 h-0.5 bg-[#0038A8] rounded-full inline-block" /> },
            { key: "forecast", label: "Forecasted Demand",       swatch: <span className="w-4 h-0.5 border-t-2 border-dashed border-[#0284C7] inline-block" /> },
            { key: "ci",       label: "95% CI Band",             swatch: <span className="w-4 h-3 bg-[#0284C7]/10 inline-block rounded border border-[#0284C7]/30" /> },
          ].map(l => (
            <button key={l.key} onClick={() => toggle(l.key)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all hover:bg-slate-100 border ${hidden.has(l.key) ? "opacity-40 border-slate-200" : "border-transparent"}`}>
              {l.swatch}
              <span className={hidden.has(l.key) ? "line-through text-slate-400" : "text-slate-600"}>{l.label}</span>
            </button>
          ))}
          <span className="text-slate-400 ml-auto text-[10px]">Model: {activeModel} · click legend to toggle</span>
        </div>
        <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
          <defs>
            <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284C7" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#0284C7" stopOpacity={0.03} />
            </linearGradient>
          </defs>
        </svg>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={FORECAST_DATA} margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis key="xaxis" dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis key="yaxis" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} domain={[155000, 245000]} />
            <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} fmt={v => `${v.toLocaleString()} m³`} />} />
            <Area key="area-ci-high" type="monotone" dataKey="ci_high" name="CI High" stroke="none" fill={hidden.has("forecast") || hidden.has("ci") ? "transparent" : "url(#ciGrad)"} hide={hidden.has("forecast") || hidden.has("ci")} activeDot={false} />
            <Area key="area-ci-low" type="monotone" dataKey="ci_low"  name="CI Low"  stroke="none" fill="white" hide={hidden.has("forecast") || hidden.has("ci")} activeDot={false} />
            <Line key="line-actual"   type="monotone" dataKey="actual"   name="Historical m³"  stroke="#0038A8" strokeWidth={2.5} dot={{ fill: "#0038A8", r: 3, strokeWidth: 0 }} connectNulls hide={hidden.has("actual")} activeDot={false} />
            <Line key="line-forecast" type="monotone" dataKey="forecast" name="Forecast m³"    stroke="#0284C7" strokeWidth={2}   dot={{ fill: "#0284C7", r: 3, strokeWidth: 0 }} strokeDasharray="6 3" connectNulls hide={hidden.has("forecast")} className="forecast-line-animated" activeDot={false} />
            <ReferenceLine key="refline-origin" x="Sep '25" stroke="#D32F2F" strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: "Forecast Origin", fill: "#D32F2F", fontSize: 9, position: "insideTopLeft" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Spike Predictions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Demand Spike Predictions — Next 3 Months</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {["Target Month","Service Zone","Predicted Volume","% Spike","Confidence","Risk Level"].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-5 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SPIKE_TABLE.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-xs font-medium text-slate-700">{row.month}</td>
                  <td className="px-5 py-3 text-xs font-semibold text-[#0038A8]">{row.zone}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-800">{row.volume.toLocaleString()} m³</td>
                  <td className="px-5 py-3 text-xs font-bold text-red-500">+{row.spike}%</td>
                  <td className="px-5 py-3 font-mono text-xs text-emerald-600">{row.confidence}</td>
                  <td className="px-5 py-3"><StatusBadge status={row.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── SCREEN: SHORTAGE ───────────────────────────────────────────────────────
function ShortageScreen() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Supply & Shortage Monitoring</h1>
        <p className="text-sm text-slate-500 mt-0.5">Production capacity vs. predicted demand · Jan 2025 – Jun 2026</p>
      </div>

      {/* Capacity Banner */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total System Capacity", value: "300,000 m³/mo", sub: "85% sustainable = 255,000 m³", color: "#0038A8", bg: "bg-blue-50 border-blue-200" },
          { label: "Current Sep '25 Demand", value: "193,748 m³",    sub: "76.0% of sustainable capacity", color: "#10B981", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Predicted Dry Season Gap", value: "41,800 m³",   sub: "Across 4 critical months (Feb–May '26)", color: "#D32F2F", bg: "bg-red-50 border-red-200" },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.bg}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{c.label}</p>
            <p className="text-2xl font-bold font-mono" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs text-slate-500 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Status Indicator */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
          <span className="text-sm font-semibold text-slate-700">Current Status:</span>
          <span className="text-sm font-bold text-emerald-600">Within Capacity</span>
        </div>
        <div className="h-5 w-px bg-slate-200" />
        <div className="text-sm text-slate-600">
          <span className="font-semibold">Days to Next Predicted Deficit:</span>
          <span className="font-bold text-amber-600 ml-1">48 Days (Jan 2026)</span>
        </div>
        <div className="h-5 w-px bg-slate-200" />
        <div className="text-sm text-slate-600">
          <span className="font-semibold">Active Shortage Zones:</span>
          <span className="font-bold text-slate-800 ml-1">0 <span className="text-slate-400 font-normal">(Predicted: 3 by Feb '26)</span></span>
        </div>
      </div>

      {/* Supply vs Demand Chart */}
      <ChartCard title="Supply vs Demand Forecast — Jan 2025 to Jun 2026">
        <div className="mb-3 flex items-center gap-5 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#0038A8] inline-block" />Sustainable Supply</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t-2 border-dashed border-[#D32F2F] inline-block" />Predicted Demand</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-3 bg-[#D32F2F]/10 rounded inline-block border border-[#D32F2F]/20" />Shortage Zone</span>
        </div>
        <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
          <defs>
            <linearGradient id="supplyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0038A8" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#0038A8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
        </svg>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={SUPPLY_DEMAND} margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis key="xaxis" dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis key="yaxis" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} domain={[150000, 270000]} />
            <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} fmt={v => `${v.toLocaleString()} m³`} />} />
            <ReferenceArea key="refarea-shortage" x1="Feb '26" x2="Apr '26" fill="#D32F2F" fillOpacity={0.08} label={{ value: "Shortage Zone", fill: "#D32F2F", fontSize: 9 }} />
            <Area key="area-supply" type="monotone" dataKey="supply" name="Sustainable Supply m³" stroke="#0038A8" strokeWidth={2.5} fill="url(#supplyGrad)" activeDot={false} />
            <Line key="line-demand" type="monotone" dataKey="demand" name="Predicted Demand m³"   stroke="#D32F2F" strokeWidth={2}   strokeDasharray="6 3" dot={{ fill: "#D32F2F", r: 2.5, strokeWidth: 0 }} activeDot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Zone shortage forecast */}
      <ChartCard title="Predicted Shortage Severity by Zone — Dry Season 2026">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={[
            { zone: "Zone 1",  gap: 3840 }, { zone: "Zone 2",  gap: 4120 }, { zone: "Zone 15", gap: 3280 },
            { zone: "Zone 7",  gap: 2640 }, { zone: "Zone 17", gap: 1980 }, { zone: "Zone 9",  gap: 1620 },
          ]} margin={{ left: 4, right: 8 }}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis key="xaxis" dataKey="zone" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
            <YAxis key="yaxis" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
            <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} fmt={v => `${v.toLocaleString()} m³`} />} />
            <Bar key="bar-gap" dataKey="gap" name="Projected Deficit m³" fill="#D32F2F" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

// ── WEATHER: live data hook ────────────────────────────────────────────────
interface LiveCurrent {
  temperature: number; heatIndex: number; humidity: number;
  windSpeedKph: number; windDirection: string; rainfallToday: number;
  visibilityKm: number; pressureHpa: number; condition: string;
  icon: string; fetchedAt: string;
}
interface LiveForecast {
  day: string; date: string; icon: string; condition: string;
  low: number; high: number; precipPct: number; rainMm: number;
}

function useWeatherData() {
  const [current, setCurrent] = useState<LiveCurrent | null>(null)
  const [forecast, setForecast] = useState<LiveForecast[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = async () => {
    try {
      const [cRes, fRes] = await Promise.all([
        fetch('/api/v1/weather/current'),
        fetch('/api/v1/weather/forecast'),
      ])
      if (!cRes.ok || !fRes.ok) throw new Error('API error')
      const [cJson, fJson] = await Promise.all([cRes.json(), fRes.json()])
      setCurrent(cJson.data)
      setForecast(fJson.data)
      setLastRefresh(new Date())
      setError(null)
    } catch {
      setError('Could not reach weather service — showing last known data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 15 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  return { current, forecast, loading, error, lastRefresh, refresh: load }
}

// ─── demand-impact calculator ─────────────────────────────────────────────────
// Linear model: baseline 6 400 m³/day; +192 m³ per °C above 28°C; -85 m³ per 10 mm rain
function calcDemandDelta(tempC: number, rainMm: number): number {
  const tempDelta = Math.max(0, tempC - 28) * 192
  const rainDelta = -(rainMm / 10) * 85
  return Math.round(tempDelta + rainDelta)
}

// ── SCREEN: WEATHER ────────────────────────────────────────────────────────
function WeatherScreen() {
  const { current, forecast, loading, error, lastRefresh, refresh } = useWeatherData()
  const [selectedDay, setSelectedDay] = useState<number>(0)

  const WeatherIcon = ({ icon, size = 20 }: { icon: string; size?: number }) => {
    const map: Record<string, ReactNode> = {
      'sun':           <Sun size={size} className="text-amber-400" />,
      'partly-cloudy': <div className="relative inline-flex"><Sun size={size} className="text-amber-400" /><Cloud size={Math.round(size * 0.7)} className="text-slate-300 absolute -bottom-1 -right-1" /></div>,
      'cloud':         <Cloud size={size} className="text-slate-400" />,
      'rain':          <CloudRain size={size} className="text-blue-400" />,
      'storm':         <CloudLightning size={size} className="text-purple-500" />,
    }
    return <>{map[icon] ?? <Sun size={size} className="text-amber-400" />}</>
  }

  // Fallback to static data while loading
  const cur = current ?? {
    temperature: 33, heatIndex: 38, humidity: 78,
    windSpeedKph: 18, windDirection: 'NE', rainfallToday: 0,
    visibilityKm: 9.4, pressureHpa: 1010,
    condition: 'Partly Cloudy · Tabaco City', icon: 'partly-cloudy', fetchedAt: '',
  }
  const days = forecast.length > 0 ? forecast : WEATHER_FORECAST.map(d => ({
    day: d.day, date: d.date, icon: d.icon, condition: '', low: d.low, high: d.high, precipPct: d.precip, rainMm: 0,
  }))

  const selDay   = days[selectedDay]
  const demandΔ  = selDay ? calcDemandDelta(selDay.high, selDay.rainMm) : 0
  const adjDemand = 6400 + demandΔ

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Weather &amp; Climate Correlation</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
              <p className="text-sm text-slate-500">PAGASA Legazpi/Tabaco Doppler · Station ID: PTAS-08 · Live</p>
            </span>
            {lastRefresh && (
              <span className="text-[10px] text-slate-400">
                · Updated {lastRefresh.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => { void refresh() }}
              className="ml-1 text-[10px] text-[#0038A8] hover:underline flex items-center gap-0.5"
              title="Force refresh weather data"
            >
              <RefreshCw size={10} />
              Refresh
            </button>
          </div>
          {error && <p className="text-[11px] text-amber-600 mt-0.5">{error}</p>}
        </div>
        {loading && (
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <RefreshCw size={12} className="animate-spin" />
            Fetching live data…
          </div>
        )}
      </div>

      {/* Current Weather Banner */}
      <div className="bg-gradient-to-r from-[#0038A8] to-[#0284C7] rounded-xl p-5 text-white relative overflow-hidden">
        {/* subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(255,255,255,0.07),transparent_60%)]" />
        <div className="relative flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <WeatherIcon icon={cur.icon} size={52} />
              {loading && <RefreshCw size={10} className="absolute -top-1 -right-1 animate-spin text-white/60" />}
            </div>
            <div>
              <p className="text-4xl font-bold font-mono tracking-tight">{cur.temperature}°C</p>
              <p className="text-blue-100 text-sm mt-0.5">{cur.condition}</p>
            </div>
          </div>
          <div className="h-16 w-px bg-white/20" />
          <div className="grid grid-cols-3 gap-x-8 gap-y-3 text-sm">
            <div>
              <p className="text-blue-200/70 text-xs uppercase tracking-wide mb-0.5">Heat Index</p>
              <p className="font-semibold">{cur.heatIndex}°C</p>
            </div>
            <div>
              <p className="text-blue-200/70 text-xs uppercase tracking-wide mb-0.5">Humidity</p>
              <p className="font-semibold">{cur.humidity}%</p>
            </div>
            <div>
              <p className="text-blue-200/70 text-xs uppercase tracking-wide mb-0.5">Wind</p>
              <p className="font-semibold">{cur.windSpeedKph} kph {cur.windDirection}</p>
            </div>
            <div>
              <p className="text-blue-200/70 text-xs uppercase tracking-wide mb-0.5">Rainfall Today</p>
              <p className="font-semibold">{cur.rainfallToday} mm</p>
            </div>
            <div>
              <p className="text-blue-200/70 text-xs uppercase tracking-wide mb-0.5">Visibility</p>
              <p className="font-semibold">{cur.visibilityKm} km</p>
            </div>
            <div>
              <p className="text-blue-200/70 text-xs uppercase tracking-wide mb-0.5">Pressure</p>
              <p className="font-semibold">{cur.pressureHpa} hPa</p>
            </div>
          </div>
          {/* ML demand badge driven by live current data */}
          <div className="ml-auto text-right">
            <p className="text-blue-200/70 text-[10px] uppercase tracking-wide mb-1">LSTM Demand Adjust</p>
            <p className={`font-mono font-bold text-lg ${calcDemandDelta(cur.temperature, cur.rainfallToday) >= 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {calcDemandDelta(cur.temperature, cur.rainfallToday) >= 0 ? '+' : ''}{calcDemandDelta(cur.temperature, cur.rainfallToday).toLocaleString()} m³/day
            </p>
            <p className="text-blue-100/60 text-[10px]">vs. 28°C baseline · X<sub>t</sub> injected</p>
          </div>
        </div>
      </div>

      {/* 10-Day Forecast */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">10-Day Forecast — Tabaco City, Albay</h3>
          <p className="text-[10px] text-slate-400">Click a day to see weather-adjusted demand projection</p>
        </div>
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}
        >
          {days.map((d, i) => (
            <motion.div
              key={i}
              onClick={() => setSelectedDay(i)}
              whileHover={{ y: -2, boxShadow: '0 4px 12px -2px rgba(0,0,0,0.08)' }}
              transition={{ duration: 0.15 }}
              style={{ scrollSnapAlign: 'start' }}
              className={`flex-shrink-0 w-[88px] flex flex-col items-center p-3 rounded-xl text-center cursor-pointer border transition-all ${
                selectedDay === i
                  ? 'bg-[#0038A8] border-[#0038A8] shadow-md shadow-blue-200'
                  : i === 0
                  ? 'bg-[#0038A8]/6 border-[#0038A8]/15 hover:bg-slate-50 hover:border-slate-200'
                  : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <p className={`text-[11px] font-bold ${selectedDay === i ? 'text-white' : 'text-slate-700'}`}>{d.day}</p>
              <p className={`text-[9px] mb-2 ${selectedDay === i ? 'text-blue-200' : 'text-slate-400'}`}>{d.date}</p>
              <WeatherIcon icon={d.icon} size={24} />
              <div className="mt-2 w-full">
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-1" style={{ background: selectedDay === i ? 'rgba(255,255,255,0.2)' : '' }}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-300 to-orange-400"
                    style={{ width: `${Math.min(100, ((d.high - 24) / 14) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className={selectedDay === i ? 'text-blue-200' : 'text-slate-400'}>{d.low}°</span>
                  <span className={`font-bold ${selectedDay === i ? 'text-white' : 'text-slate-800'}`}>{d.high}°</span>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-0.5">
                <Droplets size={9} className={selectedDay === i ? 'text-blue-200' : 'text-blue-400'} />
                <p className={`text-[9px] font-semibold ${selectedDay === i ? 'text-blue-100' : 'text-blue-500'}`}>{d.precipPct}%</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Selected-day demand projection banner */}
        {selDay && (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 flex items-center gap-6 text-xs"
            >
              <div className="flex items-center gap-2 text-slate-700">
                <WeatherIcon icon={selDay.icon} size={16} />
                <span className="font-semibold">{selDay.day}, {selDay.date}</span>
                <span className="text-slate-400">{selDay.condition || 'Forecast'}</span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="text-slate-600">High <span className="font-bold text-slate-800">{selDay.high}°C</span> · Low <span className="font-bold text-slate-800">{selDay.low}°C</span></div>
              <div className="text-slate-600">Rain <span className="font-bold text-blue-600">{selDay.rainMm} mm</span> ({selDay.precipPct}% chance)</div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="text-slate-600">
                LSTM Adjusted Demand:&nbsp;
                <span className="font-mono font-bold text-slate-800">{adjDemand.toLocaleString()} m³/day</span>
              </div>
              <div className={`ml-auto flex items-center gap-1 font-semibold ${demandΔ >= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {demandΔ >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {demandΔ >= 0 ? '+' : ''}{demandΔ.toLocaleString()} m³
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Correlation Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Scatter: Temp vs Demand */}
        <ChartCard title="Temperature vs. Daily Water Demand (2017–2025)">
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart syncId="weather-sync" margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis key="xaxis" dataKey="temp" name="Temperature" unit="°C"
                tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -4, fontSize: 10, fill: '#94A3B8' }} />
              <YAxis key="yaxis" dataKey="demand" name="Demand"
                tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <RTooltip key="tooltip" content={(p: any) => {
                if (!p.active || !p.payload?.length) return null
                const d = p.payload[0].payload
                return (
                  <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-lg p-2.5 shadow-lg text-xs">
                    <p className="text-slate-500">Temp: <span className="font-bold text-slate-800">{d.temp}°C</span></p>
                    <p className="text-slate-500">Demand: <span className="font-bold text-slate-800">{d.demand.toLocaleString()} m³/day</span></p>
                  </div>
                )
              }} />
              <Scatter key="scatter-temp" name="Temp vs Demand" data={TEMP_DEMAND} fill="#0038A8" opacity={0.7} />
              {/* Live current point */}
              {current && (
                <Scatter key="scatter-live" name="Current Live" data={[{ temp: current.temperature, demand: adjDemand }]} fill="#EF4444" r={6} />
              )}
              <ReferenceLine key="refline-r" stroke="#D32F2F" strokeDasharray="4 3"
                segment={[{ x: 25, y: 5200 }, { x: 36, y: 10600 }]} strokeWidth={1.5}
                label={{ value: 'r² = 0.72', fill: '#D32F2F', fontSize: 9, position: 'insideTopRight' }} />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-400 mt-1">● Live reading plotted in red · Regression: D = 192T − 1,576 (R² = 0.72)</p>
        </ChartCard>

        {/* Dual-axis: Rainfall vs NRW */}
        <ChartCard title="Rainfall vs. NRW Seasonal Pattern">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart syncId="weather-sync" data={[
              { month: 'Oct', rainfall: 180, nrw: 27.4 }, { month: 'Nov', rainfall: 220, nrw: 28.1 },
              { month: 'Dec', rainfall: 160, nrw: 27.8 }, { month: 'Jan', rainfall: 40,  nrw: 26.4 },
              { month: 'Feb', rainfall: 20,  nrw: 25.8 }, { month: 'Mar', rainfall: 15,  nrw: 26.2 },
              { month: 'Apr', rainfall: 12,  nrw: 27.0 }, { month: 'May', rainfall: 85,  nrw: 27.6 },
              { month: 'Jun', rainfall: 148, nrw: 28.2 }, { month: 'Jul', rainfall: 195, nrw: 28.8 },
              { month: 'Aug', rainfall: current ? Math.round(current.rainfallToday * 30) || 210 : 210, nrw: 29.1 },
              { month: 'Sep', rainfall: 175, nrw: 28.0 },
            ]} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis key="xaxis" dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis key="yaxis-rain" yAxisId="rain" orientation="left"
                tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis key="yaxis-nrw"  yAxisId="nrw"  orientation="right" domain={[24, 30]}
                tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} />} />
              <Legend key="legend" wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              <Bar key="bar-rainfall" yAxisId="rain" dataKey="rainfall" name="Rainfall mm" fill="#93C5FD" radius={[3, 3, 0, 0]} maxBarSize={24} />
              <Line key="line-nrw" yAxisId="nrw" type="monotone" dataKey="nrw" name="NRW %" stroke="#F59E0B" strokeWidth={2}
                dot={{ fill: '#F59E0B', r: 2.5, strokeWidth: 0 }} activeDot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-400 mt-1">Aug bar adjusted from live rainfall telemetry · Dual-axis: mm (L) · % (R)</p>
        </ChartCard>
      </div>

      {/* Typhoon Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Historical Typhoon &amp; Extreme Weather Events — Albay Province</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {['Event Name', 'Date', 'Peak Rainfall', 'Category', 'Recovery Time', 'Estimated NRW Loss'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-5 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {TYPHOON_LOG.map((t, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-xs font-semibold text-slate-800">{t.name}</td>
                <td className="px-5 py-3 text-xs text-slate-600">{t.date}</td>
                <td className="px-5 py-3 font-mono text-xs text-blue-600 font-semibold">{t.rainfall}</td>
                <td className="px-5 py-3"><span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold px-1.5 py-0.5 rounded">{t.category}</span></td>
                <td className="px-5 py-3 font-mono text-xs text-amber-600">{t.recovery}</td>
                <td className="px-5 py-3 font-mono text-xs text-slate-700">{t.loss}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── SCREEN: NRW MAP ────────────────────────────────────────────────────────
function NRWScreen() {
  const [hoveredZone, setHoveredZone] = useState<number | null>(null)
  const [selectedNRWZone, setSelectedNRWZone] = useState<number | null>(null)
  const sortedByNRW = [...ZONES].sort((a, b) => b.nrw - a.nrw)

  const nrwColor = (nrw: number) => {
    if (nrw > 20) return { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", fill: "#EF4444" }
    if (nrw > 15) return { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", fill: "#F59E0B" }
    return              { bg: "#F0FDF4", border: "#BBF7D0", text: "#16A34A", fill: "#10B981" }
  }

  const ZONE_GRID = [
    [1,2,3,4,5], [6,7,8,9,10], [11,12,13,14,15], [16,17,18,19,20]
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">NRW Hotspot Map — Non-Revenue Water Analysis</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tabaco City 20-Zone Grid · Sep 2025 · LWUA Benchmark: ≤20%</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {[{ label: "Healthy <15%", color: "#10B981" }, { label: "Moderate 15–20%", color: "#F59E0B" }, { label: "Critical >20%", color: "#EF4444" }].map(l => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
        {/* Zone Grid Map */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Zone Choropleth Grid — Tabaco City</h3>
            <span className="text-[10px] text-slate-400">System avg: 28.0% NRW</span>
          </div>

          {/* Floating tooltip */}
          <AnimatePresence>
            {hoveredZone !== null && (() => {
              const z = ZONES.find(z => z.id === hoveredZone)!
              const c = nrwColor(z.nrw)
              const nrwLoss = Math.round(z.consumption * z.nrw / (100 - z.nrw))
              return (
                <motion.div
                  key={hoveredZone}
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.14 }}
                  className="absolute top-4 right-4 w-52 bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-3.5 shadow-xl z-50 pointer-events-none"
                >
                  <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-100">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.fill }} />
                    <p className="text-xs font-bold text-slate-900">Zone {z.id} · {z.name}</p>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    {[
                      { label: "NRW Rate",    val: `${z.nrw}%`,                           hi: z.nrw > 20 },
                      { label: "Volume",      val: `${(z.consumption/1000).toFixed(1)}k m³`, hi: false },
                      { label: "NRW Loss",    val: `${(nrwLoss/1000).toFixed(1)}k m³`,    hi: true  },
                      { label: "Accounts",    val: z.accounts.toLocaleString(),            hi: false },
                      { label: "Population",  val: z.population.toLocaleString(),          hi: false },
                    ].map(r => (
                      <div key={r.label} className="flex items-center justify-between">
                        <span className="text-slate-500">{r.label}</span>
                        <span className={`font-mono font-semibold ${r.hi ? (z.nrw > 20 ? "text-red-500" : "text-amber-500") : "text-slate-800"}`}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )
            })()}
          </AnimatePresence>

          <div className="space-y-2">
            {ZONE_GRID.map((row, ri) => (
              <div key={ri} className="grid grid-cols-5 gap-2">
                {row.map(zid => {
                  const z = ZONES.find(z => z.id === zid)!
                  const c = nrwColor(z.nrw)
                  return (
                    <motion.div key={zid}
                      whileHover={{ scale: 1.04, zIndex: 10 }}
                      onHoverStart={() => setHoveredZone(zid)}
                      onHoverEnd={() => setHoveredZone(null)}
                      onClick={() => setSelectedNRWZone(prev => prev === zid ? null : zid)}
                      className="relative cursor-pointer rounded-xl p-3 border-2 transition-all"
                      style={{
                        background: c.bg,
                        borderColor: selectedNRWZone === zid ? c.fill : hoveredZone === zid ? c.fill : c.border,
                        boxShadow: selectedNRWZone === zid ? `0 0 0 2px ${c.fill}33` : undefined,
                      }}
                    >
                      <p className="text-[10px] font-bold text-slate-600">Z{String(zid).padStart(2,"0")}</p>
                      <p className="text-lg font-bold font-mono mt-0.5" style={{ color: c.text }}>{z.nrw}%</p>
                      <p className="text-[9px] text-slate-500 truncate mt-0.5">{z.name}</p>
                      {z.nrw > 20 && (
                        <motion.span animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2, repeat: Infinity }}
                          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </motion.div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Zone Rankings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Zone NRW Ranking</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[440px] overflow-y-auto">
            {sortedByNRW.map((z, i) => {
              const c = nrwColor(z.nrw)
              return (
                <div key={z.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-bold text-slate-400 w-5 flex-shrink-0">#{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-slate-800">Zone {z.id} · {z.name}</p>
                      <span className="font-mono text-xs font-bold" style={{ color: c.text }}>{z.nrw}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(z.nrw / 35) * 100}%`, background: c.fill }} />
                    </div>
                  </div>
                  <MiniSparkline data={z.trend} color={c.fill} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Discrepancy Chart */}
      <ChartCard title="Total Production vs. Billed Consumption by Service Zone">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={ZONES.map(z => ({
            zone: `Z${z.id}`,
            production: Math.round(z.consumption / (1 - z.nrw / 100)),
            billed: z.consumption,
          }))} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis key="xaxis" dataKey="zone" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis key="yaxis" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} fmt={v => `${v.toLocaleString()} m³`} />} />
            <Legend key="legend" wrapperStyle={{ fontSize: 11 }} />
            <Bar key="bar-production" dataKey="production" name="Production m³" fill="#0038A8" radius={[3, 3, 0, 0]} maxBarSize={22} opacity={0.8} />
            <Bar key="bar-billed" dataKey="billed"     name="Billed m³"     fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Zone Detail Slide-Over Drawer */}
      <AnimatePresence>
        {selectedNRWZone !== null && (() => {
          const z = ZONES.find(z => z.id === selectedNRWZone)!
          const c = nrwColor(z.nrw)
          const nrwLoss = Math.round(z.consumption * z.nrw / (100 - z.nrw))
          return (
            <motion.div
              key={selectedNRWZone}
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="fixed right-0 bottom-0 w-80 bg-white border-l border-slate-200 shadow-2xl z-40 overflow-y-auto"
              style={{ top: "3.5rem" }}
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <p className="text-sm font-bold text-slate-900">Zone {z.id} · {z.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{z.accounts.toLocaleString()} accounts · Pop. {z.population.toLocaleString()}</p>
                </div>
                <button onClick={() => setSelectedNRWZone(null)}
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 w-7 h-7 rounded-lg flex items-center justify-center text-base transition-colors">
                  ×
                </button>
              </div>
              <div className="p-5 space-y-5">
                <div className="rounded-xl p-4 text-center border" style={{ background: c.bg, borderColor: c.border }}>
                  <p className="text-4xl font-bold font-mono leading-none" style={{ color: c.text }}>{z.nrw}%</p>
                  <p className="text-[11px] mt-1.5 mb-2" style={{ color: c.text }}>NRW Rate · LWUA Target ≤20%</p>
                  <StatusBadge status={z.status} />
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Billed Volume",  value: `${z.consumption.toLocaleString()} m³`, hi: false },
                    { label: "NRW Loss Vol.",   value: `${nrwLoss.toLocaleString()} m³`,       hi: z.nrw > 20 },
                    { label: "Est. Revenue Loss", value: `₱${Math.round(nrwLoss * 24).toLocaleString()}/mo`, hi: z.nrw > 20 },
                    { label: "Active Accounts", value: z.accounts.toLocaleString(),             hi: false },
                    { label: "Population",      value: z.population.toLocaleString(),           hi: false },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-500">{r.label}</span>
                      <span className={`font-mono text-xs font-bold ${r.hi ? "text-red-500" : "text-slate-800"}`}>{r.value}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">6-Month Consumption Trend</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={z.trend.map((v, i) => ({ month: ["Apr","May","Jun","Jul","Aug","Sep"][i], v }))}>
                      <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis key="xaxis" dataKey="month" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis key="yaxis" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={28} />
                      <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} fmt={v => `${v.toLocaleString()} m³`} />} />
                      <Area key="area-trend" type="monotone" dataKey="v" name="Consumption m³" stroke={c.fill} strokeWidth={2} fill={c.fill} fillOpacity={0.12} dot={{ fill: c.fill, r: 3, strokeWidth: 0 }} activeDot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

// ── SCREEN: ZONES ──────────────────────────────────────────────────────────
function ZonesScreen() {
  const [selectedZone, setSelectedZone] = useState<typeof ZONES[0] | null>(null)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Service Zone Analysis</h1>
        <p className="text-sm text-slate-500 mt-0.5">Granular consumption profiling · 20 service zones · Sep 2025</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {ZONES.map(z => (
          <motion.div key={z.id}
            whileHover={{ y: -3, boxShadow: "0 8px 20px -4px rgba(0,0,0,0.10)" }}
            transition={{ duration: 0.18 }}
            onClick={() => setSelectedZone(z)}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-[#0038A8]/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Zone {String(z.id).padStart(2,"0")}</span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5 leading-tight">{z.name}</p>
              </div>
              <StatusBadge status={z.status} />
            </div>
            <p className="text-lg font-bold font-mono text-slate-900">{(z.consumption/1000).toFixed(1)}k <span className="text-xs font-normal text-slate-400">m³</span></p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500">{z.accounts.toLocaleString()} accounts</p>
                <p className="text-[10px] text-slate-400">NRW: <span className={z.nrw > 20 ? "text-red-500 font-semibold" : z.nrw > 15 ? "text-amber-500" : "text-emerald-500"}>{z.nrw}%</span></p>
              </div>
              <MiniSparkline data={z.trend} color={z.status === "critical" ? "#EF4444" : z.status === "warning" ? "#F59E0B" : "#10B981"} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Zone drill-down panel */}
      {selectedZone && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-[#0038A8]/20 shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#0038A8]/3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Zone {selectedZone.id} — {selectedZone.name} · Drill-Down</h3>
              <p className="text-xs text-slate-500 mt-0.5">{selectedZone.accounts.toLocaleString()} connections · Pop. {selectedZone.population.toLocaleString()}</p>
            </div>
            <button onClick={() => setSelectedZone(null)} className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
              Close ×
            </button>
          </div>
          <div className="p-6 grid grid-cols-3 gap-5">
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">6-Month Consumption Trend</p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={selectedZone.trend.map((v, i) => ({ month: ["Apr","May","Jun","Jul","Aug","Sep"][i], v }))}>
                  <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis key="xaxis" dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis key="yaxis" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} fmt={v => `${v.toLocaleString()} m³`} />} />
                  <Area key="area-trend" type="monotone" dataKey="v" name="Consumption m³" stroke="#0038A8" strokeWidth={2} fill="#0038A8" fillOpacity={0.1} dot={{ fill: "#0038A8", r: 3, strokeWidth: 0 }} activeDot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {[
                { label: "Monthly Volume", value: `${selectedZone.consumption.toLocaleString()} m³`, hi: false },
                { label: "NRW Rate",       value: `${selectedZone.nrw}%`,                          hi: selectedZone.nrw > 20 },
                { label: "Active Accounts",value: selectedZone.accounts.toLocaleString(),           hi: false },
                { label: "Population",     value: selectedZone.population.toLocaleString(),         hi: false },
                { label: "Status",         value: selectedZone.status.toUpperCase(),                hi: selectedZone.status === "critical" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500">{s.label}</span>
                  <span className={`font-mono text-xs font-semibold ${s.hi ? "text-red-500" : "text-slate-800"}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ── SCREEN: OPTIMIZATION ───────────────────────────────────────────────────
function OptimizationScreen() {
  const stations = ["Main Pump Station", "Booster Station A", "Booster Station B"]
  const costPerOptHour = PUMP_SCHEDULE.map(p => p.costOptimized / p.optimized)
  const [editedHours, setEditedHours] = useState(() => PUMP_SCHEDULE.map(p => p.optimized))
  const [recalculating, setRecalculating] = useState(false)

  const computedRows = PUMP_SCHEDULE.map((p, i) => {
    const newOptCost = Math.round(editedHours[i] * costPerOptHour[i])
    const savings = parseFloat(((p.costCurrent - newOptCost) / p.costCurrent * 100).toFixed(1))
    const delta = parseFloat((editedHours[i] - p.current).toFixed(1))
    return { ...p, editedOptimized: editedHours[i], newOptCost, computedSavings: savings, computedDelta: delta }
  })

  const stationComputedData = stations.map(s =>
    computedRows.map((r, i) => ({ ...r, globalIdx: i })).filter(r => r.station === s)
  )

  const totalCurrentCost = PUMP_SCHEDULE.reduce((sum, p) => sum + p.costCurrent, 0)
  const totalOptCostEdited = computedRows.reduce((sum, r) => sum + r.newOptCost, 0)
  const saving = totalCurrentCost - totalOptCostEdited

  const handleHoursChange = (idx: number, val: string) => {
    const n = parseFloat(val)
    if (isNaN(n) || n < 0 || n > 6) return
    setEditedHours(prev => { const next = [...prev]; next[idx] = n; return next })
    setRecalculating(true)
    setTimeout(() => setRecalculating(false), 300)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Prescriptive Optimization</h1>
        <p className="text-sm text-slate-500 mt-0.5">LP Model Output · Optimized pump scheduling & water allocation · October 2025</p>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0038A8]/8 to-[#0284C7]/5 border border-[#0038A8]/15 rounded-xl p-4 flex items-center gap-6">
        <Cpu size={32} className="text-[#0038A8] flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">LP Model Active — Optimized pump scheduling and water allocation based on forecasted demand</p>
          <p className="text-xs text-slate-500 mt-0.5">Objective: Minimize Total Power Operating Cost (PHP) · Constraints: Demand coverage ≥ 95%, Pressure zone compliance</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-500">Total Monthly Savings</p>
          <p className="text-xl font-bold font-mono text-emerald-600">₱{saving.toLocaleString()}</p>
          <p className="text-xs text-emerald-500">-{((saving/totalCurrentCost)*100).toFixed(1)}% energy expenditure</p>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Current Monthly Cost</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">₱{totalCurrentCost.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">All 3 pump stations</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Optimized Monthly Cost</p>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">₱{totalOptCostEdited.toLocaleString()}</p>
          <p className="text-xs text-emerald-500 mt-1">Post-optimization projection</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-[#0038A8] uppercase tracking-wide">Monthly Savings</p>
          <p className="text-2xl font-bold font-mono text-[#0038A8] mt-1">₱{saving.toLocaleString()}</p>
          <p className="text-xs text-blue-400 mt-1">-{((saving/totalCurrentCost)*100).toFixed(1)}% reduction</p>
        </div>
      </div>

      {/* Pump Schedule Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Recommended Pump Schedule — October 2025 <span className="font-normal text-slate-400 text-xs">(edit Optimized Hrs to recalculate)</span></h3>
          <AnimatePresence>
            {recalculating && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 text-[10px] font-semibold text-[#0038A8] bg-[#0038A8]/8 px-2.5 py-1 rounded-full border border-[#0038A8]/15"
              >
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }} className="inline-block">
                  <RefreshCw size={10} />
                </motion.span>
                Recalculating…
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {["Station","Time Block","Current Hrs","Optimized Hrs","Δ Variance","Current Cost","Optimized Cost","Savings %"].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stationComputedData.map((rows, si) => (
                rows.map((r, ri) => (
                  <tr key={`${si}-${ri}`} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${ri === 0 ? "border-t-2 border-t-slate-100" : ""}`}>
                    {ri === 0 && <td rowSpan={4} className="px-4 py-3 text-xs font-semibold text-slate-700 border-r border-slate-100 align-middle">{r.station}</td>}
                    <td className="px-4 py-2.5 text-xs text-slate-600">{r.block}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{r.current}h</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number" min="0" max="6" step="0.1"
                        value={r.editedOptimized}
                        onChange={e => handleHoursChange(r.globalIdx, e.target.value)}
                        className="w-16 font-mono text-xs font-semibold text-[#0038A8] border border-[#0038A8]/25 rounded-md px-2 py-1 bg-[#0038A8]/5 focus:outline-none focus:ring-2 focus:ring-[#0038A8]/20 focus:border-[#0038A8]/50 transition-all"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        r.computedDelta > 0 ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : r.computedDelta < 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {r.computedDelta > 0 ? `+${r.computedDelta}h ↑` : r.computedDelta < 0 ? `${r.computedDelta}h ↓` : "0h"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">₱{r.costCurrent.toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-emerald-700">₱{r.newOptCost.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        r.computedSavings > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                       : "bg-red-50 text-red-500 border-red-200"
                      }`}>
                        {r.computedSavings > 0 ? `−${r.computedSavings}% Savings` : `+${Math.abs(r.computedSavings)}%`}
                      </span>
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Criteria Decision Analysis (MCDA - TOPSIS) Zone Prioritization */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Multi-Criteria Decision Analysis (MCDA) — Zone Intervention Priority</h3>
            <p className="text-xs text-slate-500 mt-0.5">TOPSIS Mathematical Model · Evaluates NRW (30%), Deficit (25%), Population (15%), Pipe Age (15%), Revenue Loss (15%)</p>
          </div>
          <span className="text-[11px] font-semibold text-[#0038A8] bg-[#0038A8]/8 px-2.5 py-1 rounded-md border border-[#0038A8]/15">
            MCDA Engine: TOPSIS Vector Normalization
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {["Rank", "Service Zone", "MCDA Score", "Priority Level", "Recommended Engineering Action", "Est. Monthly Recovery"].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { rank: "#1", zone: "Zone 2 · Panal / Poblacion", score: "0.8420", priority: "CRITICAL", action: "Immediate Pipe Replacement & Sector Pressure Step-down", recovery: "2,678 m³", color: "text-red-600 bg-red-50 border-red-200" },
                { rank: "#2", zone: "Zone 1 · Tabaco Center",     score: "0.7810", priority: "CRITICAL", action: "Immediate Pipe Replacement & Sector Pressure Step-down", recovery: "2,496 m³", color: "text-red-600 bg-red-50 border-red-200" },
                { rank: "#3", zone: "Zone 15 · Sto. Cristo",      score: "0.6890", priority: "HIGH",     action: "Active Leak Detection Sweep & DMA Flow Meter Calibration", recovery: "2,132 m³", color: "text-amber-600 bg-amber-50 border-amber-200" },
                { rank: "#4", zone: "Zone 7 · Sagrada",           score: "0.5420", priority: "HIGH",     action: "Active Leak Detection Sweep & DMA Flow Meter Calibration", recovery: "1,716 m³", color: "text-amber-600 bg-amber-50 border-amber-200" },
                { rank: "#5", zone: "Zone 20 · Fatima",           score: "0.4180", priority: "MEDIUM",   action: "Routine Preventative Maintenance & AMR Meter Verification", recovery: "1,417 m³", color: "text-blue-600 bg-blue-50 border-blue-200" },
                { rank: "#6", zone: "Zone 3 · Magallanes",        score: "0.2640", priority: "LOW",      action: "Routine Preventative Maintenance & AMR Meter Verification", recovery: "923 m³", color: "text-slate-600 bg-slate-100 border-slate-200" },
              ].map(row => (
                <tr key={row.rank} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-xs text-slate-800">{row.rank}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-[#0038A8]">{row.zone}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">{row.score}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${row.color}`}>{row.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">{row.action}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-600">+{row.recovery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FP-Growth Frequent Pattern Association Rules */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">FP-Growth Association Rule Mining — Incident Correlation</h3>
            <p className="text-xs text-slate-500 mt-0.5">Frequent Pattern Tree Algorithm · Discovering joint network failure and pressure anomaly rules</p>
          </div>
          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
            Min Support: 20% · Min Confidence: 60%
          </span>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              id: "FP-01",
              antecedents: ["Heat Index > 38°C", "Peak Midday Hour (12PM-2PM)"],
              consequents: ["Demand Spike > +25%", "Booster Station A Pressure Drop"],
              metrics: { support: "42%", confidence: "88%", lift: "2.10x" },
              insight: "Elevated thermal heat index during peak midday hours reliably triggers suction pressure drops at Booster Station A."
            },
            {
              id: "FP-02",
              antecedents: ["Rainfall > 80 mm / 24h", "Habagat Season Wet Peak"],
              consequents: ["Turbidity Spike", "Unbilled Storm Infiltration NRW"],
              metrics: { support: "35%", confidence: "82%", lift: "2.34x" },
              insight: "Intense tropical rainfall correlates with main pipeline storm infiltration in low-elevation sector 15-C."
            },
            {
              id: "FP-03",
              antecedents: ["Minimum Night Flow > 180%", "Off-Peak Tariff Window"],
              consequents: ["Hidden Trunk Line Burst", "Zone NRW > 25%"],
              metrics: { support: "28%", confidence: "79%", lift: "2.82x" },
              insight: "Excess night flow between 1AM-4AM indicates active undetected trunk pipe bursts in Zone 2 and Zone 15."
            },
            {
              id: "FP-04",
              antecedents: ["Pump Efficiency < 75%", "Operating Hours > 22h / day"],
              consequents: ["Specific Energy > 0.55 kWh/m³", "Thermodynamic Overheat"],
              metrics: { support: "24%", confidence: "74%", lift: "1.95x" },
              insight: "Overworked booster pumps demonstrate accelerated thermodynamic degradation during continuous pumping."
            }
          ].map(rule => (
            <div key={rule.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-[#0038A8] bg-[#0038A8]/10 px-2 py-0.5 rounded">{rule.id}</span>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600">
                  <span>Sup: <strong>{rule.metrics.support}</strong></span>
                  <span>Conf: <strong>{rule.metrics.confidence}</strong></span>
                  <span className="text-purple-600 font-bold">Lift: {rule.metrics.lift}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs mb-2">
                <div className="flex flex-wrap gap-1">
                  {rule.antecedents.map((a, i) => (
                    <span key={i} className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px]">{a}</span>
                  ))}
                </div>
                <span className="text-slate-400 font-bold">➔</span>
                <div className="flex flex-wrap gap-1">
                  {rule.consequents.map((c, i) => (
                    <span key={i} className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">{c}</span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-2 italic border-t border-slate-100 pt-2">{rule.insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Directives */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Actionable Operational Directives</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {ALLOC_DIRECTIVES.map((d, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${d.priority === "high" ? "bg-[#0038A8]" : d.priority === "medium" ? "bg-amber-400" : "bg-slate-300"}`} />
              <p className="flex-1 text-xs text-slate-700">{d.title}</p>
              <span className="font-mono text-xs font-bold text-emerald-600 flex-shrink-0">{d.saving}</span>
              <button className="text-[10px] font-semibold text-[#0038A8] border border-[#0038A8]/20 bg-[#0038A8]/5 px-2.5 py-1 rounded hover:bg-[#0038A8]/10 transition-colors flex-shrink-0">
                Apply
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── SCREEN: ALERTS ─────────────────────────────────────────────────────────
function AlertsScreen() {
  const [activeTab, setActiveTab] = useState("all")
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const tabs = [
    { id: "all",      label: "All Alerts",         count: 8 },
    { id: "shortage", label: "Critical Shortages",  count: 2 },
    { id: "nrw",      label: "NRW Outliers",        count: 3 },
    { id: "pump",     label: "Pump Maintenance",    count: 2 },
    { id: "info",     label: "Info",                count: 1 },
  ]
  const allFiltered = activeTab === "all" ? ALERTS_DATA : ALERTS_DATA.filter(a => a.category === activeTab)
  const filtered = allFiltered.filter(a => !dismissed.has(a.id))

  const severityBorderColor = { critical: "#D32F2F", warning: "#F59E0B", info: "#0038A8" } as const
  const SevIcon = ({ s }: { s: "critical" | "warning" | "info" }) => {
    if (s === "critical") return <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
    if (s === "warning")  return <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
    return <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Alerts & Operational Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">Centralized monitoring & escalation hub · ML-flagged anomalies</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
          <Filter size={12} /> Filter
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 border-b-2 transition-all -mb-px ${activeTab === t.id ? "border-[#0038A8] text-[#0038A8]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === t.id ? "bg-[#0038A8] text-white" : "bg-slate-100 text-slate-500"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Alert cards */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
        {filtered.map(a => (
          <motion.div key={a.id}
            initial={{ opacity: 0, x: -4, height: "auto" }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0, overflow: "hidden" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            whileHover={{ y: -2, boxShadow: "0 8px 16px -4px rgba(0,0,0,0.07)" }}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="flex">
              <div className="w-1 flex-shrink-0" style={{ background: severityBorderColor[a.severity] }} />
              <div className="flex-1 p-5">
                <div className="flex items-start gap-3">
                  <SevIcon s={a.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="text-sm font-semibold text-slate-900 leading-snug">{a.title}</p>
                      <SeverityBadge severity={a.severity} />
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">{a.detail}</p>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><MapPin size={9} />{a.zone}</span>
                      <span className="flex items-center gap-1"><Clock size={9} />{a.timestamp}</span>
                      <span className="flex items-center gap-1"><Cpu size={9} />{a.algorithm}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button className="text-xs font-semibold text-white bg-[#0038A8] hover:bg-[#002D80] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                    <CheckCheck size={12} /> Approve Adjustment
                  </button>
                  <button className="text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                    <MapPin size={12} /> Dispatch Inspection
                  </button>
                  <button
                    onClick={() => setDismissed(prev => new Set([...prev, a.id]))}
                    className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors ml-auto"
                  >
                    Dismiss / Log
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-slate-400">
            <CheckCircle2 size={32} className="text-emerald-400 mb-3" />
            <p className="text-sm font-medium text-slate-600">All alerts resolved</p>
            <p className="text-xs text-slate-400 mt-1">No active alerts in this category</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── SCREEN: EXPORT ─────────────────────────────────────────────────────────
type ExportRecord = { id: number; title: string; format: string; size: string; timestamp: Date }

const REPORT_PREVIEWS: Record<string, { title: string; body: ReactNode }> = {
  demand: {
    title: "AquaStat DSS · Demand Forecast Report — Tabaco City Water District",
    body: (
      <>
        Ensemble ML models (SARIMA + LSTM) project total Q4 2025 consumption at{" "}
        <span className="font-semibold text-[#0038A8]">196,400 m³</span>, a{" "}
        <span className="font-semibold">+1.4% uplift</span> over Q3 baseline. Peak demand is forecast in{" "}
        <span className="font-semibold">April 2026</span> (Zone 1: +18% variance, Zone 2: +21% variance).<br /><br />
        The dry season window (Feb–May 2026) carries a projected supply deficit of{" "}
        <span className="font-semibold text-red-500">41,800 m³/month</span>. Model MAPE is 3.24% with 94.2% spike-prediction confidence for Zone 1.
        Immediate trigger-based alerts are recommended for February 2026.
      </>
    ),
  },
  nrw: {
    title: "AquaStat DSS · NRW Assessment Report — Tabaco City Water District",
    body: (
      <>
        System-wide Non-Revenue Water stands at <span className="font-semibold text-red-500">28.0%</span>,
        exceeding the LWUA benchmark of 20% by <span className="font-semibold">8 percentage points</span>.
        Six zones exceed the critical threshold: Zone 2 (27.0%), Zone 1 (24.2%), Zone 9 (22.1%),
        Zone 15 (21.8%), Zone 7 (20.9%), and Zone 12 (20.3%).<br /><br />
        Estimated monthly revenue loss from NRW:{" "}
        <span className="font-semibold text-red-500">₱1,240,000</span>.
        Priority pipe rehabilitation in Zones 1 and 2 is projected to recover{" "}
        <span className="font-semibold text-emerald-600">4.2% NRW within 90 days</span>.
      </>
    ),
  },
  monthly: {
    title: "AquaStat DSS · Monthly Operations Summary — September 2025",
    body: (
      <>
        September 2025 consumption: <span className="font-semibold text-[#0038A8]">193,748 m³</span> (+1.1% MoM).
        Total billed revenue: <span className="font-semibold">₱5,184,230</span>. Average revenue per account: ₱194.
        Pump schedule adherence: <span className="font-semibold text-emerald-600">91.4%</span>.<br /><br />
        Active service connections: 26,720 across 20 zones.
        Three pressure alerts logged in Zone 7 (resolved within SLA).
        No supply disruptions exceeding 4 hours were recorded.
        LP optimization saved <span className="font-semibold text-emerald-600">₱84,350</span> in pump energy costs.
      </>
    ),
  },
  audit: {
    title: "AquaStat DSS · Custom Query Audit Export — Tabaco City Water District",
    body: (
      <>
        Audit scope: All 20 service zones, Jan–Sep 2025. Records queried:{" "}
        <span className="font-semibold">217,440 billing transactions</span>, 8,760 hourly meter readings,
        and 1,247 maintenance work orders.<br /><br />
        Data integrity check: <span className="font-semibold text-emerald-600">99.8% complete</span> (427 missing meter reads in Zone 11 — flagged for field verification).
        Export includes raw meter data, NRW reconciliation sheets, and full audit trail
        suitable for LWUA submission.
      </>
    ),
  },
}

function ExportScreen() {
  const [reportType, setReportType] = useState<string | null>(null)
  const [format, setFormat] = useState<string | null>(null)
  const [startDate, setStartDate] = useState("2025-01-01")
  const [endDate, setEndDate] = useState("2025-09-30")
  const [zones, setZones] = useState("all")
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [history, setHistory] = useState<ExportRecord[]>([])
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextId = useRef(1)

  const reportTypes = [
    { id: "demand",  title: "Demand Forecast Report",    icon: TrendingUp, desc: "SARIMA/LSTM model outputs, spike predictions, Q4 '25–Q2 '26 horizon" },
    { id: "nrw",     title: "NRW Assessment Report",     icon: Map,        desc: "Zone-level NRW analysis, hotspot identification, recovery projections" },
    { id: "monthly", title: "Monthly Operations Summary",icon: BarChart3,  desc: "Full operational KPIs, consumption, revenue, pump schedule adherence" },
    { id: "audit",   title: "Custom Query Audit",        icon: Database,   desc: "Ad-hoc filtered data export for regulatory or internal audit purposes" },
  ]

  const formats = [
    { id: "pdf",  label: "PDF",   icon: FileText, desc: "Executive slide & document layout", ext: "pdf",  size: () => `${(1.2 + Math.random() * 2.4).toFixed(1)} MB` },
    { id: "csv",  label: "CSV",   icon: Database, desc: "Raw data tabular export",            ext: "csv",  size: () => `${(80 + Math.random() * 120).toFixed(0)} KB` },
    { id: "xlsx", label: "Excel", icon: BarChart3, desc: ".xlsx formatted workbooks",         ext: "xlsx", size: () => `${(0.4 + Math.random() * 0.8).toFixed(1)} MB` },
  ]

  const canGenerate = reportType && format && !generating
  const preview = reportType ? REPORT_PREVIEWS[reportType] : null

  const handleGenerate = () => {
    if (!canGenerate) return
    setGenerating(true)
    setProgress(0)
    let p = 0
    progressRef.current = setInterval(() => {
      p += Math.random() * 18 + 4
      if (p >= 100) {
        p = 100
        clearInterval(progressRef.current!)
        const rt = reportTypes.find(r => r.id === reportType)!
        const fmt = formats.find(f => f.id === format)!
        const record: ExportRecord = {
          id: nextId.current++,
          title: rt.title,
          format: fmt.label,
          size: fmt.size(),
          timestamp: new Date(),
        }
        setHistory(prev => [record, ...prev])
        toast.success(`${rt.title} downloaded`, {
          description: `${fmt.label} · ${record.size} · ${record.timestamp.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })} PHT`,
        })
        setGenerating(false)
        setProgress(0)
        setReportType(null)
        setFormat(null)
      }
      setProgress(Math.min(p, 100))
    }, 120)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Export & Report Builder</h1>
        <p className="text-sm text-slate-500 mt-0.5">Executive reporting · LWUA compliance documentation · Operational records</p>
      </div>

      {/* Step 1: Report type */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#0038A8] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>
          Select Report Type
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {reportTypes.map(r => {
            const Icon = r.icon
            const active = reportType === r.id
            return (
              <motion.button key={r.id} whileHover={{ y: -1 }} onClick={() => setReportType(r.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${active ? "border-[#0038A8] bg-[#0038A8]/[0.04]" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? "bg-[#0038A8] text-white" : "bg-slate-100 text-slate-500"}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${active ? "text-[#0038A8]" : "text-slate-800"}`}>{r.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{r.desc}</p>
                  </div>
                  {active && <CheckCircle2 size={16} className="text-[#0038A8] ml-auto flex-shrink-0 mt-0.5" />}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Step 2: Period */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#0038A8] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
          Period & Scope
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/10 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/10 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Service Zones</label>
            <select value={zones} onChange={e => setZones(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/10 transition-all">
              <option value="all">All 20 Zones</option>
              <option value="critical">Critical Zones Only (6)</option>
              <option value="zone1">Zone 1 — Tabaco City Proper</option>
              <option value="zone2">Zone 2 — Barangay Quinartus</option>
              <option value="custom">Custom Selection…</option>
            </select>
          </div>
        </div>
      </div>

      {/* Step 3: Format */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#0038A8] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</span>
          Output Format
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {formats.map(f => {
            const Icon = f.icon
            const active = format === f.id
            return (
              <button key={f.id} onClick={() => setFormat(f.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${active ? "border-[#0038A8] bg-[#0038A8]/[0.04]" : "border-slate-200 hover:border-slate-300"}`}>
                <Icon size={20} className={active ? "text-[#0038A8]" : "text-slate-400"} />
                <p className={`text-sm font-bold mt-2 ${active ? "text-[#0038A8]" : "text-slate-700"}`}>{f.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* AI Summary Preview — dynamic by report type */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Activity size={14} className="text-[#0038A8]" /> AI-Generated Executive Summary Preview
          </h3>
          <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">Auto-generated</span>
        </div>
        <div className="p-5 bg-slate-50/50 min-h-[100px] flex items-center">
          <AnimatePresence mode="wait">
            {preview ? (
              <motion.p key={reportType} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }} className="text-xs text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900">{preview.title}</span><br /><br />
                {preview.body}
              </motion.p>
            ) : (
              <motion.p key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs text-slate-400 italic">
                Select a report type above to preview the AI-generated executive summary.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Generate Button + Progress */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {!reportType && !format && "Select a report type and format to continue."}
            {reportType && !format && "Select an output format to continue."}
            {!reportType && format && "Select a report type to continue."}
            {reportType && format && !generating && (
              <span className="text-slate-700">Ready: <span className="font-semibold text-[#0038A8]">{reportTypes.find(r => r.id === reportType)?.title}</span> as <span className="font-semibold">{formats.find(f => f.id === format)?.label}</span></span>
            )}
            {generating && <span className="text-[#0038A8] font-semibold">Generating… {Math.round(progress)}%</span>}
          </div>
          <button onClick={handleGenerate} disabled={!canGenerate}
            className="flex items-center gap-2 text-sm font-semibold text-white px-6 py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{ background: generating ? "#6B8FD4" : "#0038A8" }}>
            {generating ? (
              <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block"><RefreshCw size={15} /></motion.span> Generating…</>
            ) : (
              <><Download size={15} /> Generate & Download</>
            )}
          </button>
        </div>
        {generating && (
          <div className="mt-3">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div className="h-full bg-[#0038A8] rounded-full" style={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }} />
            </div>
          </div>
        )}
      </div>

      {/* Recent Exports */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" /> Recent Exports — This Session
            </h3>
            <span className="text-[10px] text-slate-400">{history.length} file{history.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {history.map(rec => (
              <motion.div key={rec.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{rec.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{rec.format} · {rec.size} · {rec.timestamp.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })} PHT</p>
                </div>
                <button className="text-xs text-[#0038A8] hover:underline font-medium flex-shrink-0 flex items-center gap-1">
                  <Download size={12} /> Re-download
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── SIDEBAR ────────────────────────────────────────────────────────────────
function Sidebar({ current, onNavigate, collapsed, onToggle }: {
  current: ScreenId; onNavigate: (s: ScreenId) => void
  collapsed: boolean; onToggle: () => void
}) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col h-screen flex-shrink-0 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0F172A 0%, #001A5C 100%)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-white shadow-md shadow-black/30 ring-2 ring-white/10">
          <ImageWithFallback src={tcwdSeal} alt="Tabaco City Water District seal" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm tracking-tight leading-none">AquaStat</p>
            <p className="text-blue-300/60 text-[10px] mt-0.5 truncate">Tabaco City Water District</p>
          </motion.div>
        )}
        <button onClick={onToggle} className="ml-auto text-slate-500 hover:text-slate-300 transition-colors p-1 rounded flex-shrink-0">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = current === item.id
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-left transition-colors relative group ${
                active
                  ? "bg-[#0038A8]/[0.14] text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#0038A8]/[0.06]"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-bar"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#0038A8]"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <Icon size={16} className={`flex-shrink-0 ${active ? "text-[#93C5FD]" : "text-slate-500 group-hover:text-slate-200"}`} />
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold leading-none ${active ? "text-white" : ""}`}>{item.label}</p>
                  {item.sublabel && <p className={`text-[10px] mt-0.5 ${active ? "text-blue-200/70" : "text-slate-600 group-hover:text-slate-400"}`}>{item.sublabel}</p>}
                </div>
              )}
              {item.badge && !collapsed && (
                <motion.span animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2, repeat: Infinity }}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-[#D32F2F] text-white"}`}>
                  {item.badge}
                </motion.span>
              )}
              {item.badge && collapsed && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D32F2F]" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="border-t border-white/5 px-4 py-3">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-full bg-[#0038A8] flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">J. Reyes</p>
              <p className="text-[10px] text-slate-500 truncate">Operations Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            <span>Secure session · TLS 1.3</span>
          </div>
          <p className="text-[9px] text-slate-600 mt-1">AquaStat v2.4.1</p>
        </motion.div>
      )}
    </motion.aside>
  )
}

// ── TOPBAR ─────────────────────────────────────────────────────────────────
function Topbar({ current, onMenuClick, onNavigate }: { current: ScreenId; onMenuClick: () => void; onNavigate?: (s: ScreenId) => void }) {
  const [time, setTime] = useState(new Date())
  const { current: weather } = useWeatherData()

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const temp = weather ? Math.round(weather.temperature) : 27
  const isRain = weather?.icon === 'rain' || weather?.icon === 'storm'
  const isCloud = weather?.icon === 'cloud' || weather?.icon === 'partly-cloudy'

  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-slate-200 flex items-center gap-3 px-4 md:px-5">
      {/* Hamburger — mobile only */}
      <button onClick={onMenuClick}
        className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
        <Menu size={18} />
      </button>
      {/* TCWD seal — visible on mobile in topbar since sidebar is hidden */}
      <div className="md:hidden w-7 h-7 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-slate-200">
        <ImageWithFallback src={tcwdSeal} alt="TCWD" className="w-full h-full object-cover" />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <span className="hidden sm:inline">AquaStat</span>
        <ChevronRight size={12} className="hidden sm:inline" />
        <span className="font-semibold text-slate-700">{SCREEN_LABELS[current]}</span>
      </div>
      <div className="flex-1 max-w-xs hidden sm:block">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Search zone, barangay, account no., date…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/10 transition-all" />
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {/* Real-time Live Weather Widget */}
        <button
          onClick={() => onNavigate?.("weather")}
          title="Click to view full Weather & Climate Correlation Dashboard"
          className={`hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
            isRain
              ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              : isCloud
              ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
          }`}
        >
          {weather?.icon === 'storm' ? (
            <CloudLightning size={13} className="text-purple-600 animate-pulse" />
          ) : weather?.icon === 'rain' ? (
            <CloudRain size={13} className="text-blue-500 animate-bounce" />
          ) : isCloud ? (
            <Cloud size={13} className="text-slate-500" />
          ) : (
            <Sun size={13} className="text-amber-500 animate-spin-slow" />
          )}
          <span className="font-semibold">{temp}°C</span>
          <span className={isRain ? "text-blue-500 font-medium" : isCloud ? "text-slate-500 font-medium" : "text-amber-600 font-medium"}>
            Tabaco City
          </span>
        </button>

        {/* Real-time 1-Second Live Clock Widget */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 bg-slate-50 px-2.5 py-1.5 rounded-lg shadow-2xs">
          <Clock size={12} className="text-slate-400" />
          <span className="font-mono font-medium">
            {time.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Manila" })} PHT
          </span>
        </div>
        <button className="relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D32F2F]" />
        </button>
        <div className="w-7 h-7 rounded-full bg-[#0038A8] flex items-center justify-center cursor-pointer shadow-sm">
          <User size={13} className="text-white" />
        </div>
      </div>
    </header>
  )
}

// ── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentScreen, setCurrentScreen] = useState<ScreenId>("dashboard")
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (!isAuthenticated) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }} className="h-screen">
        <LoginScreen onLogin={() => setIsAuthenticated(true)} />
      </div>
    )
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "dashboard":    return <DashboardScreen />
      case "descriptive":  return <DescriptiveScreen />
      case "predictive":   return <PredictiveScreen />
      case "shortage":     return <ShortageScreen />
      case "weather":      return <WeatherScreen />
      case "nrw":          return <NRWScreen />
      case "zones":        return <ZonesScreen />
      case "optimization": return <OptimizationScreen />
      case "alerts":       return <AlertsScreen />
      case "export":       return <ExportScreen />
    }
  }

  const handleNavigate = (s: ScreenId) => {
    setCurrentScreen(s)
    setMobileNavOpen(false)
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#F8FAFC]" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <Toaster position="bottom-right" richColors />
      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <div className={`fixed inset-y-0 left-0 z-50 md:relative md:z-auto md:translate-x-0 transition-transform duration-300 ease-in-out ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <Sidebar
          current={currentScreen}
          onNavigate={handleNavigate}
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          current={currentScreen}
          onMenuClick={() => setMobileNavOpen(true)}
          onNavigate={handleNavigate}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {renderScreen()}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
