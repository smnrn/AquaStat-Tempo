import React, { Component, useState, useEffect, useRef, useMemo, type ReactNode, type FormEvent } from "react"
import { toast, Toaster } from "sonner"
import { motion, AnimatePresence } from "motion/react"
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback"
import tcwdSeal from "@/imports/image-8.png"
import { DashboardProvider, useDashboard } from "./context/DashboardContext"
import {
  LayoutDashboard, BarChart3, TrendingUp, Droplets, CloudSun, Map,
  Grid3x3, Zap, Bell, Download, ChevronLeft, ChevronRight, Search, Menu,
  RefreshCw, Eye, EyeOff, AlertTriangle, Info, Clock, User, Lock,
  Shield, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle,
  Filter, Calendar, FileText, Database,
  Sun, Cloud, CloudRain, CloudLightning, MapPin, Activity,
  CheckCheck, Cpu, X, Scale, ArrowRight, DollarSign, Users, Sparkles, HelpCircle,
  Copy, Sliders, TrendingDown, Layers, MessageSquare, PenTool, LogOut,
  type LucideIcon
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
  { id: 1,  name: "Zone 1",  consumption: 18240, nrw: 24.2, accounts: 892,  population: 4120, status: "critical" as ZoneStatus, trend: [14200,15400,16100,16900,17600,18240] },
  { id: 2,  name: "Zone 2",  consumption: 22150, nrw: 27.0, accounts: 1124, population: 5280, status: "critical" as ZoneStatus, trend: [18200,19400,20100,20900,21600,22150] },
  { id: 3,  name: "Zone 3",  consumption: 14320, nrw: 18.4, accounts: 698,  population: 3140, status: "warning"  as ZoneStatus, trend: [13100,13400,13800,14000,14200,14320] },
  { id: 4,  name: "Zone 4",  consumption: 11840, nrw: 14.8, accounts: 582,  population: 2680, status: "normal"   as ZoneStatus, trend: [11200,11400,11500,11600,11720,11840] },
  { id: 5,  name: "Zone 5",  consumption: 9420,  nrw: 16.2, accounts: 461,  population: 2100, status: "warning"  as ZoneStatus, trend: [8800,9000,9100,9200,9320,9420]    },
  { id: 6,  name: "Zone 6",  consumption: 8760,  nrw: 12.4, accounts: 428,  population: 1980, status: "normal"   as ZoneStatus, trend: [8400,8500,8580,8640,8700,8760]    },
  { id: 7,  name: "Zone 7",  consumption: 16480, nrw: 19.8, accounts: 802,  population: 3720, status: "warning"  as ZoneStatus, trend: [14800,15200,15600,15900,16200,16480] },
  { id: 8,  name: "Zone 8",  consumption: 7840,  nrw: 11.2, accounts: 384,  population: 1760, status: "normal"   as ZoneStatus, trend: [7500,7580,7640,7700,7770,7840]    },
  { id: 9,  name: "Zone 9",  consumption: 10240, nrw: 17.6, accounts: 502,  population: 2320, status: "warning"  as ZoneStatus, trend: [9600,9800,9940,10040,10140,10240]  },
  { id: 10, name: "Zone 10", consumption: 6480,  nrw: 10.8, accounts: 318,  population: 1440, status: "normal"   as ZoneStatus, trend: [6200,6280,6340,6400,6440,6480]    },
  { id: 11, name: "Zone 11", consumption: 8920,  nrw: 15.4, accounts: 437,  population: 2020, status: "normal"   as ZoneStatus, trend: [8500,8620,8720,8800,8860,8920]    },
  { id: 12, name: "Zone 12", consumption: 5840,  nrw: 9.8,  accounts: 286,  population: 1320, status: "normal"   as ZoneStatus, trend: [5600,5680,5720,5770,5810,5840]    },
  { id: 13, name: "Zone 13", consumption: 9180,  nrw: 16.8, accounts: 449,  population: 2080, status: "warning"  as ZoneStatus, trend: [8700,8820,8940,9020,9100,9180]    },
  { id: 14, name: "Zone 14", consumption: 7420,  nrw: 13.2, accounts: 363,  population: 1680, status: "normal"   as ZoneStatus, trend: [7100,7180,7260,7320,7380,7420]    },
  { id: 15, name: "Zone 15", consumption: 14840, nrw: 22.3, accounts: 726,  population: 3360, status: "critical" as ZoneStatus, trend: [12800,13200,13600,14000,14400,14840] },
  { id: 16, name: "Zone 16", consumption: 8640,  nrw: 14.6, accounts: 423,  population: 1960, status: "normal"   as ZoneStatus, trend: [8200,8320,8420,8500,8580,8640]    },
  { id: 17, name: "Zone 17", consumption: 10480, nrw: 18.9, accounts: 513,  population: 2380, status: "warning"  as ZoneStatus, trend: [9800,10000,10140,10260,10380,10480] },
  { id: 18, name: "Zone 18", consumption: 6820,  nrw: 11.6, accounts: 334,  population: 1540, status: "normal"   as ZoneStatus, trend: [6500,6580,6640,6700,6760,6820]    },
  { id: 19, name: "Zone 19", consumption: 9640,  nrw: 17.2, accounts: 472,  population: 2180, status: "warning"  as ZoneStatus, trend: [9100,9240,9360,9460,9560,9640]    },
  { id: 20, name: "Zone 20", consumption: 11240, nrw: 20.4, accounts: 550,  population: 2540, status: "critical" as ZoneStatus, trend: [10200,10480,10720,10920,11080,11240] },
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
  { month: "Jan '25", actualSupply: 271200, supply: 255000, demand: 175480 },
  { month: "Feb '25", actualSupply: 264800, supply: 255000, demand: 168240 },
  { month: "Mar '25", actualSupply: 268400, supply: 255000, demand: 172860 },
  { month: "Apr '25", actualSupply: 274100, supply: 255000, demand: 178420 },
  { month: "May '25", actualSupply: 279500, supply: 255000, demand: 182640 },
  { month: "Jun '25", actualSupply: 282400, supply: 255000, demand: 186920 },
  { month: "Jul '25", actualSupply: 285100, supply: 255000, demand: 190340 },
  { month: "Aug '25", actualSupply: 286800, supply: 255000, demand: 192480 },
  { month: "Sep '25", actualSupply: 288400, supply: 255000, demand: 193748 },
  { month: "Oct '25", actualSupply: 289100, supply: 255000, demand: 196200 },
  { month: "Nov '25", actualSupply: 287400, supply: 255000, demand: 198400 },
  { month: "Dec '25", actualSupply: 284200, supply: 255000, demand: 195600 },
  { month: "Jan '26", supply: 248000, demand: 201800 },
  { month: "Feb '26", supply: 235000, demand: 210400 },
  { month: "Mar '26", supply: 224000, demand: 218600 },
  { month: "Apr '26", supply: 218000, demand: 222800 },
  { month: "May '26", supply: 228000, demand: 216400 },
  { month: "Jun '26", supply: 242000, demand: 210800 },
]

const CUSTOMER_CLASS = [
  { name: "Residential",     value: 112840, revenue: 3482000, accounts: 8240, color: "#0038A8" },
  { name: "Commercial",      value: 10680,  revenue: 621000,  accounts: 680,  color: "#0284C7" },
  { name: "Government",      value: 11200,  revenue: 784000,  accounts: 220,  color: "#10B981" },
  { name: "Semi-Commercial", value: 4779,   revenue: 298000,  accounts: 860,  color: "#F59E0B" },
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
    const clean = target.replaceAll(",", "")
    const parts = /^(₱?)(\d+(?:\.\d*)?)([kMm]?)(.*)$/.exec(clean)
    if (!parts) { setVal(target); return }
    const [, prefix, num, suffix, rest] = parts
    const end = Number.parseFloat(num)
    if (Number.isNaN(end)) { setVal(target); return }
    const isFloat = target.includes(".")
    const decimals = isFloat ? (target.split(".")[1]?.replace(/\D/g, "").length ?? 1) : 0
    const t0 = performance.now()
    let raf: number
    const step = (ts: number) => {
      const p = Math.min((ts - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const cur = end * eased
      const suffixPart = suffix ? suffix + rest : rest
      const formatted = isFloat
        ? `${prefix}${cur.toFixed(decimals)}${suffix}${rest}`
        : `${prefix}${Math.round(cur).toLocaleString()}${suffixPart}`
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
function StatusBadge({ status }: Readonly<{ status: ZoneStatus }>) {
  const map = {
    critical: "bg-red-50 text-red-600 border-red-200",
    warning:  "bg-amber-50 text-amber-600 border-amber-200",
    normal:   "bg-emerald-50 text-emerald-600 border-emerald-200",
  }
  let label = "NORMAL"
  if (status === "critical") label = "CRITICAL"
  else if (status === "warning") label = "WARNING"

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${map[status]}`}>
      {label}
    </span>
  )
}

function SeverityBadge({ severity }: Readonly<{ severity: "critical" | "warning" | "info" }>) {
  const map = {
    critical: { bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200",    bar: "bg-[#D32F2F]" },
    warning:  { bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-200",  bar: "bg-[#F59E0B]" },
    info:     { bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-200",   bar: "bg-[#0038A8]" },
  }
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${map[severity].bg} ${map[severity].text}`}>{severity}</span>
}

function KPICard({ title, value, unit, change, changeLabel, color = "#0038A8", sparkData }: Readonly<{
  title: string; value: string; unit?: string; change?: number; changeLabel?: string
  color?: string; sparkData?: number[];
}>) {
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
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${positive ? "text-emerald-600" : "text-red-500"}`}
            >
              {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              <span>{positive ? "+" : ""}{change}%</span>
              {changeLabel && <span className="text-slate-400 font-normal">{changeLabel}</span>}
            </motion.div>
          )}
        </div>
        {sparkData && (
          <div className="w-24 h-12 opacity-90 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData.map((v, i) => ({ v, i }))} margin={{ top: 4, bottom: 4, left: 2, right: 4 }}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={color}
                  strokeWidth={2.5}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                  dot={(props: any) => {
                    const k = `spk-${props.index}`
                    if (props.index !== lastIdx) return <g key={k} />
                    return (
                      <g key={k}>
                        <circle cx={props.cx} cy={props.cy} r={7} fill={color} opacity={0.25} className="animate-pulse" />
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

// ── USER MANAGEMENT & OFFICIAL ACCOUNTS ────────────────────────────────────
export interface UserAccount {
  id: string
  username: string
  name: string
  role: string
  designation: string
  department: string
  employeeId: string
  email: string
  clearanceLevel: string
  avatarInitials: string
  lastLogin: string
}

const MANAGEMENT_ACCOUNTS: (UserAccount & { password: string })[] = [
  {
    id: "usr-gm-01",
    username: "gm.catubag",
    password: "Password123!",
    name: "Engr. Joseph Richard G. Catubag, MBA",
    role: "General Manager",
    designation: "Head of Agency & General Manager",
    department: "Office of the General Manager (OGM)",
    employeeId: "TCWD-EXEC-2015-001",
    email: "jcatubag@tabacocitywater.gov.ph",
    clearanceLevel: "Level 5 · Executive Administrator",
    avatarInitials: "JC",
    lastLogin: "Today, 08:30 AM"
  },
  {
    id: "usr-ops-02",
    username: "j.reyes.tcwd",
    password: "Password123!",
    name: "Engr. Julian Reyes, P.E.",
    role: "Operations Manager",
    designation: "Division Manager for Water Operations & Distribution",
    department: "Engineering & Operations Department",
    employeeId: "TCWD-ENG-2018-042",
    email: "j.reyes@tabacocitywater.gov.ph",
    clearanceLevel: "Level 4 · Operations & Pump Dispatch Clearance",
    avatarInitials: "JR",
    lastLogin: "Today, 09:14 AM"
  },
  {
    id: "usr-admin-03",
    username: "admin",
    password: "Password123!",
    name: "AquaStat System Administrator",
    role: "System Administrator",
    designation: "Lead IS Business Analytics Specialist",
    department: "Management Information Systems (MIS)",
    employeeId: "TCWD-MIS-2022-019",
    email: "sysadmin@tabacocitywater.gov.ph",
    clearanceLevel: "Level 5 · Superuser Admin",
    avatarInitials: "SA",
    lastLogin: "Today, 07:45 AM"
  },
  {
    id: "usr-comm-04",
    username: "m.mallari.tcwd",
    password: "Password123!",
    name: "Maria Mallari, CPA",
    role: "Commercial Officer",
    designation: "Commercial Services Division Manager",
    department: "Finance & Commercial Accounts Division",
    employeeId: "TCWD-FIN-2019-088",
    email: "mmallari@tabacocitywater.gov.ph",
    clearanceLevel: "Level 3 · Billing & Revenue Clearance",
    avatarInitials: "MM",
    lastLogin: "Yesterday, 04:52 PM"
  }
]

// ── SCREEN: LOGIN ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (user: UserAccount) => void }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)

  const handleAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const user = MANAGEMENT_ACCOUNTS[0]
    try {
      localStorage.setItem("aquastat_user_session", JSON.stringify(user))
    } catch {}
    toast.success("Welcome back", {
      description: "Signed in to AquaStat Decision Support System"
    })
    onLogin(user)
  }

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#f8fafc] p-2 sm:p-2.5 md:p-3 lg:p-3.5 flex flex-col justify-center overflow-y-auto lg:overflow-hidden select-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1440px] mx-auto h-full min-h-0">
        
        {/* Left Floating Rounded Blue Card */}
        <div
          className="relative flex flex-col justify-between w-full lg:w-[48%] xl:w-[50%] rounded-2xl lg:rounded-[28px] overflow-hidden p-5 sm:p-6 lg:p-7 xl:p-8 text-white shadow-xl shadow-blue-950/10 h-full min-h-0"
          style={{ background: "linear-gradient(135deg, #0945BD 0%, #0036A3 45%, #002275 100%)" }}
        >
          {/* Subtle contour flow / wave lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 700 800" preserveAspectRatio="none">
            <path d="M-100,500 C150,420 300,680 500,560 C650,470 720,540 850,480 L850,850 L-100,850 Z" fill="none" stroke="white" strokeWidth="1.2" />
            <path d="M-100,560 C150,480 320,740 520,620 C670,530 740,600 850,540 L850,850 L-100,850 Z" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
            <path d="M-100,620 C160,540 340,790 540,680 C680,600 750,660 850,600 L850,850 L-100,850 Z" fill="none" stroke="white" strokeWidth="0.8" opacity="0.4" />
          </svg>

          {/* Top Row: Logo + Brand & Pill badge */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Stylized geometric water droplet icon */}
              <div className="text-white flex-shrink-0">
                <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M16 3 C16 3 7.5 14 7.5 21 C7.5 25.69 11.31 29.5 16 29.5 C20.69 29.5 24.5 25.69 24.5 21 C24.5 14 16 3 16 3 Z"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11 18.5 C12.5 17.5 14.2 17 16 17 C17.8 17 19.5 17.5 21 18.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10 22.5 C11.8 21.2 13.8 20.6 16 20.6 C18.2 20.6 20.2 21.2 22 22.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <div className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-none">
                  AquaStat<span className="text-white">.</span>
                </div>
                <div className="text-[8px] font-bold text-blue-200/90 tracking-[0.2em] uppercase mt-0.5">
                  WATER INTELLIGENCE
                </div>
              </div>
            </div>

            <div className="px-2.5 py-0.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-xs text-white/90 text-[10px] font-medium tracking-wide shadow-2xs">
              Decision support system
            </div>
          </div>

          {/* Middle: Headline & Core Thesis */}
          <div className="relative z-10 my-auto py-2 sm:py-3 lg:py-4 max-w-lg">
            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] uppercase text-blue-200/90 mb-2 sm:mb-2.5">
              <span className="w-3.5 h-px bg-blue-200/60" />
              <span>EVERY DROP. EVERY DECISION.</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-[32px] xl:text-[36px] font-black text-white tracking-tight leading-[1.14] mb-2 sm:mb-2.5">
              A clearer view.<br />
              A smarter flow.
            </h1>

            <p className="text-blue-100/90 text-xs sm:text-[13px] font-normal leading-relaxed max-w-md">
              Better water management starts with better insights. One connected workspace for a more resilient Tabaco City.
            </p>
          </div>

          {/* Bottom Bar: TCWD Seal + Jurisdiction & Network status */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 sm:pt-3 border-t border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full overflow-hidden bg-white p-0.5 ring-1 ring-white/20 flex-shrink-0">
                <ImageWithFallback src={tcwdSeal} alt="TCWD Seal" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-[9px] text-blue-200/80 leading-tight">Serving our city. Sustaining our future.</p>
                <p className="text-[11px] font-bold text-white tracking-tight">Tabaco City Water District</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] font-medium text-blue-200/90">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
              <span>20 service zones, connected.</span>
            </div>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 flex flex-col justify-between h-full min-h-0 p-3.5 sm:p-5 lg:p-6 lg:pl-10 xl:pl-12">
          
          {/* Top Subheader */}
          <div className="flex items-center justify-between w-full flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[9.5px] font-bold tracking-wider uppercase text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0038A8]" />
              <span>OFFICIAL OPERATIONS WORKSPACE</span>
            </div>

            <button
              type="button"
              onClick={() => toast.info("Technical Assistance", { description: "Contact TCWD MIS Operations Unit at ext 104." })}
              className="flex items-center gap-1 text-[10.5px] text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <HelpCircle size={12} className="text-slate-400" />
              <span>Need help?</span>
            </button>
          </div>

          {/* Center Form Section */}
          <div className="w-full max-w-[360px] sm:max-w-[375px] mx-auto my-auto py-1 sm:py-2">
            
            {/* Lock Icon Badge */}
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-[#0038A8] mb-2 sm:mb-2.5">
              <Lock size={15} className="text-[#0038A8]" />
            </div>

            <p className="text-[8.5px] sm:text-[9px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-0.5">
              WELCOME TO AQUASTAT
            </p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-0.5">
              Welcome back.
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mb-3 sm:mb-3.5">
              Sign in to your account to access your workspace.
            </p>

            <form onSubmit={handleAuth} className="space-y-2.5 sm:space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5 sm:mb-1">
                  Username or email
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username or email"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/10 transition-all placeholder:text-slate-400 font-normal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5 sm:mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-8 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/10 transition-all placeholder:text-slate-400 font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 accent-[#0038A8]"
                  />
                  <span className="text-[10.5px] text-slate-500">Remember this device</span>
                </label>
                <button
                  type="button"
                  onClick={() => toast.info("Password Recovery", { description: "Contact TCWD MIS administrator to reset credentials." })}
                  className="text-[10.5px] font-semibold text-[#0038A8] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                onClick={handleAuth}
                className="w-full py-2 sm:py-2.5 px-4 rounded-xl bg-[#0038A8] hover:bg-[#002f8f] text-white font-semibold text-xs sm:text-[13px] flex items-center justify-center gap-2 shadow-sm shadow-[#0038A8]/20 transition-all cursor-pointer mt-1"
              >
                <span>Sign in to AquaStat</span>
                <ArrowRight size={14} />
              </button>
            </form>

            <p className="text-center text-slate-400 mt-2 flex items-center justify-center gap-1.5 text-[9px]">
              <Shield size={9} className="text-slate-400" />
              <span>Secure access. Authorized personnel only.</span>
            </p>

            <div className="mt-2 text-center text-slate-400 flex items-center justify-center gap-1 text-[9.5px] sm:text-[10px]">
              <span>Don't have access yet?</span>
              <button
                type="button"
                onClick={() => toast.info("Access Request", { description: "Please submit an access authorization ticket to TCWD MIS." })}
                className="font-medium text-[#0038A8] hover:underline inline-flex items-center gap-0.5 cursor-pointer text-[9.5px] sm:text-[10px]"
              >
                <span>Contact your administrator</span>
                <ArrowUpRight size={8} />
              </button>
            </div>
          </div>

          {/* Bottom Right Footer */}
          <div className="w-full flex items-center justify-between text-slate-400 pt-1.5 sm:pt-2 flex-shrink-0 text-[9px] sm:text-[9.5px]">
            <div className="leading-tight">
              <p>&copy; 2026 Tabaco City Water District</p>
              <p className="text-slate-400/70 text-[8px] sm:text-[8.5px]">AquaStat DSS v2.4.1</p>
            </div>
            <button
              type="button"
              onClick={() => toast.info("Data Privacy & Security", { description: "Complies with RA 10173 (Data Privacy Act of 2012)." })}
              className="hover:text-slate-600 inline-flex items-center gap-0.5 transition-colors cursor-pointer text-slate-400 text-[9px] sm:text-[9.5px]"
            >
              <span>Privacy & security</span>
              <ArrowUpRight size={8} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── USER PROFILE & CREDENTIALS MODAL ───────────────────────────────────────
function UserProfileModal({
  isOpen,
  onClose,
  user
}: {
  isOpen: boolean
  onClose: () => void
  user: UserAccount
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header background with avatar badge */}
        <div className="relative p-6 bg-gradient-to-br from-[#0038A8] via-[#002D80] to-[#001A5C] text-white overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3.5">
            <div className="relative w-14 h-14 rounded-2xl bg-white/15 border-2 border-white/30 backdrop-blur-xs flex items-center justify-center text-xl font-bold font-mono text-white shadow-lg">
              {user.avatarInitials}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#002D80] shadow-sm" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-blue-100 uppercase tracking-wider mb-1">
                {user.role}
              </span>
              <h3 className="text-base font-bold text-white leading-tight truncate">
                {user.name}
              </h3>
              <p className="text-xs text-blue-200/80 truncate mt-0.5">
                {user.designation}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Details List */}
        <div className="p-6 space-y-3.5 divide-y divide-slate-100">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Employee ID</p>
              <p className="font-mono font-semibold text-slate-800 mt-0.5">{user.employeeId}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Security Tier</p>
              <p className="font-semibold text-emerald-600 mt-0.5 truncate">{user.clearanceLevel.split("·")[0]}</p>
            </div>
          </div>

          <div className="pt-3 space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500 flex-shrink-0">Department</span>
              <span className="font-medium text-slate-800 text-right">{user.department}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 flex-shrink-0">Official Email</span>
              <span className="font-mono text-slate-800 truncate">{user.email}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 flex-shrink-0">Clearance Scope</span>
              <span className="font-semibold text-slate-700">{user.clearanceLevel}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 flex-shrink-0">Active Session</span>
              <span className="font-mono text-emerald-600 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                TLS 1.3 · Verified Online
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions — Close only */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── LOGOUT CONFIRMATION MODAL ──────────────────────────────────────────────
function LogoutConfirmationModal({
  isOpen,
  onClose,
  onConfirmLogout,
  userName
}: {
  isOpen: boolean
  onClose: () => void
  onConfirmLogout: () => void
  userName: string
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 14 }}
        transition={{ duration: 0.16 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 text-center space-y-4"
      >
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
          <LogOut size={22} className="translate-x-0.5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Confirm Sign Out</h3>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Are you sure you want to sign out, <span className="font-bold text-slate-800">{userName}</span>?
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            Your encrypted session will be closed. You will need to re-enter your credentials to access the decision support console.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            Stay Signed In
          </button>
          <button
            type="button"
            onClick={onConfirmLogout}
            className="px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-red-600/30"
          >
            <LogOut size={13} />
            Yes, Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── CUSTOMER CLASS DRILL DOWN MODAL ───────────────────────────────────────
function CustomerClassDrilldownModal({
  isOpen,
  onClose,
  initialTab = "total",
  initialClass = "Residential",
  onNavigate,
}: {
  isOpen: boolean
  onClose: () => void
  initialTab?: "total" | "cross" | "compare"
  initialClass?: string
  onNavigate?: (screen: ScreenId) => void
}) {
  const [activeTab, setActiveTab] = useState<"total" | "cross" | "compare">(initialTab)
  const [classA, setClassA] = useState<string>(initialClass || "Residential")
  const [classB, setClassB] = useState<string>("Commercial")

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      if (initialClass && initialClass !== "All") {
        setClassA(initialClass)
        setClassB(initialClass === "Residential" ? "Commercial" : "Residential")
      }
    }
  }, [isOpen, initialTab, initialClass])

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const { customerClasses: CUSTOMER_CLASS, kpi } = useDashboard()
  const billedVolume = CUSTOMER_CLASS.reduce((s, c) => s + c.value, 0)
  const nrwVolume = Math.round(billedVolume * (kpi.nrwPct / (100 - kpi.nrwPct || 1)))
  const totalProduction = billedVolume + nrwVolume
  const totalRevenue = CUSTOMER_CLASS.reduce((s, c) => s + c.revenue, 0)
  const totalAccounts = CUSTOMER_CLASS.reduce((s, c) => s + c.accounts, 0)

  // Chart data: Volume % vs Revenue % side-by-side
  const comparisonData = CUSTOMER_CLASS.map(c => {
    const volShare = Number(((c.value / billedVolume) * 100).toFixed(1))
    const revShare = Number(((c.revenue / totalRevenue) * 100).toFixed(1))
    const effectiveRate = Number((c.revenue / c.value).toFixed(2))
    const avgBill = Math.round(c.revenue / c.accounts)
    const avgVol = Number((c.value / c.accounts).toFixed(1))
    return {
      name: c.name,
      volume: c.value,
      revenue: c.revenue,
      accounts: c.accounts,
      volShare,
      revShare,
      effectiveRate,
      avgBill,
      avgVol,
      color: c.color,
    }
  })

  // Tariff chart data sorted highest to lowest rate
  const tariffData = [...comparisonData].sort((a, b) => b.effectiveRate - a.effectiveRate)

  // Head-to-head comparison objects
  const objA = comparisonData.find(c => c.name === classA) || comparisonData[0]
  const objB = comparisonData.find(c => c.name === classB) || comparisonData[1]

  const volRatio = (objA.volume / objB.volume).toFixed(1)
  const revRatio = (objA.revenue / objB.revenue).toFixed(1)
  const rateRatio = (objA.effectiveRate / objB.effectiveRate).toFixed(2)
  const billRatio = (objA.avgBill / objB.avgBill).toFixed(1)

  const objResidential = comparisonData.find(c => c.name === "Residential") || comparisonData[0]
  const nonResClasses = comparisonData.filter(c => c.name !== "Residential")
  const nonResVolShare = Number(nonResClasses.reduce((s, c) => s + c.volShare, 0).toFixed(1))
  const nonResRevShare = Number(nonResClasses.reduce((s, c) => s + c.revShare, 0).toFixed(1))
  const nonResRevenue = nonResClasses.reduce((s, c) => s + c.revenue, 0)
  const billedPctOfProduction = Number(((billedVolume / (totalProduction || 1)) * 100).toFixed(1))
  const avgTariffYield = Number((totalRevenue / (billedVolume || 1)).toFixed(2))
  const nrwFinancialLoss = (nrwVolume * avgTariffYield) / 1_000_000
  const commClass = comparisonData.find(c => c.name === "Commercial")
  const govClass = comparisonData.find(c => c.name === "Government")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#0038A8]/10 text-[#0038A8] px-2 py-0.5 rounded-full">
                <Sparkles size={11} /> Customer Class Drill Down & Cross-Comparison
              </span>
              <span className="text-[11px] text-slate-400 font-medium">TCWD Billing Analytics</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
              Customer Class Volume vs. Revenue Analysis
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare total billed water with each customer class, and explore how revenue differs across customer classes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors ml-4 flex-shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Executive Summary Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-white border-b border-slate-100 text-xs">
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-medium">Total Billed Water</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{billedVolume.toLocaleString()} m³</span>
            <span className="text-[10px] text-blue-600 block">{billedPctOfProduction}% of {totalProduction.toLocaleString()} m³ produced</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-medium">Total Water Revenue</span>
            <span className="font-mono font-bold text-emerald-600 text-sm">₱{(totalRevenue / 1_000_000).toFixed(3)} Million</span>
            <span className="text-[10px] text-slate-500 block">Across {totalAccounts.toLocaleString()} active meters</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-medium">Average Tariff Yield</span>
            <span className="font-mono font-bold text-slate-900 text-sm">₱{avgTariffYield.toFixed(2)} / m³</span>
            <span className="text-[10px] text-slate-500 block">Blended district-wide rate</span>
          </div>
          <div className="bg-red-50 rounded-lg p-2.5 border border-red-100">
            <span className="text-[10px] text-red-500 block font-medium">NRW System Loss</span>
            <span className="font-mono font-bold text-red-600 text-sm">{nrwVolume.toLocaleString()} m³</span>
            <span className="text-[10px] text-red-400 block">{kpi.nrwPct.toFixed(1)}% loss · ₱{nrwFinancialLoss.toFixed(2)}M uncollected</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 bg-slate-50/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab("total")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
              activeTab === "total"
                ? "border-[#0038A8] text-[#0038A8] bg-white shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
            }`}
          >
            1. Total Billed vs. Customer Class
          </button>
          <button
            onClick={() => setActiveTab("cross")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
              activeTab === "cross"
                ? "border-[#0038A8] text-[#0038A8] bg-white shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
            }`}
          >
            2. Cross-Class Revenue & Tariff Dynamics
          </button>
          <button
            onClick={() => setActiveTab("compare")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
              activeTab === "compare"
                ? "border-[#0038A8] text-[#0038A8] bg-white shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
            }`}
          >
            3. Head-to-Head Class Comparison
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* TAB 1: Total Billed vs. Customer Class */}
          {activeTab === "total" && (
            <div className="space-y-6">
              {/* Narrative Banner 1 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-xl p-4 border border-blue-200/70">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0038A8] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Narrative 1: How Total Billed Water is Divided Across Customer Classes
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Every month, TCWD produces <strong className="text-slate-800">{totalProduction.toLocaleString()} m³</strong> of treated water. After{" "}
                      <strong className="text-red-600">{nrwVolume.toLocaleString()} m³ ({kpi.nrwPct.toFixed(1)}%)</strong> is lost through physical leaks and unauthorized consumption (NRW), the remaining{" "}
                      <strong className="text-blue-700 font-bold">{billedVolume.toLocaleString()} m³ ({billedPctOfProduction}%)</strong> is delivered and billed to our <strong className="text-slate-800">{totalAccounts.toLocaleString()} customer accounts</strong>.
                    </p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      <strong className="text-slate-800">Key takeaway for everyone:</strong> Residential households consume more than{" "}
                      <strong className="text-blue-700">4 out of every 5 liters</strong> of all billed water in Tabaco City ({objResidential?.volShare || 86.7}%).
                    </p>
                  </div>
                </div>
              </div>

              {/* Visual Proportion Bar (100% of Billed Water) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">Total Billed Volume Share (100% = {billedVolume.toLocaleString()} m³)</span>
                  <span className="text-xs text-slate-400 font-mono">{totalAccounts.toLocaleString()} Accounts</span>
                </div>
                <div className="h-5 rounded-lg overflow-hidden flex bg-slate-100 shadow-inner">
                  {comparisonData.map(c => (
                    <div
                      key={c.name}
                      style={{ width: `${c.volShare}%`, backgroundColor: c.color }}
                      className="h-full relative group cursor-pointer transition-opacity hover:opacity-90 flex items-center justify-center text-[10px] text-white font-bold"
                      title={`${c.name}: ${c.volume.toLocaleString()} m³ (${c.volShare}%)`}
                    >
                      {c.volShare > 7 && `${c.volShare}%`}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px]">
                  {comparisonData.map(c => (
                    <div key={c.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="font-medium text-slate-700">{c.name}:</span>
                      <span className="font-mono text-slate-500">{c.volume.toLocaleString()} m³ ({c.volShare}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {comparisonData.map(c => (
                  <div
                    key={c.name}
                    onClick={() => {
                      setClassA(c.name)
                      setClassB(c.name === "Residential" ? "Commercial" : "Residential")
                      setActiveTab("compare")
                    }}
                    className="p-4 rounded-xl border border-slate-200 hover:border-[#0038A8] hover:shadow-md transition-all cursor-pointer bg-white group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {c.volShare}%
                        </span>
                      </div>
                      <p className="text-xl font-bold font-mono text-slate-900">{c.volume.toLocaleString()} <span className="text-xs font-normal text-slate-400">m³</span></p>
                      <p className="text-xs text-slate-500 mt-1">
                        {c.accounts.toLocaleString()} active accounts ({(c.accounts / totalAccounts * 100).toFixed(1)}%)
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Avg per customer:</span>
                        <span className="font-semibold text-slate-800 font-mono">{c.avgVol} m³/mo</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Revenue generated:</span>
                        <span className="font-semibold text-slate-800 font-mono">₱{(c.revenue / 1000).toFixed(0)}k</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0038A8] group-hover:underline pt-1">
                        Compare with other classes <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Volume Comparison Graph */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Graph: Billed Water Volume by Customer Class (m³)
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <RTooltip content={(p: any) => <ChartTip {...p} fmt={v => `${v.toLocaleString()} m³ (${((v / billedVolume) * 100).toFixed(1)}% of billed total)`} />} />
                      <Bar dataKey="volume" name="Billed Volume (m³)" radius={[6, 6, 0, 0]}>
                        {comparisonData.map(c => <Cell key={c.name} fill={c.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Cross-Class Revenue & Tariff Dynamics */}
          {activeTab === "cross" && (
            <div className="space-y-6">
              {/* Narrative Banner 2 */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50/60 rounded-xl p-4 border border-emerald-200/70">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Narrative 2: Why Water Volume Does Not Equal Revenue (Cross-Class Comparison)
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      You might expect a customer class using {objResidential?.volShare || 86.7}% of the water to generate {objResidential?.volShare || 86.7}% of the revenue. But in water utility economics, it doesn't work that way!
                    </p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      <strong className="text-emerald-800 font-semibold">The Social Tariff System:</strong> Residential water is kept affordable (averaging <strong className="text-slate-900">₱{objResidential?.effectiveRate.toFixed(2) || '28.26'}/m³</strong>) because clean water is a basic human necessity. To keep TCWD financially sustainable, Commercial and Government classes pay premium commercial rates (<strong className="text-slate-900">₱{commClass?.effectiveRate.toFixed(2) || '85.27'} to ₱{govClass?.effectiveRate.toFixed(2) || '50.74'}/m³</strong>).
                    </p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      <strong className="text-slate-800">The Big Result:</strong> Commercial, Government, and Semi-Commercial accounts use only <strong className="text-slate-900 font-bold">{nonResVolShare}% of the water</strong>, but generate over <strong className="text-emerald-700 font-bold">{nonResRevShare}% (₱{(nonResRevenue / 1_000_000).toFixed(2)} Million)</strong> of the district's revenue!
                    </p>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Visual Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Graph A: Volume % vs Revenue % */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-slate-800">Volume Share % vs. Revenue Share %</h4>
                    <span className="text-[10px] text-slate-400">Class contribution comparison</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-4">
                    Compares what percentage of water each class uses against what percentage of money it generates.
                  </p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} unit="%" />
                        <RTooltip content={(p: any) => <ChartTip {...p} fmt={v => `${v}%`} />} />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                        <Bar dataKey="volShare" name="Share of Water Billed (%)" fill="#0038A8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="revShare" name="Share of Revenue Generated (%)" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Graph B: Effective Rate per m³ */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-slate-800">Effective Tariff Rate (₱ per m³)</h4>
                    <span className="text-[10px] text-slate-400">Revenue yield per m³</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-4">
                    How much revenue TCWD collects per cubic meter of water delivered to each class.
                  </p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tariffData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} unit="₱" />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} width={105} />
                        <RTooltip content={(p: any) => <ChartTip {...p} fmt={v => `₱${v.toFixed(2)} / m³`} />} />
                        <ReferenceLine x={avgTariffYield} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: `District Avg: ₱${avgTariffYield.toFixed(2)}`, fill: "#B45309", fontSize: 9, position: "top" }} />
                        <Bar dataKey="effectiveRate" name="Effective Rate (₱/m³)" radius={[0, 6, 6, 0]}>
                          {tariffData.map(c => <Cell key={c.name} fill={c.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Plain English Comparison Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">
                    Cross-Class Revenue & Efficiency Summary Table
                  </h4>
                  <span className="text-[11px] text-slate-500">{kpi.latestMonth || "December 2025"}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-4">Customer Class</th>
                        <th className="py-2.5 px-4 text-right">Billed Volume</th>
                        <th className="py-2.5 px-4 text-right">Vol Share</th>
                        <th className="py-2.5 px-4 text-right">Total Revenue</th>
                        <th className="py-2.5 px-4 text-right">Rev Share</th>
                        <th className="py-2.5 px-4 text-right">Effective Rate</th>
                        <th className="py-2.5 px-4 text-right">Avg Bill / Acct</th>
                        <th className="py-2.5 px-4">Executive Summary Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {comparisonData.map(c => (
                        <tr key={c.name} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold flex items-center gap-2 text-slate-900">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">{c.volume.toLocaleString()} m³</td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-blue-600">{c.volShare}%</td>
                          <td className="py-3 px-4 text-right font-mono">₱{c.revenue.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">{c.revShare}%</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">₱{c.effectiveRate.toFixed(2)}/m³</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700">₱{c.avgBill.toLocaleString()}/mo</td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {c.name === "Residential" && `Volume anchor; subsidized rate for ${c.accounts.toLocaleString()} households`}
                            {c.name === "Commercial" && `High-tariff cross-subsidy; pays ${(c.effectiveRate / (objResidential?.effectiveRate || 1)).toFixed(2)}× residential rate`}
                            {c.name === "Government" && `Highest revenue yield; ₱${c.avgBill.toLocaleString()}/mo bill per connection`}
                            {c.name === "Semi-Commercial" && "Neighborhood retail and small family enterprise rate"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Head-to-Head Class Comparison */}
          {activeTab === "compare" && (
            <div className="space-y-6">
              {/* Presets and Selectors */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Scale size={14} className="text-[#0038A8]" /> Choose Two Classes to Compare Head-to-Head
                  </h4>
                  {/* Quick preset buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-medium">Quick Presets:</span>
                    <button
                      onClick={() => { setClassA("Residential"); setClassB("Commercial") }}
                      className="text-[11px] px-2 py-1 rounded bg-white border border-slate-200 hover:border-[#0038A8] text-slate-700 transition-colors"
                    >
                      Residential vs Commercial
                    </button>
                    <button
                      onClick={() => { setClassA("Residential"); setClassB("Government") }}
                      className="text-[11px] px-2 py-1 rounded bg-white border border-slate-200 hover:border-[#0038A8] text-slate-700 transition-colors"
                    >
                      Residential vs Government
                    </button>
                    <button
                      onClick={() => { setClassA("Commercial"); setClassB("Government") }}
                      className="text-[11px] px-2 py-1 rounded bg-white border border-slate-200 hover:border-[#0038A8] text-slate-700 transition-colors"
                    >
                      Commercial vs Government
                    </button>
                    <button
                      onClick={() => { setClassA("Commercial"); setClassB("Semi-Commercial") }}
                      className="text-[11px] px-2 py-1 rounded bg-white border border-slate-200 hover:border-[#0038A8] text-slate-700 transition-colors"
                    >
                      Commercial vs Semi-Comm.
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Class A (Base)</label>
                    <select
                      value={classA}
                      onChange={e => setClassA(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0038A8]/20 focus:border-[#0038A8]"
                    >
                      {CUSTOMER_CLASS.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Class B (Compare Against)</label>
                    <select
                      value={classB}
                      onChange={e => setClassB(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0038A8]/20 focus:border-[#0038A8]"
                    >
                      {CUSTOMER_CLASS.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Head-to-Head Comparison Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Class A Card */}
                <div className="p-5 rounded-xl border-2 bg-white" style={{ borderColor: objA.color }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: objA.color }} />
                    <h3 className="text-base font-bold text-slate-900">{objA.name}</h3>
                  </div>
                  <div className="space-y-3 mt-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Monthly Billed Volume</span>
                      <span className="text-lg font-bold font-mono text-slate-900">{objA.volume.toLocaleString()} m³</span>
                      <span className="text-[10px] text-blue-600 block">{objA.volShare}% of total billed water</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Monthly Billed Revenue</span>
                      <span className="text-lg font-bold font-mono text-emerald-600">₱{objA.revenue.toLocaleString()}</span>
                      <span className="text-[10px] text-emerald-600 block">{objA.revShare}% of total revenue</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-between">
                      <span className="text-slate-500">Effective Rate:</span>
                      <span className="font-bold font-mono text-slate-900">₱{objA.effectiveRate.toFixed(2)}/m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Consumption / Acct:</span>
                      <span className="font-bold font-mono text-slate-900">{objA.avgVol} m³/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Monthly Bill:</span>
                      <span className="font-bold font-mono text-slate-900">₱{objA.avgBill.toLocaleString()}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Accounts:</span>
                      <span className="font-bold font-mono text-slate-900">{objA.accounts.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Multiplier / Comparison Delta Column */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col justify-center space-y-4 text-xs">
                  <div className="text-center pb-2 border-b border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Head-to-Head Ratio</span>
                    <span className="text-xs font-semibold text-slate-700">{objA.name} vs. {objB.name}</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 block font-medium">Volume Multiplier</span>
                    <span className="text-base font-bold font-mono text-[#0038A8]">
                      {Number(volRatio) >= 1 ? `${volRatio}× more` : `${(1 / Number(volRatio)).toFixed(1)}× less`}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {objA.volume > objB.volume ? `${objA.name} consumes more` : `${objB.name} consumes more`}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 block font-medium">Revenue Multiplier</span>
                    <span className="text-base font-bold font-mono text-emerald-600">
                      {Number(revRatio) >= 1 ? `${revRatio}× more` : `${(1 / Number(revRatio)).toFixed(1)}× less`}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {objA.revenue > objB.revenue ? `${objA.name} earns more` : `${objB.name} earns more`}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 block font-medium">Tariff Rate Difference</span>
                    <span className="text-base font-bold font-mono text-purple-700">
                      ₱{Math.abs(objA.effectiveRate - objB.effectiveRate).toFixed(2)}/m³
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {objA.effectiveRate > objB.effectiveRate ? `${objA.name} rate is higher` : `${objB.name} rate is higher`}
                    </span>
                  </div>
                </div>

                {/* Class B Card */}
                <div className="p-5 rounded-xl border-2 bg-white" style={{ borderColor: objB.color }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: objB.color }} />
                    <h3 className="text-base font-bold text-slate-900">{objB.name}</h3>
                  </div>
                  <div className="space-y-3 mt-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Monthly Billed Volume</span>
                      <span className="text-lg font-bold font-mono text-slate-900">{objB.volume.toLocaleString()} m³</span>
                      <span className="text-[10px] text-blue-600 block">{objB.volShare}% of total billed water</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Monthly Billed Revenue</span>
                      <span className="text-lg font-bold font-mono text-emerald-600">₱{objB.revenue.toLocaleString()}</span>
                      <span className="text-[10px] text-emerald-600 block">{objB.revShare}% of total revenue</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-between">
                      <span className="text-slate-500">Effective Rate:</span>
                      <span className="font-bold font-mono text-slate-900">₱{objB.effectiveRate.toFixed(2)}/m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Consumption / Acct:</span>
                      <span className="font-bold font-mono text-slate-900">{objB.avgVol} m³/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Monthly Bill:</span>
                      <span className="font-bold font-mono text-slate-900">₱{objB.avgBill.toLocaleString()}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Accounts:</span>
                      <span className="font-bold font-mono text-slate-900">{objB.accounts.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Plain-English Narrative between Class A and Class B */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5">
                <h4 className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1.5">
                  <Info size={14} className="text-[#0038A8]" /> Executive Story: {objA.name} vs. {objB.name}
                </h4>
                <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                  {classA === classB ? (
                    <p>Please select two different customer classes above to see their comparative narrative.</p>
                  ) : (
                    <>
                      <p>
                        • <strong>Water Volume Ratio:</strong> {objA.name} accounts consume{" "}
                        <strong>{objA.volume.toLocaleString()} m³</strong> ({objA.volShare}%) compared to {objB.name}'s{" "}
                        <strong>{objB.volume.toLocaleString()} m³</strong> ({objB.volShare}%). That makes {objA.name}{" "}
                        <strong>{volRatio}×</strong> the water demand of {objB.name}.
                      </p>
                      <p>
                        • <strong>Revenue Generation:</strong> {objA.name} contributes{" "}
                        <strong>₱{objA.revenue.toLocaleString()}</strong> ({objA.revShare}% of district total) versus {objB.name}'s{" "}
                        <strong>₱{objB.revenue.toLocaleString()}</strong> ({objB.revShare}%).
                      </p>
                      <p>
                        • <strong>Rate & Billing Dynamics:</strong> {objA.name} pays an average effective tariff of{" "}
                        <strong>₱{objA.effectiveRate.toFixed(2)}/m³</strong>, while {objB.name} pays{" "}
                        <strong>₱{objB.effectiveRate.toFixed(2)}/m³</strong> (a difference of ₱{Math.abs(objA.effectiveRate - objB.effectiveRate).toFixed(2)}/m³).
                        Consequently, the average monthly bill for a {objA.name} customer is{" "}
                        <strong>₱{objA.avgBill.toLocaleString()}</strong> vs. <strong>₱{objB.avgBill.toLocaleString()}</strong> for a {objB.name} customer.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <HelpCircle size={13} className="text-slate-400" />
            <span>Tariff structure complies with LWUA regulatory guidelines</span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigate && (
              <button
                onClick={() => {
                  onClose()
                  onNavigate("descriptive")
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
              >
                Open in Descriptive Screen →
              </button>
            )}
            <button
              onClick={onClose}
              className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-[#0038A8] text-white hover:bg-[#002D80] transition-colors shadow-xs"
            >
              Done / Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── SCREEN: DASHBOARD ──────────────────────────────────────────────────────
function DashboardScreen({ onNavigate }: { onNavigate?: (s: ScreenId) => void }) {
  const { kpi, top10Zones, annualTrend, customerClasses, refresh, loading, isLive } = useDashboard()
  const [drilldownOpen, setDrilldownOpen] = useState(false)
  const [drilldownTab, setDrilldownTab] = useState<"total" | "cross" | "compare">("total")
  const [drilldownClass, setDrilldownClass] = useState<string>("Residential")
  // Real 3-month prior period from Supabase (e.g. Sep '25 vs Dec '25)
  const p3 = kpi.comparisonPeriods?.find(p => p.monthsAgo === 3) || kpi.comparisonPeriods?.[2]
  const p2 = kpi.comparisonPeriods?.find(p => p.monthsAgo === 2) || kpi.comparisonPeriods?.[1]
  const p1 = kpi.comparisonPeriods?.find(p => p.monthsAgo === 1) || kpi.comparisonPeriods?.[0]

  // Real 4-month longitudinal trend trajectories feeding the moving sparklines
  const accountsSpark = [
    p3?.accounts ?? 17890,
    p2?.accounts ?? 18120,
    p1?.accounts ?? 18453,
    kpi.totalAccounts,
  ]
  const consumptionSpark = [
    p3?.consumption ?? 339200,
    p2?.consumption ?? 347500,
    p1?.consumption ?? 358173,
    kpi.totalConsumption,
  ]
  const revenueSpark = [
    p3?.revenue ?? 8950000,
    p2?.revenue ?? 9210000,
    p1?.revenue ?? 9633724,
    kpi.totalRevenue,
  ]
  const avgPerAccountSpark = [
    p3?.avgPerAccount ?? 19.0,
    p2?.avgPerAccount ?? 19.2,
    p1?.avgPerAccount ?? 19.4,
    kpi.avgPerAccount,
  ]

  const accountsDelta3M = p3 ? p3.accountsChangePct : 10.1
  const consumptionDelta3M = p3 ? p3.consumptionChangePct : 13.4
  const revenueDelta3M = p3 ? p3.revenueChangePct : 42.7
  const avgDelta3M = p3 ? p3.avgPerAccountChangePct : 2.6

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900">Dashboard — Tabaco City Water District</h1>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Supabase Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Connecting Supabase...
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{kpi.latestMonth || "December 2025"} · Live Operations Overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-2 shadow-2xs">
            <Calendar size={13} className="text-slate-400" /> {kpi.latestMonth || "Dec 2025"}
          </div>
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#0038A8] rounded-lg px-3 py-2 hover:bg-[#002D80] disabled:opacity-60 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      {/* KPI row — Clean first design with 3-month comparative baseline and animated moving sparkline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Accounts"
          value={kpi.totalAccounts.toLocaleString()}
          change={accountsDelta3M}
          changeLabel="vs previous last 3 months"
          color="#0038A8"
          sparkData={accountsSpark}
        />
        <KPICard
          title="Total Consumption"
          value={kpi.totalConsumption.toLocaleString()}
          unit="m³"
          change={consumptionDelta3M}
          changeLabel="vs previous last 3 months"
          color="#0284C7"
          sparkData={consumptionSpark}
        />
        <KPICard
          title="Total Revenue"
          value={`₱${(kpi.totalRevenue / 1_000_000).toFixed(2)}M`}
          change={revenueDelta3M}
          changeLabel="vs previous last 3 months"
          color="#10B981"
          sparkData={revenueSpark}
        />
        <KPICard
          title="Avg per Account"
          value={kpi.avgPerAccount.toFixed(1)}
          unit="m³"
          change={avgDelta3M}
          changeLabel="vs previous last 3 months"
          color="#F59E0B"
          sparkData={avgPerAccountSpark}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-4">
        {/* Left column */}
        <div className="space-y-4">
          <ChartCard title={`Consumption by Zone — ${kpi.latestMonth || "Dec 2025"} (Top 10)`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={top10Zones} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <XAxis key="xaxis" type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis key="yaxis" type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} width={130} axisLine={false} tickLine={false} />
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} fmt={v => `${v.toLocaleString()} m³`} />} />
                <Bar key="bar-consumption" dataKey="consumption" name="Consumption m³" fill="#0038A8" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {top10Zones.map((z, i) => (
                    <Cell key={`zone-${i}`} fill={z.status === "critical" ? "#D32F2F" : z.status === "warning" ? "#F59E0B" : "#0038A8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={`Annual Consumption Trend — 2017 to ${kpi.latestYear || 2025}`}>
            {/* Gradient defined outside recharts SVG to avoid duplicate <defs> siblings */}
            <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
              <defs>
                <linearGradient id="consGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0038A8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0038A8" stopOpacity={0} />
                </linearGradient>
              </defs>
            </svg>
            <div className="flex items-center justify-between text-[11px] mb-2 px-1">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#0038A8]" />
                  Billed Consumption (m³)
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-[#F59E0B]" />
                  NRW Loss (%)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Dual-Axis: m³ (L) · % (R)</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={annualTrend} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis key="xaxis" dataKey="year" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis key="yaxis-left" yAxisId="left" orientation="left" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis key="yaxis-right" yAxisId="right" orientation="right" domain={[0, 50]} ticks={[0, 10, 20, 30, 40, 50]}
                  width={36} tick={{ fontSize: 10, fill: "#D97706" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`} />
                <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} fmt={(v,n) => n.includes("NRW") ? `${v}%` : `${v.toLocaleString()} m³`} />} />
                <Area key="area-consumption" yAxisId="left" type="monotone" dataKey="consumption" name="Consumption m³" stroke="#0038A8" strokeWidth={2.5}
                  fill="url(#consGrad)" dot={{ fill: "#0038A8", r: 3, strokeWidth: 0 }} activeDot={false} />
                <Line key="line-nrw" yAxisId="right" type="monotone" dataKey="nrw" name="NRW %" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 3"
                  dot={{ fill: "#F59E0B", r: 2.5, strokeWidth: 0 }} activeDot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* NRW Status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-0.5">Non-Revenue Water Status</h3>
            {/* Plain-language description for non-technical readers */}
            <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
              <span className="font-medium text-slate-500">What is NRW?</span> — Water that is produced and pumped out but never billed to any customer. It includes pipe leaks, meter errors, and illegal connections. The lower the percentage, the better.
            </p>
            <p className="text-xs text-slate-500 mb-3">LWUA Standard: ≤20% · Current: <span className={`font-semibold ${kpi.nrwPct > 20 ? "text-red-500" : "text-emerald-600"}`}>{kpi.nrwPct.toFixed(1)}% {kpi.nrwPct > 20 ? "↑" : "✓"}</span></p>
            <NRWGauge value={kpi.nrwPct} target={20} max={40} />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 mb-1">Billed Volume</p>
                <p className="font-mono font-bold text-slate-900 text-sm">{Math.round(kpi.totalConsumption).toLocaleString()} m³</p>
                <p className="text-[10px] text-slate-400">{(100 - kpi.nrwPct).toFixed(1)}% of production</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 relative group">
                <p className="text-[10px] text-red-500 mb-1 font-semibold">NRW System Loss</p>
                <p className="font-mono font-bold text-red-600 text-sm">{Math.round(kpi.totalConsumption * (kpi.nrwPct / (100 - kpi.nrwPct || 1))).toLocaleString()} m³</p>
                <p className="text-[10px] text-red-400">₱{((kpi.totalRevenue / (kpi.totalConsumption || 1)) * (kpi.totalConsumption * (kpi.nrwPct / (100 - kpi.nrwPct || 1))) / 1_000_000).toFixed(2)}M/mo loss</p>
                {/* Tooltip for non-technical users */}
                <div className="absolute bottom-full left-0 mb-2 w-52 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  This is the volume of water lost every month — through leaks, faulty meters, or unauthorized use — that the district cannot charge or collect payment for.
                  <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-800" />
                </div>
              </div>
            </div>
          </div>

          {/* Customer Class Donut with Drilldown */}
          {(() => {
            const CUSTOMER_CLASS = customerClasses
            const billedVolume = CUSTOMER_CLASS.reduce((s, c) => s + c.value, 0)
            const nrwVolume = Math.round(billedVolume * (kpi.nrwPct / (100 - kpi.nrwPct || 1)))
            const totalProduction = billedVolume + nrwVolume
            const largestClass = CUSTOMER_CLASS.reduce((a, b) => a.value > b.value ? a : b, CUSTOMER_CLASS[0])
            const largestPct = billedVolume > 0 ? ((largestClass.value / billedVolume) * 100).toFixed(0) : "0"
            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm relative">
                <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      Customer Class Distribution
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Of the <span className="font-semibold text-slate-600">{totalProduction.toLocaleString()} m³</span> total production,{" "}
                      <span className="font-semibold text-slate-600">{billedVolume.toLocaleString()} m³</span> was billed — here's how it breaks down by customer type
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setDrilldownClass("Residential")
                      setDrilldownTab("total")
                      setDrilldownOpen(true)
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#0038A8] bg-[#0038A8]/10 hover:bg-[#0038A8]/20 border border-[#0038A8]/20 px-2.5 py-1.5 rounded-lg transition-all shadow-2xs flex-shrink-0 ml-2 cursor-pointer group"
                    title="Click to open cross-class comparison & revenue analysis"
                  >
                    <Sparkles size={11} className="text-[#0038A8] group-hover:scale-110 transition-transform" />
                    <span>Drill Down ↗</span>
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex-1 relative cursor-pointer group"
                      onClick={() => {
                        setDrilldownClass("Residential")
                        setDrilldownTab("total")
                        setDrilldownOpen(true)
                      }}
                      title="Click donut to open Customer Class Drill Down"
                    >
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie key="donut" data={CUSTOMER_CLASS} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                            dataKey="value" paddingAngle={2} className="cursor-pointer">
                            {CUSTOMER_CLASS.map((c, i) => <Cell key={`pie-${i}`} fill={c.color} />)}
                          </Pie>
                          <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} fmt={v => `${v.toLocaleString()} m³ (Click to drill down)`} />} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center label — billed total inside the donut */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none group-hover:scale-105 transition-transform">
                        <span className="text-[10px] text-slate-400 leading-none">Billed</span>
                        <span className="text-sm font-bold text-slate-800 font-mono leading-tight">{billedVolume.toLocaleString()}</span>
                        <span className="text-[9px] text-slate-400 leading-none">m³</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      {CUSTOMER_CLASS.map(c => {
                        const pct = ((c.value / billedVolume) * 100).toFixed(1)
                        const avg = (c.value / c.accounts).toFixed(1)
                        return (
                          <div
                            key={c.name}
                            onClick={() => {
                              setDrilldownClass(c.name)
                              setDrilldownTab("cross")
                              setDrilldownOpen(true)
                            }}
                            className="flex items-start gap-1.5 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
                            title={`Click to compare ${c.name} revenue and volume`}
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: c.color }} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-semibold text-slate-700 truncate group-hover:text-[#0038A8] transition-colors">{c.name}</p>
                                <span className="text-[9px] text-[#0038A8] opacity-0 group-hover:opacity-100 transition-opacity font-semibold">Drill →</span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono">{c.value.toLocaleString()} m³ · {pct}%</p>
                              <p className="text-[9px] text-slate-400">avg <span className="font-semibold text-slate-500">{avg} m³</span>/acct · {c.accounts.toLocaleString()} accts</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {/* Narrative — water balance connection */}
                  <div className="mt-3 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                    <p className="text-[10px] text-blue-700 leading-relaxed">
                      <span className="font-bold">Water Balance:</span>{" "}
                      <span className="font-semibold">{totalProduction.toLocaleString()} m³</span> produced →{" "}
                      <span className="font-semibold">{billedVolume.toLocaleString()} m³</span> billed ({(100 - kpi.nrwPct).toFixed(0)}%) +{" "}
                      <span className="font-semibold text-red-600">{nrwVolume.toLocaleString()} m³</span> lost to NRW ({kpi.nrwPct.toFixed(0)}%).{" "}
                      {largestClass.name} drives <span className="font-bold">{largestPct}%</span> of billed demand from {largestClass.accounts.toLocaleString()} connections.
                    </p>
                  </div>

                  {/* Interactive Drilldown Prompt button */}
                  <button
                    onClick={() => {
                      setDrilldownClass("Residential")
                      setDrilldownTab("total")
                      setDrilldownOpen(true)
                    }}
                    className="w-full mt-2.5 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-slate-700 text-[10px] font-semibold flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Sparkles size={11} className="text-[#0038A8]" />
                      Click for Drill Down: Total Billed vs Class & Revenue Comparisons
                    </span>
                    <ArrowRight size={11} className="text-slate-400 group-hover:text-[#0038A8] group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>

                {/* Drill Down Modal */}
                <CustomerClassDrilldownModal
                  isOpen={drilldownOpen}
                  onClose={() => setDrilldownOpen(false)}
                  initialTab={drilldownTab}
                  initialClass={drilldownClass}
                  onNavigate={onNavigate}
                />
              </div>
            )
          })()}

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

// ── K-MEANS & RFM CONSUMER PROFILING DATA (§2.1.7) ───────────────────────────
const KMEANS_CLUSTERS_DATA = [
  {
    id: 1,
    name: "Cluster 1: High-Volume Commercial & Institutional",
    shortName: "Commercial High-Yield",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    color: "#8B5CF6",
    accounts: 2244,
    shareAccountsPct: 8.4,
    volumeM3PerMo: 318648,
    shareVolumePct: 41.2,
    revenuePhpPerMo: 2001510,
    shareRevenuePct: 38.6,
    avgConsumptionM3: 142.0,
    collectionEfficiencyPct: 98.2,
    rfm: {
      recencyDays: 1.2,
      recencyScore: "5/5 · Active Daily",
      recencyPct: 96,
      frequencyDays: 30.0,
      frequencyScore: "5/5 · Continuous Flow",
      frequencyPct: 100,
      monetaryPhp: 18400,
      monetaryScore: "5/5 · High Revenue Tier",
      monetaryPct: 95
    },
    profileDescription: "Major agro-industrial processing plants, hotel resorts, central public market stalls, shopping centers, and provincial government facilities. Operates under continuous daytime flow with strict pressure tolerances.",
    prescriptivePolicy: "Deploy Automated Meter Reading (AMR/AMI) telemetry with 15-minute sampling intervals. Enforce Time-of-Use peak shaving surcharges and mandatory certified backflow preventer inspections.",
    riskFlag: "Revenue Sensitivity: Top 5 accounts drive 14.8% of district total billing; vulnerable to localized pressure sags."
  },
  {
    id: 2,
    name: "Cluster 2: Baseline Steady Residential Core",
    shortName: "Residential Backbone",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    color: "#0038A8",
    accounts: 17154,
    shareAccountsPct: 64.2,
    volumeM3PerMo: 360234,
    shareVolumePct: 46.5,
    revenuePhpPerMo: 2182560,
    shareRevenuePct: 42.1,
    avgConsumptionM3: 21.0,
    collectionEfficiencyPct: 94.6,
    rfm: {
      recencyDays: 4.8,
      recencyScore: "4/5 · Standard 30-Day Cycle",
      recencyPct: 82,
      frequencyDays: 28.5,
      frequencyScore: "5/5 · Daily Household Use",
      frequencyPct: 95,
      monetaryPhp: 385,
      monetaryScore: "3/5 · Subsidized Lifeline",
      monetaryPct: 58
    },
    profileDescription: "Core single-family domestic connections spread across 20 Tabaco barangays. Demonstrates rigid morning (06:00-08:00) and evening (18:00-20:00) diurnal peaks with high bill compliance.",
    prescriptivePolicy: "Maintain LWUA-mandated subsidized lifeline tariff for 0–10 m³ blocks. Trigger automated SMS leak advisories when household billing spikes >30% over 3-month rolling median.",
    riskFlag: "Hydraulic vulnerability: Rapid pressure drops during evening peak hours in elevated zones (Zones 2, 7, 15)."
  },
  {
    id: 3,
    name: "Cluster 3: Seasonal Volatile & Peaking Accounts",
    shortName: "Seasonal Peaking Risk",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    color: "#F59E0B",
    accounts: 4943,
    shareAccountsPct: 18.5,
    volumeM3PerMo: 61787,
    shareVolumePct: 8.0,
    revenuePhpPerMo: 637660,
    shareRevenuePct: 12.3,
    avgConsumptionM3: 38.0,
    collectionEfficiencyPct: 88.4,
    rfm: {
      recencyDays: 8.4,
      recencyScore: "3/5 · Irregular Active",
      recencyPct: 65,
      frequencyDays: 21.0,
      frequencyScore: "3/5 · Weather Variable",
      frequencyPct: 70,
      monetaryPhp: 712,
      monetaryScore: "3/5 · Moderate Variable",
      monetaryPct: 68
    },
    profileDescription: "Agricultural backyard irrigators, commercial carwash enterprises, secondary vacation households, and construction sites with high temperature sensitivity (+65% surge during hot/dry months).",
    prescriptivePolicy: "Incentivize on-site rainwater harvesting tanks. Enact drought conservation tariffs during PAGASA El Niño advisories; schedule pressure step-down between 13:00 and 16:00.",
    riskFlag: "Primary cause of unexpected distribution drawdown during April–May dry season peaks."
  },
  {
    id: 4,
    name: "Cluster 4: High-Deficit & Delinquency-Risk Accounts",
    badgeColor: "bg-red-100 text-red-800 border-red-200",
    shortName: "Intervention Priority",
    color: "#EF4444",
    accounts: 2378,
    shareAccountsPct: 8.9,
    volumeM3PerMo: 33767,
    shareVolumePct: 4.3,
    revenuePhpPerMo: 363200,
    shareRevenuePct: 7.0,
    avgConsumptionM3: 46.0,
    collectionEfficiencyPct: 52.1,
    rfm: {
      recencyDays: 64.2,
      recencyScore: "1/5 · >60 Days Overdue",
      recencyPct: 22,
      frequencyDays: 12.0,
      frequencyScore: "2/5 · Erratic / Stalled",
      frequencyPct: 40,
      monetaryPhp: 890,
      monetaryScore: "3/5 · Arrears Accumulation",
      monetaryPct: 62
    },
    profileDescription: "Connections characterized by aged mechanical meters (>10 years), repeated zero-consumption periods followed by sudden uncontrolled surges, and protracted billing collection lag.",
    prescriptivePolicy: "Immediate field inspection and acoustic leak sweep for underground bursts or unauthorized bypasses. Offer structured debt restructuring programs before issuing disconnection notices.",
    riskFlag: "High probability of unbilled physical loss (NRW) and bad-debt allowance impact."
  }
]

const KMEANS_SCATTER_DATA = [
  // Cluster 1: High-Volume Commercial (Volume: 90-250 m³, Bill: ₱12k-₱32k)
  { accountId: "TC-COM-1044", clusterId: 1, clusterName: "Commercial High-Yield", consumption: 168, bill: 21840, recency: 1.0, color: "#8B5CF6" },
  { accountId: "TC-IND-2081", clusterId: 1, clusterName: "Commercial High-Yield", consumption: 210, bill: 27300, recency: 1.5, color: "#8B5CF6" },
  { accountId: "TC-COM-3190", clusterId: 1, clusterName: "Commercial High-Yield", consumption: 142, bill: 18460, recency: 1.2, color: "#8B5CF6" },
  { accountId: "TC-GOV-0412", clusterId: 1, clusterName: "Commercial High-Yield", consumption: 185, bill: 24050, recency: 0.8, color: "#8B5CF6" },
  { accountId: "TC-COM-1109", clusterId: 1, clusterName: "Commercial High-Yield", consumption: 125, bill: 16250, recency: 1.4, color: "#8B5CF6" },
  { accountId: "TC-IND-0988", clusterId: 1, clusterName: "Commercial High-Yield", consumption: 240, bill: 31200, recency: 1.0, color: "#8B5CF6" },
  { accountId: "TC-COM-5021", clusterId: 1, clusterName: "Commercial High-Yield", consumption: 110, bill: 14300, recency: 1.8, color: "#8B5CF6" },

  // Cluster 2: Steady Residential Core (Volume: 12-32 m³, Bill: ₱220-₱580)
  { accountId: "TC-RES-8812", clusterId: 2, clusterName: "Residential Backbone", consumption: 18, bill: 324, recency: 4.2, color: "#0038A8" },
  { accountId: "TC-RES-9014", clusterId: 2, clusterName: "Residential Backbone", consumption: 22, bill: 396, recency: 5.0, color: "#0038A8" },
  { accountId: "TC-RES-7102", clusterId: 2, clusterName: "Residential Backbone", consumption: 15, bill: 270, recency: 3.8, color: "#0038A8" },
  { accountId: "TC-RES-6541", clusterId: 2, clusterName: "Residential Backbone", consumption: 26, bill: 468, recency: 4.5, color: "#0038A8" },
  { accountId: "TC-RES-4320", clusterId: 2, clusterName: "Residential Backbone", consumption: 20, bill: 360, recency: 5.2, color: "#0038A8" },
  { accountId: "TC-RES-5591", clusterId: 2, clusterName: "Residential Backbone", consumption: 24, bill: 432, recency: 4.9, color: "#0038A8" },
  { accountId: "TC-RES-3829", clusterId: 2, clusterName: "Residential Backbone", consumption: 19, bill: 342, recency: 5.5, color: "#0038A8" },
  { accountId: "TC-RES-2190", clusterId: 2, clusterName: "Residential Backbone", consumption: 28, bill: 504, recency: 3.5, color: "#0038A8" },

  // Cluster 3: Seasonal Volatile (Volume: 30-70 m³, Bill: ₱550-₱1,350)
  { accountId: "TC-AGR-4401", clusterId: 3, clusterName: "Seasonal Peaking", consumption: 42, bill: 756, recency: 7.5, color: "#F59E0B" },
  { accountId: "TC-RES-1198", clusterId: 3, clusterName: "Seasonal Peaking", consumption: 56, bill: 1008, recency: 8.2, color: "#F59E0B" },
  { accountId: "TC-SEM-3310", clusterId: 3, clusterName: "Seasonal Peaking", consumption: 35, bill: 630, recency: 9.0, color: "#F59E0B" },
  { accountId: "TC-RES-7782", clusterId: 3, clusterName: "Seasonal Peaking", consumption: 62, bill: 1116, recency: 8.8, color: "#F59E0B" },
  { accountId: "TC-COM-4102", clusterId: 3, clusterName: "Seasonal Peaking", consumption: 48, bill: 864, recency: 6.9, color: "#F59E0B" },
  { accountId: "TC-RES-9451", clusterId: 3, clusterName: "Seasonal Peaking", consumption: 39, bill: 702, recency: 9.5, color: "#F59E0B" },

  // Cluster 4: High-Deficit / Delinquency-Risk (Volume: 35-85 m³, Overdue Bill: ₱700-₱1,700)
  { accountId: "TC-DEL-6012", clusterId: 4, clusterName: "Intervention Priority", consumption: 52, bill: 936, recency: 58.0, color: "#EF4444" },
  { accountId: "TC-DEL-7821", clusterId: 4, clusterName: "Intervention Priority", consumption: 68, bill: 1224, recency: 72.0, color: "#EF4444" },
  { accountId: "TC-DEL-5190", clusterId: 4, clusterName: "Intervention Priority", consumption: 44, bill: 792, recency: 64.0, color: "#EF4444" },
  { accountId: "TC-DEL-8902", clusterId: 4, clusterName: "Intervention Priority", consumption: 76, bill: 1368, recency: 80.0, color: "#EF4444" },
  { accountId: "TC-DEL-3319", clusterId: 4, clusterName: "Intervention Priority", consumption: 38, bill: 684, recency: 48.0, color: "#EF4444" },
  { accountId: "TC-DEL-9120", clusterId: 4, clusterName: "Intervention Priority", consumption: 58, bill: 1044, recency: 69.0, color: "#EF4444" },
]

// ── SCREEN: DESCRIPTIVE ────────────────────────────────────────────────────
function DescriptiveScreen() {
  const { customerClasses: CUSTOMER_CLASS, heatmapData: HEATMAP_DATA, heatmapMonths: HEATMAP_MONTHS, topAccounts: TOP_ACCOUNTS } = useDashboard()
  const [activeClass, setActiveClass] = useState("All")
  const [selectedClusterId, setSelectedClusterId] = useState<number>(1)
  const [matrixView, setMatrixView] = useState<"line" | "heatmap">("line")
  const [lineScope, setLineScope] = useState<"top5" | "all" | "single">("top5")
  const [selectedFocusZone, setSelectedFocusZone] = useState<string>("")
  const classes = ["All", "Residential", "Commercial", "Government", "Semi-Commercial"]

  const totalBilled = CUSTOMER_CLASS.reduce((s, c) => s + c.value, 0) || 1

  // Class share of total consumption (used to scale heatmap when filtered)
  const CLASS_SHARE: Record<string, number> = {
    "Residential":     (CUSTOMER_CLASS.find(c => c.name === "Residential")?.value ?? 112840) / totalBilled,
    "Commercial":      (CUSTOMER_CLASS.find(c => c.name === "Commercial")?.value ?? 10680)  / totalBilled,
    "Government":      (CUSTOMER_CLASS.find(c => c.name === "Government")?.value ?? 11200)  / totalBilled,
    "Semi-Commercial": (CUSTOMER_CLASS.find(c => c.name === "Semi-Commercial")?.value ?? 4779) / totalBilled,
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

  const ZONE_PALETTE: Record<string, string> = {
    "Zone 01": "#2563EB", "Zone 1": "#2563EB",
    "Zone 02": "#DC2626", "Zone 2": "#DC2626",
    "Zone 03": "#7C3AED", "Zone 3": "#7C3AED",
    "Zone 04": "#059669", "Zone 4": "#059669",
    "Zone 05": "#D97706", "Zone 5": "#D97706",
    "Zone 06": "#0891B2", "Zone 6": "#0891B2",
    "Zone 07": "#DB2777", "Zone 7": "#DB2777",
    "Zone 08": "#4F46E5", "Zone 8": "#4F46E5",
    "Zone 09": "#65A30D", "Zone 9": "#65A30D",
    "Zone 10": "#9333EA",
    "Zone 11": "#EA580C",
    "Zone 12": "#0D9488",
    "Zone 13": "#475569",
    "Zone 14": "#B91C1C",
    "Zone 15": "#15803D",
    "Zone 16": "#C026D3",
    "Zone 17": "#0284C7",
    "Zone 18": "#B45309",
    "Zone 19": "#E11D48",
    "Zone 20": "#4338CA",
    "Zone 21": "#047857",
  }

  const getZoneStrokeColor = (zoneName: string, idx: number) => {
    return ZONE_PALETTE[zoneName] || ["#2563EB", "#DC2626", "#7C3AED", "#059669", "#D97706", "#0891B2", "#DB2777", "#4F46E5"][idx % 8]
  }

  // Pre-calculate line chart data strictly from real filteredHeatmap
  const lineChartData = useMemo(() => {
    return HEATMAP_MONTHS.map((month, mIdx) => {
      const point: Record<string, any> = { month }
      let total = 0
      filteredHeatmap.forEach(row => {
        const val = row.values[mIdx] ?? 0
        point[row.zone] = val
        total += val
      })
      point["City Average"] = filteredHeatmap.length > 0 ? Math.round(total / filteredHeatmap.length) : 0
      return point
    })
  }, [HEATMAP_MONTHS, filteredHeatmap])

  // Ranked zones by total consumption computed dynamically from real database rows
  const rankedZones = useMemo(() => {
    return [...filteredHeatmap]
      .map(row => {
        const total = row.values.reduce((s, v) => s + v, 0)
        const avg = row.values.length > 0 ? Math.round(total / row.values.length) : 0
        const peak = row.values.length > 0 ? Math.max(...row.values) : 0
        return {
          zone: row.zone,
          total,
          avg,
          peak,
          values: row.values,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [filteredHeatmap])

  const top5Zones = useMemo(() => {
    return rankedZones.slice(0, 5).map(z => z.zone)
  }, [rankedZones])

  // Effective focus zone for single deep-dive
  const activeFocusZone = selectedFocusZone || (rankedZones[0]?.zone ?? "Zone 01")

  // Dynamic system insights derived directly from real data
  const macroInsights = useMemo(() => {
    if (rankedZones.length === 0) {
      return {
        highestZone: "N/A",
        highestAvg: 0,
        lowestZone: "N/A",
        lowestAvg: 0,
        peakMonth: "N/A",
        peakVolume: 0,
      }
    }
    const top = rankedZones[0]
    const bottom = rankedZones[rankedZones.length - 1]

    let peakMonthName = HEATMAP_MONTHS[0] || "N/A"
    let maxMonthlyTotal = 0

    HEATMAP_MONTHS.forEach((m, mIdx) => {
      const mTotal = filteredHeatmap.reduce((acc, row) => acc + (row.values[mIdx] ?? 0), 0)
      if (mTotal > maxMonthlyTotal) {
        maxMonthlyTotal = mTotal
        peakMonthName = m
      }
    })

    return {
      highestZone: top.zone,
      highestAvg: top.avg,
      lowestZone: bottom.zone,
      lowestAvg: bottom.avg,
      peakMonth: peakMonthName,
      peakVolume: maxMonthlyTotal,
    }
  }, [rankedZones, filteredHeatmap, HEATMAP_MONTHS])

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
                    animate={{ width: c.dimmed ? "0%" : `${(c.value / 112840) * 100}%` }}
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

      {/* ── HISTORICAL CONSUMPTION: DUAL LINE GRAPH & HEATMAP VIEW ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card Header with View Switcher */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#0038A8]" />
              <h3 className="text-sm font-bold text-slate-800">
                Historical Consumption {matrixView === "line" ? "Longitudinal Trends" : "Matrix"} — Oct 2024 to Sep 2025
                {activeClass !== "All" && (
                  <span className="ml-2 text-[11px] font-medium text-white bg-[#0038A8] px-2 py-0.5 rounded-full">
                    {activeClass}
                  </span>
                )}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {matrixView === "line"
                ? "Zone-level monthly billing consumption curves against City Average baseline"
                : "Cross-sectional zone consumption intensity matrix across 12 billing cycles"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Selector (Line Graph vs Heatmap) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setMatrixView("line")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  matrixView === "line"
                    ? "bg-white text-[#0038A8] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TrendingUp size={13} />
                <span>Line Graph</span>
              </button>
              <button
                type="button"
                onClick={() => setMatrixView("heatmap")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  matrixView === "heatmap"
                    ? "bg-white text-[#0038A8] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Grid3x3 size={13} />
                <span>Heatmap</span>
              </button>
            </div>

            {/* Heatmap Legend (only in heatmap view) */}
            {matrixView === "heatmap" && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-500 pl-2 border-l border-slate-200">
                <span>Low</span>
                {["#DBEAFE","#93C5FD","#3B82F6","#1D4ED8"].map(c => (
                  <span key={c} className="w-4 h-2.5 rounded-xs inline-block" style={{ background: c }} />
                ))}
                <span>High</span>
              </div>
            )}
          </div>
        </div>

        {/* VIEW 1: LINE GRAPH (DEFAULT) */}
        {matrixView === "line" && (
          <div className="p-5 space-y-4">
            {/* Sub-controls: Scope selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">Display:</span>
                <button
                  type="button"
                  onClick={() => setLineScope("top5")}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    lineScope === "top5"
                      ? "bg-blue-50 text-[#0038A8] border border-blue-200 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  Top 5 Consuming Zones
                </button>
                <button
                  type="button"
                  onClick={() => setLineScope("single")}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    lineScope === "single"
                      ? "bg-blue-50 text-[#0038A8] border border-blue-200 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  Single Zone Focus
                </button>
                <button
                  type="button"
                  onClick={() => setLineScope("all")}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    lineScope === "all"
                      ? "bg-blue-50 text-[#0038A8] border border-blue-200 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  All Zones ({filteredHeatmap.length})
                </button>
              </div>

              {/* Single Zone Dropdown when single mode active */}
              {lineScope === "single" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Select Zone:</span>
                  <select
                    value={activeFocusZone}
                    onChange={(e) => setSelectedFocusZone(e.target.value)}
                    className="text-xs font-semibold bg-white border border-slate-300 rounded-md px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0038A8]"
                  >
                    {filteredHeatmap.map(row => (
                      <option key={row.zone} value={row.zone}>
                        {row.zone}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Recharts Line Graph Container */}
            <div className="w-full">
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={lineChartData} margin={{ left: 8, right: 16, top: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    stroke="#CBD5E1"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    stroke="#CBD5E1"
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    unit=" m³"
                  />
                  <RTooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.96)",
                      borderColor: "#E2E8F0",
                      borderRadius: "0.5rem",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      fontSize: "12px",
                    }}
                    formatter={(val: any, name: any) => [
                      `${Number(val).toLocaleString()} m³`,
                      String(name),
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "12px", fontSize: "11px" }}
                    iconType="circle"
                  />

                  {/* City Average Benchmark Line */}
                  <Line
                    type="monotone"
                    dataKey="City Average"
                    name="City Average"
                    stroke="#64748B"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />

                  {/* Render Lines based on Scope */}
                  {lineScope === "top5" &&
                    top5Zones.map((zName, idx) => (
                      <Line
                        key={zName}
                        type="monotone"
                        dataKey={zName}
                        name={zName}
                        stroke={getZoneStrokeColor(zName, idx)}
                        strokeWidth={2.5}
                        dot={{ r: 3, strokeWidth: 1.5, fill: "#fff" }}
                        activeDot={{ r: 6 }}
                      />
                    ))}

                  {lineScope === "single" && (
                    <Line
                      type="monotone"
                      dataKey={activeFocusZone}
                      name={activeFocusZone}
                      stroke="#0038A8"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                      activeDot={{ r: 7 }}
                    />
                  )}

                  {lineScope === "all" &&
                    filteredHeatmap.map((row, idx) => (
                      <Line
                        key={row.zone}
                        type="monotone"
                        dataKey={row.zone}
                        name={row.zone}
                        stroke={getZoneStrokeColor(row.zone, idx)}
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Dynamic Statistical Summary Strip (Calculated from real data) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">Highest Demand Zone</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{macroInsights.highestZone}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-[#0038A8]">
                    {macroInsights.highestAvg.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 block">m³/month avg</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">System Peak Month</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{macroInsights.peakMonth}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    {macroInsights.peakVolume.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 block">m³ total billed</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Baseline Zone</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{macroInsights.lowestZone}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {macroInsights.lowestAvg.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 block">m³/month avg</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: HEATMAP MATRIX */}
        {matrixView === "heatmap" && (
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
        )}
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

      {/* ── K-MEANS CONSUMER PROFILING & RFM CLUSTERING CARD (§2.1.7, Objective 3) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header with academic badges */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-[#0038A8]" />
              <h3 className="text-sm font-bold text-slate-800">
                Customer Segmentation &amp; K-Means Clustering (<span className="font-mono text-[#0038A8]">k = 4</span>)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Unsupervised machine learning consumer profiling based on Recency, Frequency, and Monetary (RFM) dimensions (§2.1.7)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
              Silhouette: S = 0.684
            </span>
            <span className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              Davies-Bouldin: 0.741
            </span>
            <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
              26,720 Active Accounts Profiled
            </span>
          </div>
        </div>

        {/* Cluster Tabs Navigation */}
        <div className="px-5 pt-3 border-b border-slate-100 bg-slate-50/50 flex gap-2 overflow-x-auto">
          {KMEANS_CLUSTERS_DATA.map(c => {
            const active = selectedClusterId === c.id
            return (
              <button
                key={c.id}
                onClick={() => setSelectedClusterId(c.id)}
                className={`flex items-center gap-2 text-xs font-semibold px-3.5 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap -mb-px ${
                  active
                    ? "border-[#0038A8] text-[#0038A8] bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span>{c.shortName}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  active ? "bg-blue-100 text-blue-800" : "bg-slate-200/70 text-slate-600"
                }`}>
                  {c.shareAccountsPct}%
                </span>
              </button>
            )
          })}
        </div>

        {/* Content Body: Scatter Chart (Left) + Selected Cluster Profile (Right) */}
        {(() => {
          const selected = KMEANS_CLUSTERS_DATA.find(c => c.id === selectedClusterId) || KMEANS_CLUSTERS_DATA[0]
          return (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left: 2D Scatter Chart (7 Cols) */}
                <div className="lg:col-span-7 bg-slate-50/60 rounded-xl p-4 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        2D Feature Space: Consumption (m³) vs. Monthly Billing (₱)
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Each point represents a sampled consumer connection; colored by K-Means cluster assignment
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Logarithmic variance scale</span>
                  </div>

                  <ResponsiveContainer width="100%" height={260}>
                    <ScatterChart margin={{ left: 8, right: 12, top: 12, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis
                        dataKey="consumption"
                        name="Consumption"
                        unit=" m³"
                        tick={{ fontSize: 10, fill: "#64748B" }}
                        axisLine={false}
                        tickLine={false}
                        label={{ value: "Monthly Consumption (m³)", position: "insideBottom", offset: -4, fontSize: 10, fill: "#64748B" }}
                      />
                      <YAxis
                        dataKey="bill"
                        name="Bill"
                        unit=" ₱"
                        tick={{ fontSize: 10, fill: "#64748B" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => v >= 1000 ? `₱${(v/1000).toFixed(0)}k` : `₱${v}`}
                      />
                      <RTooltip
                        content={(p: any) => {
                          if (!p.active || !p.payload?.length) return null
                          const d = p.payload[0].payload
                          return (
                            <div className="bg-slate-900/95 backdrop-blur text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1 font-mono border border-slate-700">
                              <p className="font-bold text-blue-300 font-sans flex items-center justify-between gap-3">
                                <span>{d.accountId}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-normal" style={{ backgroundColor: d.color }}>{d.clusterName}</span>
                              </p>
                              <p className="text-slate-300 text-[11px]">Consumption: <strong className="text-white">{d.consumption} m³</strong></p>
                              <p className="text-slate-300 text-[11px]">Monthly Bill: <strong className="text-white">₱{d.bill.toLocaleString()}</strong></p>
                              <p className="text-slate-400 text-[10px]">Payment Recency: <strong>{d.recency} days</strong></p>
                            </div>
                          )
                        }}
                      />
                      {/* Scatter for each cluster */}
                      {KMEANS_CLUSTERS_DATA.map(c => {
                        const pts = KMEANS_SCATTER_DATA.filter(p => p.clusterId === c.id)
                        const isFocus = selectedClusterId === c.id
                        return (
                          <Scatter
                            key={c.id}
                            name={c.shortName}
                            data={pts}
                            fill={c.color}
                            opacity={isFocus ? 0.95 : 0.4}
                            shape="circle"
                          />
                        )
                      })}
                    </ScatterChart>
                  </ResponsiveContainer>

                  {/* Scatter Legend */}
                  <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] pt-2 border-t border-slate-200/60 mt-1">
                    {KMEANS_CLUSTERS_DATA.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClusterId(c.id)}
                        className={`flex items-center gap-1.5 transition-opacity ${selectedClusterId === c.id ? "font-bold opacity-100" : "opacity-60 hover:opacity-100"}`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-slate-700">{c.shortName}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Selected Cluster Detail Card (5 Cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                  {/* Top Header Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selected.badgeColor}`}>
                          Cluster {selected.id}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">
                          {selected.name}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-bold text-slate-800">
                          {selected.accounts.toLocaleString()}
                        </span>
                        <p className="text-[10px] text-slate-400">accounts ({selected.shareAccountsPct}%)</p>
                      </div>
                    </div>

                    {/* 4 Mini Stat Badges */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <p className="text-[10px] text-slate-400">Monthly Revenue</p>
                        <p className="font-mono font-bold text-slate-800 mt-0.5">₱{(selected.revenuePhpPerMo / 1_000_000).toFixed(2)}M</p>
                        <p className="text-[9px] text-[#0038A8] font-medium">{selected.shareRevenuePct}% of District Total</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <p className="text-[10px] text-slate-400">Avg Account Use</p>
                        <p className="font-mono font-bold text-slate-800 mt-0.5">{selected.avgConsumptionM3} m³/mo</p>
                        <p className="text-[9px] text-emerald-600 font-medium">{selected.collectionEfficiencyPct}% Collection Eff.</p>
                      </div>
                    </div>

                    {/* RFM Quantitative Score Progress Bars */}
                    <div className="space-y-2 border-t border-slate-100 pt-2.5">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-500 font-medium">Recency (R): <strong className="text-slate-700">{selected.rfm.recencyDays} days avg</strong></span>
                          <span className="font-mono text-[10px] text-slate-500">{selected.rfm.recencyScore}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-600" style={{ width: `${selected.rfm.recencyPct}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-500 font-medium">Frequency (F): <strong className="text-slate-700">{selected.rfm.frequencyDays} billed days/mo</strong></span>
                          <span className="font-mono text-[10px] text-slate-500">{selected.rfm.frequencyScore}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${selected.rfm.frequencyPct}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-500 font-medium">Monetary (M): <strong className="text-slate-700">₱{selected.rfm.monetaryPhp.toLocaleString()}/mo avg</strong></span>
                          <span className="font-mono text-[10px] text-slate-500">{selected.rfm.monetaryScore}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-purple-500" style={{ width: `${selected.rfm.monetaryPct}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Behavioral Profile narrative */}
                    <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/50 leading-relaxed">
                      <strong className="text-slate-800">Operational Profile: </strong>
                      {selected.profileDescription}
                    </div>

                    {/* Prescriptive Policy & Risk Directive */}
                    <div className="bg-blue-50/70 border border-blue-200/60 rounded-lg p-3 text-[11px] space-y-1.5">
                      <div className="flex items-start gap-1.5 text-blue-900 font-semibold">
                        <Sparkles size={13} className="text-[#0038A8] flex-shrink-0 mt-0.5" />
                        <span>Prescriptive Utility Policy (§3.6.2):</span>
                      </div>
                      <p className="text-blue-800 leading-relaxed pl-4">
                        {selected.prescriptivePolicy}
                      </p>
                      <div className="pt-1 pl-4 text-[10px] text-amber-800 font-medium flex items-center gap-1">
                        <AlertTriangle size={11} className="text-amber-600 flex-shrink-0" />
                        <span>{selected.riskFlag}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cross-Cluster Comparative Synthesis Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <th className="px-4 py-2.5 text-left">K-Means Cluster</th>
                      <th className="px-3 py-2.5 text-center">Accounts (%)</th>
                      <th className="px-3 py-2.5 text-right">Volume Share</th>
                      <th className="px-3 py-2.5 text-right">Revenue Share</th>
                      <th className="px-3 py-2.5 text-right">Avg (m³/mo)</th>
                      <th className="px-3 py-2.5 text-center">Collection Eff.</th>
                      <th className="px-4 py-2.5 text-left">Primary Policy Directive</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {KMEANS_CLUSTERS_DATA.map(c => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedClusterId(c.id)}
                        className={`transition-colors cursor-pointer ${selectedClusterId === c.id ? "bg-blue-50/50 font-medium" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-4 py-3 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="font-semibold text-slate-800">{c.shortName}</span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-slate-700">
                          {c.accounts.toLocaleString()} ({c.shareAccountsPct}%)
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-700">
                          {c.volumeM3PerMo.toLocaleString()} m³ ({c.shareVolumePct}%)
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-slate-900">
                          ₱{(c.revenuePhpPerMo / 1_000_000).toFixed(2)}M ({c.shareRevenuePct}%)
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-700">
                          {c.avgConsumptionM3} m³
                        </td>
                        <td className="px-3 py-3 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.collectionEfficiencyPct >= 90 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}>
                            {c.collectionEfficiencyPct}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-[11px] leading-snug">
                          {c.prescriptivePolicy.split(". ")[0]}.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ── SCREEN: PREDICTIVE ─────────────────────────────────────────────────────
function PredictiveScreen() {
  const { predictive, isLive } = useDashboard()
  const [activeModel, setActiveModel] = useState<string>("Multivariate LSTM")
  const [compareAll, setCompareAll] = useState<boolean>(false)
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const models = predictive?.models || ["Multivariate LSTM", "SARIMA", "Meta Prophet", "XGBoost Regressor", "Ensemble Model"]

  const toggle = (key: string) => setHidden(prev => {
    const n = new Set(prev)
    n.has(key) ? n.delete(key) : n.add(key)
    return n
  })

  const curMetrics = predictive?.modelMetrics?.[activeModel] || {
    name: activeModel,
    rmse: "4,521 m³",
    mape: "3.24%",
    mae: "3,876 m³",
    r2: "0.962",
    trainTestSplit: "70% Train (76 mos) / 30% Test (32 mos)",
    trainingSamples: 76,
    testSamples: 32,
    regressors: ["Historical Demand (m³)", "PAGASA Max Temp (°C)", "PAGASA Rainfall (mm)", "Active Connections"],
    status: "Recommended Operational Model",
    note: "Superior capturing of non-linear dry season demand surge (+22% above baseline).",
    isBest: true,
  }

  // Model key for charting
  const modelKeyMap: Record<string, keyof typeof predictive.forecastData[0]> = {
    "Multivariate LSTM": "lstm",
    "SARIMA": "sarima",
    "Meta Prophet": "prophet",
    "XGBoost Regressor": "xgboost",
    "Ensemble Model": "ensemble",
  }

  const activeKey = modelKeyMap[activeModel] || "lstm"

  // Curated color palette for multi-model comparison
  const MODEL_COLORS: Record<string, string> = {
    "Multivariate LSTM": "#0038A8",
    "SARIMA": "#F59E0B",
    "Meta Prophet": "#10B981",
    "XGBoost Regressor": "#8B5CF6",
    "Ensemble Model": "#EC4899",
  }

  return (
    <div className="space-y-6">
      <style>{`@keyframes dashMove{to{stroke-dashoffset:-9}}.forecast-line-animated path{animation:dashMove 0.4s linear infinite}`}</style>

      {/* Header & Framework Alignment */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900">Demand Forecasting — Predictive Analytics Tier</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#0038A8] border border-blue-200">
              <Cpu size={11} className="text-[#0038A8]" />
              CRISP-DM · Tier 2 Intelligent Core
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Automated time-series models evaluated across a 70% Training / 30% Testing split (2017–2025) · Cross-validated with external PAGASA weather regressors
          </p>
        </div>

        {/* Model Tabs & Compare Switch */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
            <input
              type="checkbox"
              id="compareAll"
              checked={compareAll}
              onChange={e => setCompareAll(e.target.checked)}
              className="rounded text-[#0038A8] focus:ring-0 cursor-pointer"
            />
            <label htmlFor="compareAll" className="cursor-pointer select-none font-medium">Compare All 5 Models</label>
          </div>

          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200/60 shadow-2xs overflow-x-auto">
            {models.map(m => {
              const isBest = predictive?.modelMetrics?.[m]?.isBest
              return (
                <button
                  key={m}
                  onClick={() => setActiveModel(m)}
                  className={`text-xs px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeModel === m
                      ? "bg-white text-[#0038A8] font-bold shadow-xs border border-slate-200/50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  {isBest && <Sparkles size={11} className="text-amber-500 flex-shrink-0" />}
                  <span>{m}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Active Model Context Banner */}
      <div className="bg-gradient-to-r from-blue-50/80 via-white to-slate-50 border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0038A8]/10 text-[#0038A8] flex items-center justify-center flex-shrink-0">
            <Activity size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900">{curMetrics.name}</h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                curMetrics.isBest
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}>
                {curMetrics.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{curMetrics.note}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-400 font-medium">Exogenous Regressors:</span>
          {curMetrics.regressors?.map(reg => (
            <span key={reg} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono shadow-2xs">
              {reg}
            </span>
          ))}
        </div>
      </div>

      {/* Accuracy Scorecards with Formulas (UST IS BA Rubric) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RMSE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative group hover:border-[#0038A8]/40 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Root Mean Square Error</p>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">RMSE</span>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">{curMetrics.rmse}</p>
          <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
            <CheckCircle2 size={11} className="text-emerald-500" /> Penalizes peak outlier deviations
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400">
            Formula: √[ (1/n) Σ (yᵢ - ŷᵢ)² ]
          </div>
        </div>

        {/* MAPE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative group hover:border-[#0038A8]/40 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mean Absolute % Error</p>
            <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
              {curMetrics.mape}
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-2">{curMetrics.mape}</p>
          <p className="text-[10px] text-emerald-600 mt-1.5 flex items-center gap-1 font-medium">
            <CheckCheck size={11} /> High Accuracy (&lt;10% Lewis benchmark)
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400">
            Formula: (100%/n) Σ |(yᵢ - ŷᵢ)/yᵢ|
          </div>
        </div>

        {/* MAE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative group hover:border-[#0038A8]/40 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mean Absolute Error</p>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">MAE</span>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">{curMetrics.mae}</p>
          <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
            <Activity size={11} className="text-blue-500" /> Average volume discrepancy
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400">
            Formula: (1/n) Σ |yᵢ - ŷᵢ|
          </div>
        </div>

        {/* R-Squared & Operational Recommendation */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative group hover:border-[#0038A8]/40 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Goodness of Fit (R²)</p>
            <span className="text-[9px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
              R² = {curMetrics.r2}
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-[#0038A8] mt-2">{curMetrics.r2}</p>
          <p className="text-[10px] text-[#0038A8] mt-1.5 flex items-center gap-1 font-semibold truncate">
            {curMetrics.isBest ? "⭐ Lowest Error Performer" : "Secondary Baseline"}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 truncate">
            Split: {curMetrics.trainTestSplit}
          </div>
        </div>
      </div>

      {/* Main Multi-Model Forecast Chart */}
      <ChartCard title={`Water Demand Forecast — 2024 to 2026 (${activeModel} vs Actual Billed Consumption)`}>
        <div className="mb-4 flex items-center gap-3 text-xs flex-wrap">
          <button
            onClick={() => toggle("actual")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all border ${
              hidden.has("actual") ? "opacity-40 border-slate-200 bg-slate-50" : "border-slate-200 bg-white shadow-2xs"
            }`}
          >
            <span className="w-3.5 h-1 bg-[#0038A8] rounded-full inline-block" />
            <span className={hidden.has("actual") ? "line-through text-slate-400" : "font-semibold text-slate-700"}>
              Historical Billed m³ (2024–2025)
            </span>
          </button>

          {!compareAll ? (
            <>
              <button
                onClick={() => toggle("forecast")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all border ${
                  hidden.has("forecast") ? "opacity-40 border-slate-200 bg-slate-50" : "border-blue-200 bg-blue-50/50 shadow-2xs"
                }`}
              >
                <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#0284C7] inline-block" />
                <span className={hidden.has("forecast") ? "line-through text-slate-400" : "font-semibold text-[#0284C7]"}>
                  {activeModel} Forecast (2026)
                </span>
              </button>

              <button
                onClick={() => toggle("ci")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all border ${
                  hidden.has("ci") ? "opacity-40 border-slate-200 bg-slate-50" : "border-slate-200 bg-white shadow-2xs"
                }`}
              >
                <span className="w-3.5 h-2.5 bg-[#0284C7]/15 inline-block rounded border border-[#0284C7]/30" />
                <span className={hidden.has("ci") ? "line-through text-slate-400" : "text-slate-600"}>
                  95% Confidence Interval Band
                </span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 ml-2 flex-wrap">
              {models.map(m => (
                <span key={m} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                  <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: MODEL_COLORS[m] }} />
                  {m}
                </span>
              ))}
            </div>
          )}

          <span className="text-slate-400 ml-auto text-[11px] font-mono">
            Origin: Dec '25 · Horizon: 6 Months (Dry Season Peak)
          </span>
        </div>

        <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
          <defs>
            <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284C7" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#0284C7" stopOpacity={0.02} />
            </linearGradient>
          </defs>
        </svg>

        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={predictive?.forecastData} margin={{ left: 8, right: 24, top: 10, bottom: 4 }}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              key="xaxis"
              dataKey="month"
              tick={{ fontSize: 10, fill: "#64748B" }}
              axisLine={{ stroke: "#E2E8F0" }}
              tickLine={false}
            />
            <YAxis
              key="yaxis"
              tick={{ fontSize: 10, fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}k m³`}
              domain={[150000, 245000]}
            />
            <RTooltip
              key="tooltip"
              content={(p: any) => (
                <ChartTip
                  {...p}
                  fmt={(v, name) => `${Number(v).toLocaleString()} m³ ${name ? `(${name})` : ""}`}
                />
              )}
            />

            {/* Shaded 95% Confidence Interval Band */}
            {!compareAll && !hidden.has("ci") && !hidden.has("forecast") && (
              <>
                <Area
                  key="area-ci-high"
                  type="monotone"
                  dataKey="ci_high"
                  name="95% CI Upper Bound"
                  stroke="none"
                  fill="url(#ciGrad)"
                  activeDot={false}
                />
                <Area
                  key="area-ci-low"
                  type="monotone"
                  dataKey="ci_low"
                  name="95% CI Lower Bound"
                  stroke="none"
                  fill="white"
                  activeDot={false}
                />
              </>
            )}

            {/* Historical Recorded Line */}
            <Line
              key="line-actual"
              type="monotone"
              dataKey="actual"
              name="Historical Actual Demand"
              stroke="#0038A8"
              strokeWidth={2.5}
              dot={{ fill: "#0038A8", r: 3, strokeWidth: 0 }}
              connectNulls
              hide={hidden.has("actual")}
              activeDot={{ r: 5, stroke: "#0038A8", strokeWidth: 2, fill: "white" }}
            />

            {/* If Single Model Selected */}
            {!compareAll && (
              <Line
                key={`line-forecast-${activeKey}`}
                type="monotone"
                dataKey={activeKey}
                name={`${activeModel} Forecast`}
                stroke={MODEL_COLORS[activeModel] || "#0284C7"}
                strokeWidth={2.5}
                dot={{ fill: MODEL_COLORS[activeModel] || "#0284C7", r: 3, strokeWidth: 0 }}
                strokeDasharray="6 3"
                connectNulls
                hide={hidden.has("forecast")}
                className="forecast-line-animated"
                activeDot={{ r: 5, stroke: MODEL_COLORS[activeModel] || "#0284C7", strokeWidth: 2, fill: "white" }}
              />
            )}

            {/* If Compare All Models Toggled */}
            {compareAll && (
              <>
                <Line key="m-lstm" type="monotone" dataKey="lstm" name="Multivariate LSTM" stroke={MODEL_COLORS["Multivariate LSTM"]} strokeWidth={2.5} strokeDasharray="5 2" connectNulls dot={false} />
                <Line key="m-sarima" type="monotone" dataKey="sarima" name="SARIMA" stroke={MODEL_COLORS["SARIMA"]} strokeWidth={2} strokeDasharray="4 2" connectNulls dot={false} />
                <Line key="m-prophet" type="monotone" dataKey="prophet" name="Meta Prophet" stroke={MODEL_COLORS["Meta Prophet"]} strokeWidth={2} strokeDasharray="3 3" connectNulls dot={false} />
                <Line key="m-xgboost" type="monotone" dataKey="xgboost" name="XGBoost Regressor" stroke={MODEL_COLORS["XGBoost Regressor"]} strokeWidth={2} strokeDasharray="6 2" connectNulls dot={false} />
                <Line key="m-ensemble" type="monotone" dataKey="ensemble" name="Ensemble Model" stroke={MODEL_COLORS["Ensemble Model"]} strokeWidth={2.5} strokeDasharray="2 2" connectNulls dot={false} />
              </>
            )}

            {/* Vertical Marker for Forecast Origin */}
            <ReferenceLine
              key="refline-origin"
              x="Dec '25"
              stroke="#D32F2F"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "Forecast Origin (Dec 2025)",
                fill: "#D32F2F",
                fontSize: 10,
                position: "insideTopLeft",
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Model Performance Comparison Matrix (Mandatory for UST IS Defense) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Model Performance & Cross-Validation Matrix (Table 3.3.4.2)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Trained on 2017–2023 historical billing (70%) · Tested against 2023–2025 hold-out data (30%)
            </p>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-bold">
            Best Operational: Multivariate LSTM (3.24% MAPE)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Algorithm / Model</th>
                <th className="px-4 py-3">RMSE (m³)</th>
                <th className="px-4 py-3">MAPE (%)</th>
                <th className="px-4 py-3">MAE (m³)</th>
                <th className="px-4 py-3">R² Score</th>
                <th className="px-4 py-3">Key Regressors</th>
                <th className="px-5 py-3">Operational Decision Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {models.map(m => {
                const met = predictive?.modelMetrics?.[m]
                const isSelected = activeModel === m
                return (
                  <tr
                    key={m}
                    onClick={() => setActiveModel(m)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50/60 font-semibold"
                        : "hover:bg-slate-50/70 text-slate-700"
                    }`}
                  >
                    <td className="px-5 py-3 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MODEL_COLORS[m] }} />
                      <span className="font-bold text-slate-900">{m}</span>
                      {met?.isBest && (
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                          BEST
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">{met?.rmse}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-600">{met?.mape}</td>
                    <td className="px-4 py-3 font-mono">{met?.mae}</td>
                    <td className="px-4 py-3 font-mono text-[#0038A8] font-bold">{met?.r2}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 max-w-xs truncate">
                      {met?.regressors?.join(", ")}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        met?.isBest
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {met?.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-Column Deep Dive: Feature Importance vs Demand Spike Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Feature Importance & Weather Regressors */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Sun size={15} className="text-amber-500" />
              Feature Importance & Meteorological Regressors (§3.1.2)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Multivariate LSTM relative feature contributions for Tabaco City demand dynamics
            </p>
          </div>

          <div className="space-y-3.5">
            {predictive?.featureImportance?.map(feat => (
              <div key={feat.feature} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{feat.feature}</span>
                  <span className="font-mono font-bold text-[#0038A8]">{feat.weight}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0038A8] to-[#0284C7] rounded-full"
                    style={{ width: `${feat.weight}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-[11px] text-blue-800 leading-relaxed">
            <span className="font-bold">Business Intelligence Insight:</span> Because temperature has a high weight (28%), the model successfully flags the anticipated March–April 2026 dry season deficit, enabling TCWD to shift pump operations before reservoir heads deplete.
          </div>
        </div>

        {/* Right Column: Demand Spike Predictions & Deficit Warnings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-500" />
                Demand Spike Predictions — Q1/Q2 2026 Dry Season
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Surge predictions exceeding baseline threshold (+10%) across critical zones
              </p>
            </div>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              {predictive?.spikePredictions?.filter(p => p.risk === "critical").length} Critical Spikes
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto pr-1">
            {predictive?.spikePredictions?.map((spike, i) => (
              <div key={i} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{spike.zone}</span>
                    <span className="text-[10px] text-slate-400">· {spike.month}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-red-600">+{spike.spike}%</span>
                    <StatusBadge status={spike.risk} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span className="font-mono">Predicted: {spike.volume.toLocaleString()} m³</span>
                  <span className="text-emerald-600 font-mono text-[10px]">Confidence: {spike.confidence}</span>
                </div>

                <p className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span className="font-semibold text-slate-700">Action:</span> {spike.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SCREEN: SHORTAGE ───────────────────────────────────────────────────────
function ShortageScreen() {
  const { supplyDemand, kpi } = useDashboard()
  const chartSupplyDemand = supplyDemand.length > 0 ? supplyDemand.slice(-18) : SUPPLY_DEMAND
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
        <div className="mb-3 flex flex-wrap items-center gap-5 text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-4 h-1 bg-[#10B981] inline-block rounded" />
            Actual Water Supply (Production m³)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-4 h-1 bg-[#0038A8] inline-block rounded" />
            Sustainable Capacity (m³)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-[#D32F2F] inline-block" />
            Predicted Demand (m³)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-4 h-3 bg-[#D32F2F]/10 rounded inline-block border border-[#D32F2F]/20" />
            Shortage Risk Window (Feb–Apr '26)
          </span>
        </div>
        <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
          <defs>
            <linearGradient id="supplyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0038A8" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#0038A8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
        </svg>
        <ResponsiveContainer width="100%" height={330}>
          <ComposedChart data={chartSupplyDemand} margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis key="xaxis" dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis key="yaxis" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} domain={[140000, 310000]} />
            <RTooltip key="tooltip" content={(p: any) => <ChartTip {...p} fmt={v => `${v != null ? Number(v).toLocaleString() : "N/A"} m³`} />} />
            <ReferenceArea key="refarea-shortage" x1="Feb '26" x2="Apr '26" fill="#D32F2F" fillOpacity={0.08} label={{ value: "Shortage Zone", fill: "#D32F2F", fontSize: 9 }} />
            
            {/* 1. Actual Water Supply (Real bulk production from Supabase ref_mds_monthly) */}
            <Line
              key="line-actual-supply"
              type="monotone"
              dataKey="actualSupply"
              name="Actual Water Supply m³"
              stroke="#10B981"
              strokeWidth={2.5}
              dot={{ fill: "#10B981", r: 3, strokeWidth: 1.5, stroke: "#fff" }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />

            {/* 2. Sustainable Supply (Rated operational capacity limit) */}
            <Area
              key="area-supply"
              type="monotone"
              dataKey="supply"
              name="Sustainable Capacity m³"
              stroke="#0038A8"
              strokeWidth={2}
              fill="url(#supplyGrad)"
              activeDot={false}
            />

            {/* 3. Predicted Demand (Forecasted consumption curve) */}
            <Line
              key="line-demand"
              type="monotone"
              dataKey="demand"
              name="Predicted Demand m³"
              stroke="#D32F2F"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ fill: "#D32F2F", r: 2.5, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
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

      {/* ── PRODUCTION SOURCES & ACTIVE RESERVOIR STORAGE GAUGE CARDS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Water Supply Infrastructure Matrix (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Droplets size={16} className="text-[#0038A8]" />
                Tabaco City Water Supply Infrastructure &amp; Production Sources
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Total Nominal Extraction: 15,500 m³/day (Deep Wells + Gravity Springs)
              </p>
            </div>
            <span className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              4 Production Facilities Active
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                name: "Mayon Mountain Gravity Springs (Pinagbobong & Buang)",
                type: "Natural Gravity Spring Flow",
                capacity: "1,800 m³/day",
                sharePct: 11.6,
                powerCost: "₱0.00 / kWh",
                specificEnergy: "0.00 kWh/m³",
                status: "100% Operational",
                note: "Uninterruptible gravity discharge; zero grid electricity expense",
                color: "#10B981"
              },
              {
                name: "San Vicente Main Pumping Station PS-01",
                type: "Submersible Deep Well (60 HP)",
                capacity: "6,000 m³/day",
                sharePct: 38.7,
                powerCost: "₱6.20–₱11.80 / kWh (TOU)",
                specificEnergy: "0.38 kWh/m³",
                status: "Duty Pump Running",
                note: "Primary base-load extraction supplying Tabaco Central & Poblacion",
                color: "#0038A8"
              },
              {
                name: "Booster Station A — Panal Intermediate",
                type: "Deep Well & Intermediate Booster",
                capacity: "4,500 m³/day",
                sharePct: 29.0,
                powerCost: "₱6.20–₱11.80 / kWh (TOU)",
                specificEnergy: "0.44 kWh/m³",
                status: "Variable Frequency Drive",
                note: "Feeds Zone 2 and industrial commercial consumers along national highway",
                color: "#3B82F6"
              },
              {
                name: "Booster Station B — Buang High-Elevation",
                type: "High-Head Multi-Stage Booster",
                capacity: "3,200 m³/day",
                sharePct: 20.7,
                powerCost: "₱6.20–₱11.80 / kWh (TOU)",
                specificEnergy: "0.52 kWh/m³",
                status: "Standby Throttled",
                note: "High specific energy; scheduled for evening peak shaving reduction",
                color: "#F59E0B"
              }
            ].map(fac => (
              <div key={fac.name} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: fac.color }} />
                      {fac.name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{fac.type}</p>
                  </div>
                  <div className="text-right flex-shrink-0 font-mono">
                    <span className="text-xs font-bold text-slate-900">{fac.capacity}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({fac.sharePct}%)</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[10px] pt-1.5 border-t border-slate-200/50 gap-2">
                  <span className="text-slate-500">Power: <strong className="text-slate-700">{fac.powerCost}</strong> · Spec. Energy: <strong className="text-slate-700">{fac.specificEnergy}</strong></span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">{fac.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Elevated Reservoir Storage Level Gauges (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity size={16} className="text-[#0038A8]" />
              Distribution Reservoir Storage Gauges
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live telemetry: tank volume, head pressure &amp; estimated drawdown time
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                id: "RES-01",
                name: "San Vicente Elevated Reservoir",
                capacityM3: 2500,
                currentM3: 2200,
                levelPct: 88,
                pressureHeadPsi: 32.4,
                drawdownHours: 14.2,
                status: "OPTIMAL BUFFER",
                color: "#0038A8"
              },
              {
                id: "RES-02",
                name: "Panal Ground Balancing Tank",
                capacityM3: 3800,
                currentM3: 3496,
                levelPct: 92,
                pressureHeadPsi: 28.1,
                drawdownHours: 18.6,
                status: "PRE-FILLED FOR PEAK",
                color: "#10B981"
              },
              {
                id: "RES-03",
                name: "Buang Mountain Break-Pressure Tank",
                capacityM3: 1200,
                currentM3: 936,
                levelPct: 78,
                pressureHeadPsi: 19.8,
                drawdownHours: 8.5,
                status: "MODERATE LEVEL",
                color: "#F59E0B"
              }
            ].map(res => (
              <div key={res.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#0038A8] bg-blue-100 px-1.5 py-0.5 rounded">
                      {res.id}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 mt-1">{res.name}</h4>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-base font-bold text-slate-900">{res.levelPct}%</span>
                    <p className="text-[10px] text-slate-400">{res.currentM3} / {res.capacityM3} m³</p>
                  </div>
                </div>

                {/* Animated Level Bar */}
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${res.levelPct}%`,
                      backgroundColor: res.color
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-200/50">
                  <div className="text-slate-500">
                    Pressure Head: <strong className="text-slate-800">{res.pressureHeadPsi} psi</strong>
                  </div>
                  <div className="text-slate-500 text-right">
                    Drawdown Buffer: <strong className="text-emerald-700">{res.drawdownHours}h</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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
  const [correlation, setCorrelation] = useState<{
    summary?: {
      rSquared: number;
      regressionEquation: string;
      pearsonR: number;
    };
    temperatureScatter?: Array<{ temp: number; demand: number; date: string; condition: string }>;
    rainfallDualAxis?: Array<{ month: string; rainfall: number; nrw: number }>;
  } | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = async () => {
    try {
      const [cRes, fRes, corrRes] = await Promise.all([
        fetch('/api/v1/weather/current'),
        fetch('/api/v1/weather/forecast'),
        fetch('/api/v1/weather-correlation').catch(() => null),
      ])
      if (!cRes.ok || !fRes.ok) throw new Error('API error')
      const [cJson, fJson] = await Promise.all([cRes.json(), fRes.json()])
      setCurrent(cJson.data)
      setForecast(fJson.data)
      if (corrRes && corrRes.ok) {
        try {
          const corrJson = await corrRes.json()
          if (corrJson.success && corrJson.data) {
            setCorrelation({
              summary: corrJson.data.summary,
              temperatureScatter: corrJson.data.temperatureScatter?.map((s: any) => ({
                temp: s.tempCelsius,
                demand: s.dailyDemandM3,
                date: s.date,
                condition: s.condition,
              })),
              rainfallDualAxis: corrJson.data.rainfallDualAxis?.map((r: any) => ({
                month: r.month,
                rainfall: r.rainfallMm,
                nrw: r.nrwPercentage,
              })),
            })
          }
        } catch {}
      }
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

  return { current, forecast, correlation, loading, error, lastRefresh, refresh: load }
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
  const { current, forecast, correlation, loading, error, lastRefresh, refresh } = useWeatherData()
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
          <ResponsiveContainer width="100%" height={240}>
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
              <Legend
                key="legend"
                verticalAlign="bottom"
                content={() => (
                  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100 mt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0038A8] inline-block shadow-xs" />
                      <span className="font-medium text-slate-700">Historical Demand</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block shadow-xs" />
                      <span className="font-medium text-slate-700">Live Reading {current ? `(${current.temperature}°C)` : ''}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-4 border-b-2 border-dashed border-[#D32F2F] inline-block" />
                      <span className="font-medium text-slate-700">Regression Line <span className="text-slate-400 font-normal">(r² = 0.72)</span></span>
                    </span>
                  </div>
                )}
              />
              <Scatter key="scatter-temp" name="Historical Demand" data={correlation?.temperatureScatter && correlation.temperatureScatter.length > 0 ? correlation.temperatureScatter : TEMP_DEMAND} fill="#0038A8" opacity={0.7} />
              {/* Live current point */}
              {current && (
                <Scatter key="scatter-live" name="Current Live" data={[{ temp: current.temperature, demand: adjDemand }]} fill="#EF4444" r={6} />
              )}
              <ReferenceLine key="refline-r" stroke="#D32F2F" strokeDasharray="4 3"
                segment={[{ x: 25, y: 5200 }, { x: 36, y: 10600 }]} strokeWidth={1.5}
                label={{ value: correlation?.summary?.rSquared ? `r² = ${correlation.summary.rSquared}` : 'r² = 0.72', fill: '#D32F2F', fontSize: 9, position: 'insideTopRight' }} />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-400 mt-1">{correlation?.summary?.regressionEquation ? `${correlation.summary.regressionEquation} (R² = ${correlation.summary.rSquared}) · Live Supabase dim_weather telemetry` : "Regression: D = 192T − 1,576 (R² = 0.72) · Telemetry correlation window: 2017–2025"}</p>
        </ChartCard>

        {/* Dual-axis: Rainfall vs NRW */}
        <ChartCard title="Rainfall vs. NRW Seasonal Pattern">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart syncId="weather-sync" data={correlation?.rainfallDualAxis && correlation.rainfallDualAxis.length > 0 ? correlation.rainfallDualAxis : [
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

// ── IWA / LWUA STANDARD WATER BALANCE & DMA ACOUSTIC SCHEDULE DATA (§3.6.3) ──
const IWA_WATER_BALANCE_DATA = {
  systemInputVolumeM3: 269094,
  authorisedConsumptionM3: 197868,
  billedAuthorisedM3: 193748,
  billedMeteredM3: 190420,
  billedUnmeteredM3: 3328,
  unbilledAuthorisedM3: 4120,
  unbilledMeteredM3: 1480,
  unbilledUnmeteredM3: 2640,
  waterLossesM3: 71226,
  commercialLossesM3: 18480,
  customerMeterInaccuraciesM3: 9460,
  unauthorizedConsumptionM3: 6820,
  dataHandlingErrorsM3: 2200,
  physicalLossesM3: 52746,
  mainsLeakageM3: 28140,
  storageReservoirLeaksM3: 5120,
  serviceConnectionLeaksM3: 19486,
  revenueWaterM3: 193748,
  nonRevenueWaterM3: 75346,
  nrwPct: 28.0,
  lwuaBenchmarkPct: 20.0,
  monthlyRevenueLossPhp: 1420000
}

const DMA_ACOUSTIC_SWEEP_SCHEDULE = [
  {
    dmaId: "DMA-01",
    zone: "Zone 2 (Panal / Poblacion)",
    pipeType: "Cast Iron & Asbestos Cement",
    pipeAgeYears: 32,
    urgency: "CRITICAL",
    urgencyBadge: "bg-red-100 text-red-800 border-red-200",
    mnfRatio: "2.85x",
    equipment: "Digital Ground Correlator & Listening Rod",
    inspectionTeam: "Field Crew Alpha (Engr. Bando)",
    status: "IN PROGRESS",
    statusBadge: "bg-amber-100 text-amber-800",
    targetRecoveryM3: 2678,
    actionTaken: "Step-down PRV-02 deployed; 3 acoustic anomalies isolated along Panal Highway main"
  },
  {
    dmaId: "DMA-02",
    zone: "Zone 1 (Tabaco Center / Commercial)",
    pipeType: "Ductile Iron & Galvanized Iron",
    pipeAgeYears: 28,
    urgency: "CRITICAL",
    urgencyBadge: "bg-red-100 text-red-800 border-red-200",
    mnfRatio: "2.40x",
    equipment: "Acoustic Loggers (SoundSens)",
    inspectionTeam: "Field Crew Bravo (Tech. Salcedo)",
    status: "SCHEDULED",
    statusBadge: "bg-blue-100 text-blue-800",
    targetRecoveryM3: 2496,
    actionTaken: "Night acoustic logger deployment scheduled 00:00-04:00; commercial gate valve inspection"
  },
  {
    dmaId: "DMA-03",
    zone: "Zone 15 (Sto. Cristo)",
    pipeType: "HDPE & Cast Iron",
    pipeAgeYears: 30,
    urgency: "HIGH",
    urgencyBadge: "bg-amber-100 text-amber-800 border-amber-200",
    mnfRatio: "2.10x",
    equipment: "Electro-acoustic Leak Detector",
    inspectionTeam: "Field Crew Alpha (Engr. Bando)",
    status: "SCHEDULED",
    statusBadge: "bg-blue-100 text-blue-800",
    targetRecoveryM3: 2132,
    actionTaken: "Minimum night flow pressure testing; secondary branch acoustic sweep"
  },
  {
    dmaId: "DMA-04",
    zone: "Zone 7 (Sagrada / Fatima)",
    pipeType: "uPVC & Galvanized Iron",
    pipeAgeYears: 26,
    urgency: "MEDIUM",
    urgencyBadge: "bg-blue-100 text-blue-800 border-blue-200",
    mnfRatio: "1.75x",
    equipment: "Listening Stick & Pressure Gauge",
    inspectionTeam: "Field Crew Charlie (Tech. Borromeo)",
    status: "COMPLETED",
    statusBadge: "bg-emerald-100 text-emerald-800",
    targetRecoveryM3: 1716,
    actionTaken: "Repaired 2 service line saddle bursts; pressure restored to 18.5 psi nominal"
  },
  {
    dmaId: "DMA-05",
    zone: "Zone 3 (Magallanes)",
    pipeType: "HDPE High-Density Polyethylene",
    pipeAgeYears: 18,
    urgency: "LOW",
    urgencyBadge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    mnfRatio: "1.25x",
    equipment: "Routine Telemetry Monitoring",
    inspectionTeam: "Central SCADA / AMR Telemetry",
    status: "MONITORING",
    statusBadge: "bg-slate-100 text-slate-700",
    targetRecoveryM3: 923,
    actionTaken: "Normal baseline hydraulic operation; no anomalous night flow detected"
  }
]

// ── SCREEN: NRW MAP ────────────────────────────────────────────────────────
function NRWScreen() {
  const { zones: ZONES, kpi } = useDashboard()
  const [hoveredZone, setHoveredZone] = useState<number | null>(null)
  const [selectedNRWZone, setSelectedNRWZone] = useState<number | null>(null)
  const sortedByNRW = [...ZONES].sort((a, b) => b.nrw - a.nrw)

  const nrwColor = (nrw: number) => {
    if (nrw > 20) return { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", fill: "#EF4444" }
    if (nrw > 15) return { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", fill: "#F59E0B" }
    return              { bg: "#F0FDF4", border: "#BBF7D0", text: "#16A34A", fill: "#10B981" }
  }

  const zoneIds = ZONES.map(z => z.id)
  const ZONE_GRID = [
    zoneIds.slice(0, 5),
    zoneIds.slice(5, 10),
    zoneIds.slice(10, 15),
    zoneIds.slice(15, 20),
    zoneIds.slice(20, 25),
  ].filter(r => r.length > 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">NRW Hotspot Map — Non-Revenue Water Analysis</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tabaco City {ZONES.length}-Zone Grid · {kpi.latestMonth || "Dec 2025"} · LWUA Benchmark: ≤20%</p>
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
            <span className="text-[10px] text-slate-400">System avg: {kpi.nrwPct.toFixed(1)}% NRW</span>
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

      {/* ── IWA / LWUA STANDARD INTERNATIONAL WATER BALANCE AUDIT (§3.6.3) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-[#0038A8]" />
              <h3 className="text-sm font-bold text-slate-800">
                International Water Association (IWA) &amp; LWUA Standard Water Balance Audit
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Standardized physical vs. apparent water loss accounting framework for Tabaco City Water District (§1.3.1, §3.6.3)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-semibold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
              Current NRW: {IWA_WATER_BALANCE_DATA.nrwPct.toFixed(1)}% (LWUA Benchmark: ≤{IWA_WATER_BALANCE_DATA.lwuaBenchmarkPct.toFixed(1)}%)
            </span>
            <span className="text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              Monthly Value Lost: ₱{(IWA_WATER_BALANCE_DATA.monthlyRevenueLossPhp / 1_000_000).toFixed(2)}M
            </span>
          </div>
        </div>

        {/* IWA Multi-Level Hierarchy Visual Diagram */}
        <div className="p-5 overflow-x-auto bg-slate-50/40">
          <div className="min-w-[760px] space-y-3">
            {/* Level 1: System Input Volume */}
            <div className="bg-[#0038A8] text-white p-3 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <Droplets size={16} className="text-blue-200" />
                <span className="text-xs font-bold uppercase tracking-wider">System Input Volume (SIV)</span>
              </div>
              <div className="text-right font-mono">
                <span className="text-sm font-bold">{IWA_WATER_BALANCE_DATA.systemInputVolumeM3.toLocaleString()} m³</span>
                <span className="text-[10px] text-blue-200 ml-2">(100.0%)</span>
              </div>
            </div>

            {/* Level 2: Authorised Consumption vs Water Losses */}
            <div className="grid grid-cols-12 gap-3">
              {/* Authorised Consumption (Col 1-7) */}
              <div className="col-span-7 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                  <span className="text-xs font-bold text-emerald-900">Authorised Consumption</span>
                  <span className="font-mono text-xs font-bold text-emerald-800">
                    {IWA_WATER_BALANCE_DATA.authorisedConsumptionM3.toLocaleString()} m³ (73.5%)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {/* Billed Authorised Consumption (Revenue Water) */}
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-emerald-900 font-bold">
                      <span>Billed Authorised</span>
                      <span className="font-mono">{IWA_WATER_BALANCE_DATA.billedAuthorisedM3.toLocaleString()} m³</span>
                    </div>
                    <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                      Revenue Water (₱5.18M/mo)
                    </span>
                    <div className="text-[10px] text-slate-500 pt-1 space-y-0.5 border-t border-slate-100">
                      <div className="flex justify-between">
                        <span>• Billed Metered:</span>
                        <span className="font-mono">{IWA_WATER_BALANCE_DATA.billedMeteredM3.toLocaleString()} m³</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Billed Unmetered:</span>
                        <span className="font-mono">{IWA_WATER_BALANCE_DATA.billedUnmeteredM3.toLocaleString()} m³</span>
                      </div>
                    </div>
                  </div>

                  {/* Unbilled Authorised Consumption */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-800 font-bold">
                      <span>Unbilled Authorised</span>
                      <span className="font-mono text-slate-700">{IWA_WATER_BALANCE_DATA.unbilledAuthorisedM3.toLocaleString()} m³</span>
                    </div>
                    <span className="inline-block text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                      Part of Non-Revenue Water
                    </span>
                    <div className="text-[10px] text-slate-500 pt-1 space-y-0.5 border-t border-slate-100">
                      <div className="flex justify-between">
                        <span>• Unbilled Metered (Offices):</span>
                        <span className="font-mono">{IWA_WATER_BALANCE_DATA.unbilledMeteredM3.toLocaleString()} m³</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Firefighting &amp; Flushing:</span>
                        <span className="font-mono">{IWA_WATER_BALANCE_DATA.unbilledUnmeteredM3.toLocaleString()} m³</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Water Losses (Col 8-12) */}
              <div className="col-span-5 bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-red-200/80 pb-2">
                  <span className="text-xs font-bold text-red-900">Water Losses (NRW Core)</span>
                  <span className="font-mono text-xs font-bold text-red-700">
                    {IWA_WATER_BALANCE_DATA.waterLossesM3.toLocaleString()} m³ (26.5%)
                  </span>
                </div>

                <div className="space-y-2 text-[11px]">
                  {/* Commercial / Apparent Losses */}
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-amber-900 font-bold">
                      <span>Apparent / Commercial Losses</span>
                      <span className="font-mono">{IWA_WATER_BALANCE_DATA.commercialLossesM3.toLocaleString()} m³</span>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 space-y-0.5 border-t border-slate-100">
                      <div className="flex justify-between">
                        <span>• Meter Under-registration:</span>
                        <span className="font-mono font-medium text-amber-700">{IWA_WATER_BALANCE_DATA.customerMeterInaccuraciesM3.toLocaleString()} m³</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Unauthorized Taps / Bypasses:</span>
                        <span className="font-mono font-medium text-amber-700">{IWA_WATER_BALANCE_DATA.unauthorizedConsumptionM3.toLocaleString()} m³</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Data Handling Clerical Errors:</span>
                        <span className="font-mono text-slate-600">{IWA_WATER_BALANCE_DATA.dataHandlingErrorsM3.toLocaleString()} m³</span>
                      </div>
                    </div>
                  </div>

                  {/* Real / Physical Losses */}
                  <div className="bg-white p-2.5 rounded-lg border border-red-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-red-900 font-bold">
                      <span>Real / Physical Losses</span>
                      <span className="font-mono">{IWA_WATER_BALANCE_DATA.physicalLossesM3.toLocaleString()} m³</span>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 space-y-0.5 border-t border-slate-100">
                      <div className="flex justify-between">
                        <span>• Mains Transmission Bursts:</span>
                        <span className="font-mono font-medium text-red-700">{IWA_WATER_BALANCE_DATA.mainsLeakageM3.toLocaleString()} m³</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Service Connection Weeps:</span>
                        <span className="font-mono font-medium text-red-700">{IWA_WATER_BALANCE_DATA.serviceConnectionLeaksM3.toLocaleString()} m³</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Reservoir Overflows:</span>
                        <span className="font-mono text-slate-600">{IWA_WATER_BALANCE_DATA.storageReservoirLeaksM3.toLocaleString()} m³</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reconciliation Footer Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              <div className="bg-emerald-100/70 border border-emerald-300/80 rounded-lg p-2.5 flex items-center justify-between">
                <span className="font-bold text-emerald-950">Billed Revenue Water:</span>
                <span className="font-mono font-bold text-emerald-900">{IWA_WATER_BALANCE_DATA.revenueWaterM3.toLocaleString()} m³ (72.0%)</span>
              </div>
              <div className="bg-red-100/70 border border-red-300/80 rounded-lg p-2.5 flex items-center justify-between">
                <span className="font-bold text-red-950">Total Non-Revenue Water (NRW):</span>
                <span className="font-mono font-bold text-red-900">{IWA_WATER_BALANCE_DATA.nonRevenueWaterM3.toLocaleString()} m³ (28.0% of SIV)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DISTRICT METERED AREA (DMA) ACOUSTIC LEAK DETECTION SCHEDULE ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-[#0038A8]" />
              <h3 className="text-sm font-bold text-slate-800">
                District Metered Area (DMA) Acoustic Leak Sweep Schedule
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Active acoustic listening, ground correlators, and night minimum night flow (MNF) deployment plan
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            Active DMAs: 5 Sectors Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="px-4 py-2.5 text-left">Sector / DMA</th>
                <th className="px-4 py-2.5 text-left">Service Zone</th>
                <th className="px-3 py-2.5 text-left">Pipe Material &amp; Age</th>
                <th className="px-3 py-2.5 text-center">MNF Ratio</th>
                <th className="px-3 py-2.5 text-center">Urgency</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-right">Target Recovery</th>
                <th className="px-4 py-2.5 text-left">Field Action Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DMA_ACOUSTIC_SWEEP_SCHEDULE.map(dma => (
                <tr key={dma.dmaId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#0038A8] whitespace-nowrap">
                    {dma.dmaId}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                    {dma.zone}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    <div>{dma.pipeType}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{dma.pipeAgeYears} yrs in service</div>
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-slate-700">
                    {dma.mnfRatio}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${dma.urgencyBadge}`}>
                      {dma.urgency}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dma.statusBadge}`}>
                      {dma.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                    +{dma.targetRecoveryM3.toLocaleString()} m³/mo
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-[11px] leading-relaxed">
                    <div>{dma.actionTaken}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 italic">
                      Equip: {dma.equipment} · {dma.inspectionTeam}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

// ── BARANGAY DIRECTORY MAPPING (Tabaco City Water District) ────────────────
const ZONE_BARANGAY_MAP: Record<number, string> = {
  1: "Tabaco Center (Poblacion)",
  2: "Panal (Poblacion)",
  3: "Magallanes",
  4: "San Roque",
  5: "Cormidal",
  6: "Tagas",
  7: "Sagrada / Fatima",
  8: "Tayhi",
  9: "Bombon",
  10: "Baranghawon",
  11: "San Carlos",
  12: "Basud",
  13: "San Vicente",
  14: "Quinastillohan",
  15: "Sto. Cristo",
  16: "Fatima (Upland)",
  17: "Buang",
  18: "Mariroc",
  19: "Pinagbobong",
  20: "Bogñabong",
  21: "San Juan",
}

// ── SCREEN: ZONES ──────────────────────────────────────────────────────────
function ZonesScreen({ initialZoneId, onClearInitialZone }: { initialZoneId?: number | null; onClearInitialZone?: () => void }) {
  const { zones: ZONES, kpi } = useDashboard()
  const [selectedZone, setSelectedZone] = useState<typeof ZONES[0] | null>(null)
  const [filterQuery, setFilterQuery] = useState("")

  useEffect(() => {
    if (initialZoneId) {
      const found = ZONES.find(z => z.id === initialZoneId)
      if (found) {
        setSelectedZone(found)
        onClearInitialZone?.()
      }
    }
  }, [initialZoneId, ZONES, onClearInitialZone])

  const filteredZones = filterQuery.trim() === ""
    ? ZONES
    : ZONES.filter(z => {
        const bg = ZONE_BARANGAY_MAP[z.id] || ""
        const q = filterQuery.toLowerCase()
        return (
          z.name.toLowerCase().includes(q) ||
          `zone ${z.id}`.toLowerCase().includes(q) ||
          bg.toLowerCase().includes(q)
        )
      })

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Service Zone Analysis</h1>
          <p className="text-sm text-slate-500 mt-0.5">Granular consumption profiling · {ZONES.length} service zones · {kpi.latestMonth || "Dec 2025"}</p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder="Filter barangay (e.g. Panal, Tagas, San Roque)..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/10 transition-all shadow-2xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredZones.map(z => {
          const barangayName = ZONE_BARANGAY_MAP[z.id] || z.name
          return (
            <motion.div key={z.id}
              whileHover={{ y: -3, boxShadow: "0 8px 20px -4px rgba(0,0,0,0.10)" }}
              transition={{ duration: 0.18 }}
              onClick={() => setSelectedZone(z)}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                selectedZone?.id === z.id
                  ? "border-[#0038A8] ring-2 ring-[#0038A8]/20 shadow-md"
                  : "border-slate-200 shadow-sm hover:border-[#0038A8]/30"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Zone {String(z.id).padStart(2,"0")}</span>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5 leading-tight">{barangayName}</p>
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
          )
        })}
      </div>

      {/* Zone drill-down panel */}
      {selectedZone && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-[#0038A8]/20 shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#0038A8]/3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Zone {selectedZone.id} — {ZONE_BARANGAY_MAP[selectedZone.id] || selectedZone.name} · Detailed Drill-Down
              </h3>
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

// ── DEFAULT PRESCRIPTIVE FALLBACK DATA ──────────────────────────────────────
const OPT_DEFAULT_TARIFFS = [
  { blockId: "B1", blockName: "Night Off-Peak", timeRange: "22:00 – 06:00 (8h)", ratePhpPerKwh: 6.20, classification: "Off-Peak", strategyDirective: "Maximize pumping into elevated storage reservoirs at lowest electricity tariff." },
  { blockId: "B2", blockName: "Morning Standard", timeRange: "06:00 – 12:00 (6h)", ratePhpPerKwh: 8.50, classification: "Standard", strategyDirective: "Operate gravity springs at 100% capacity; modulate booster pumps according to real-time DMA pressure." },
  { blockId: "B3", blockName: "Afternoon Standard", timeRange: "12:00 – 18:00 (6h)", ratePhpPerKwh: 8.50, classification: "Standard", strategyDirective: "Sustain distribution flow; prepare elevated reservoirs for evening peak demand." },
  { blockId: "B4", blockName: "Evening Peak Tariff", timeRange: "18:00 – 22:00 (4h)", ratePhpPerKwh: 11.80, classification: "Peak", strategyDirective: "Peak shaving: Throttle high-kWh deep wells; supply predominantly via gravity springs and pre-filled storage." }
]

const OPT_DEFAULT_FACILITIES = [
  {
    id: "PS-MAIN-01",
    name: "San Vicente Main Pumping Station (Deep Well)",
    station: "Main Pump Station",
    type: "Deep Well (Submersible)" as const,
    capacityM3PerDay: 6000,
    energyKwhPerM3: 0.38,
    blocks: [
      { blockId: "B1", blockLabel: "Night (22:00-06:00)", tariffPeriod: "Off-Peak", tariffRatePhpPerKwh: 6.20, currentHours: 5.5, optimizedHours: 5.8, currentCostPhp: 248000, optimizedCostPhp: 261500, savingsPct: -5.4, dispatchedVolumeM3: 2900 },
      { blockId: "B2", blockLabel: "Morning (06:00-12:00)", tariffPeriod: "Standard", tariffRatePhpPerKwh: 8.50, currentHours: 5.8, optimizedHours: 4.8, currentCostPhp: 358000, optimizedCostPhp: 296300, savingsPct: 17.2, dispatchedVolumeM3: 2400 },
      { blockId: "B3", blockLabel: "Afternoon (12:00-18:00)", tariffPeriod: "Standard", tariffRatePhpPerKwh: 8.50, currentHours: 5.2, optimizedHours: 4.5, currentCostPhp: 321000, optimizedCostPhp: 277800, savingsPct: 13.5, dispatchedVolumeM3: 2250 },
      { blockId: "B4", blockLabel: "Evening Peak (18:00-22:00)", tariffPeriod: "Peak", tariffRatePhpPerKwh: 11.80, currentHours: 4.0, optimizedHours: 2.2, currentCostPhp: 344000, optimizedCostPhp: 189200, savingsPct: 45.0, dispatchedVolumeM3: 1100 }
    ],
    totalCurrentCostPhp: 1271000,
    totalOptimizedCostPhp: 1024800,
    totalSavingsPhp: 246200
  },
  {
    id: "PS-BOOSTER-A",
    name: "Booster Station A — Panal Intermediate",
    station: "Booster Station A",
    type: "Deep Well (Submersible)" as const,
    capacityM3PerDay: 4500,
    energyKwhPerM3: 0.44,
    blocks: [
      { blockId: "B1", blockLabel: "Night (22:00-06:00)", tariffPeriod: "Off-Peak", tariffRatePhpPerKwh: 6.20, currentHours: 4.8, optimizedHours: 5.6, currentCostPhp: 188000, optimizedCostPhp: 219300, savingsPct: -16.6, dispatchedVolumeM3: 2100 },
      { blockId: "B2", blockLabel: "Morning (06:00-12:00)", tariffPeriod: "Standard", tariffRatePhpPerKwh: 8.50, currentHours: 5.5, optimizedHours: 4.4, currentCostPhp: 295000, optimizedCostPhp: 236000, savingsPct: 20.0, dispatchedVolumeM3: 1650 },
      { blockId: "B3", blockLabel: "Afternoon (12:00-18:00)", tariffPeriod: "Standard", tariffRatePhpPerKwh: 8.50, currentHours: 5.0, optimizedHours: 4.2, currentCostPhp: 268000, optimizedCostPhp: 225100, savingsPct: 16.0, dispatchedVolumeM3: 1575 },
      { blockId: "B4", blockLabel: "Evening Peak (18:00-22:00)", tariffPeriod: "Peak", tariffRatePhpPerKwh: 11.80, currentHours: 3.8, optimizedHours: 2.0, currentCostPhp: 283000, optimizedCostPhp: 148900, savingsPct: 47.4, dispatchedVolumeM3: 750 }
    ],
    totalCurrentCostPhp: 1034000,
    totalOptimizedCostPhp: 829300,
    totalSavingsPhp: 204700
  },
  {
    id: "PS-BOOSTER-B",
    name: "Booster Station B — Buang High-Elevation",
    station: "Booster Station B",
    type: "Deep Well (Submersible)" as const,
    capacityM3PerDay: 3200,
    energyKwhPerM3: 0.52,
    blocks: [
      { blockId: "B1", blockLabel: "Night (22:00-06:00)", tariffPeriod: "Off-Peak", tariffRatePhpPerKwh: 6.20, currentHours: 4.2, optimizedHours: 5.0, currentCostPhp: 164000, optimizedCostPhp: 195200, savingsPct: -19.0, dispatchedVolumeM3: 1600 },
      { blockId: "B2", blockLabel: "Morning (06:00-12:00)", tariffPeriod: "Standard", tariffRatePhpPerKwh: 8.50, currentHours: 5.2, optimizedHours: 4.0, currentCostPhp: 278000, optimizedCostPhp: 213800, savingsPct: 23.1, dispatchedVolumeM3: 1280 },
      { blockId: "B3", blockLabel: "Afternoon (12:00-18:00)", tariffPeriod: "Standard", tariffRatePhpPerKwh: 8.50, currentHours: 4.8, optimizedHours: 3.8, currentCostPhp: 256000, optimizedCostPhp: 203100, savingsPct: 20.8, dispatchedVolumeM3: 1216 },
      { blockId: "B4", blockLabel: "Evening Peak (18:00-22:00)", tariffPeriod: "Peak", tariffRatePhpPerKwh: 11.80, currentHours: 3.5, optimizedHours: 1.8, currentCostPhp: 245600, optimizedCostPhp: 126300, savingsPct: 48.6, dispatchedVolumeM3: 576 }
    ],
    totalCurrentCostPhp: 943600,
    totalOptimizedCostPhp: 738400,
    totalSavingsPhp: 205200
  }
]

const OPT_DEFAULT_MCDA = [
  { rank: 1, zone: "Zone 2 (Panal / Poblacion)",  topsisScore: 0.8420, priorityLevel: "CRITICAL" as const, nrwPct: 27.0, deficitM3: 4120, populationDensity: 5280, pipeAgeYears: 32, revenueLossPhp: 248000, rationedHours: 8,  recommendedAction: "Immediate pipe replacement & active sector pressure step-down (PRV-02)", estimatedRecoveryM3: 2678, tankerPriority: 1 },
  { rank: 2, zone: "Zone 1 (Tabaco Center)",     topsisScore: 0.7810, priorityLevel: "CRITICAL" as const, nrwPct: 24.2, deficitM3: 3840, populationDensity: 4120, pipeAgeYears: 28, revenueLossPhp: 184000, rationedHours: 10, recommendedAction: "Pre-charge elevated booster storage & throttle commercial valves", estimatedRecoveryM3: 2496, tankerPriority: 2 },
  { rank: 3, zone: "Zone 15 (Sto. Cristo)",      topsisScore: 0.6890, priorityLevel: "HIGH" as const,     nrwPct: 22.3, deficitM3: 3280, populationDensity: 3360, pipeAgeYears: 30, revenueLossPhp: 196000, rationedHours: 12, recommendedAction: "DMA flow acoustic leak sweep & auxiliary well pre-commissioning", estimatedRecoveryM3: 2132, tankerPriority: 3 },
  { rank: 4, zone: "Zone 7 (Sagrada)",           topsisScore: 0.5420, priorityLevel: "HIGH" as const,     nrwPct: 19.8, deficitM3: 2640, populationDensity: 3720, pipeAgeYears: 26, revenueLossPhp: 142000, rationedHours: 14, recommendedAction: "Acoustic leak sweep & valve packing replacement", estimatedRecoveryM3: 1716, tankerPriority: 4 },
  { rank: 5, zone: "Zone 20 (Fatima)",           topsisScore: 0.4180, priorityLevel: "MEDIUM" as const,   nrwPct: 20.4, deficitM3: 2180, populationDensity: 2540, pipeAgeYears: 24, revenueLossPhp: 115000, rationedHours: 16, recommendedAction: "Routine preventative maintenance & AMR meter calibration", estimatedRecoveryM3: 1417, tankerPriority: 5 },
  { rank: 6, zone: "Zone 3 (Magallanes)",        topsisScore: 0.2640, priorityLevel: "LOW" as const,      nrwPct: 18.4, deficitM3: 1420, populationDensity: 3140, pipeAgeYears: 22, revenueLossPhp: 84000,  rationedHours: 24, recommendedAction: "Normal baseline 24-hour continuous supply maintained", estimatedRecoveryM3: 923,  tankerPriority: 6 },
]

const OPT_DEFAULT_FP_RULES = [
  { ruleId: "FP-01", antecedents: ["Heat Index > 38°C", "Peak Midday Hour (12:00-14:00)"], consequents: ["Demand Spike > +25%", "Booster Station A Suction Pressure Drop"], support: "42.0%", confidence: "88.0%", lift: "2.10x", insight: "Elevated ambient heat index during peak midday hours reliably triggers suction pressure drops at Booster Station A due to concurrent commercial cooling and domestic showering." },
  { ruleId: "FP-02", antecedents: ["Rainfall > 80 mm / 24h", "Amihan Monsoon Season"], consequents: ["Raw Water Turbidity Spike", "Unbilled Storm Infiltration NRW"], support: "35.0%", confidence: "82.0%", lift: "2.34x", insight: "Intense tropical rainfall correlates with main pipeline storm infiltration in low-elevation sector 15-C, causing backflow pressure and billing variance." },
  { ruleId: "FP-03", antecedents: ["Minimum Night Flow > 180%", "Off-Peak Tariff Window (01:00-04:00)"], consequents: ["Hidden Trunk Line Burst", "Zone NRW > 25%"], support: "28.0%", confidence: "79.0%", lift: "2.82x", insight: "Excessive night flow between 01:00 and 04:00 reliably flags undetected underground transmission ruptures along Panal and Sto. Cristo distribution mains." },
  { ruleId: "FP-04", antecedents: ["Pump Efficiency < 75%", "Operating Hours > 22h / day"], consequents: ["Specific Energy > 0.55 kWh/m³", "Motor Thermodynamic Overheating"], support: "24.0%", confidence: "74.0%", lift: "1.95x", insight: "Continuous unoptimized pumping beyond allowable thermal duty cycles leads to accelerated thermodynamic degradation and elevated power tariffs." }
]

// ── SCREEN: OPTIMIZATION ───────────────────────────────────────────────────
function OptimizationScreen() {
  const { prescriptive, isLive } = useDashboard()
  const [activeScenario, setActiveScenario] = useState<"normal" | "moderate" | "severe">("normal")
  const [isSolving, setIsSolving] = useState<boolean>(false)
  const [solveIteration, setSolveIteration] = useState<number>(48)
  const [copiedSchedule, setCopiedSchedule] = useState<boolean>(false)

  // Safe coercion helpers
  const toNum = (v: any, fallback = 0): number => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
    return isNaN(n) ? fallback : n
  }
  const fmtN = (v: any, fallback = 0): string => toNum(v, fallback).toLocaleString()
  const fmtD = (v: any, d = 2, fallback = 0): string => toNum(v, fallback).toFixed(d)

  // Facility schedule state driven by prescriptive context or fallback
  const defaultFacilities = (prescriptive?.facilities && prescriptive.facilities.length > 0)
    ? prescriptive.facilities
    : OPT_DEFAULT_FACILITIES

  // Custom edited hours per facility and block
  const [editedHoursMap, setEditedHoursMap] = useState<Record<string, number>>({})

  // Multiplier based on active scenario
  const scenarioMultiplier = activeScenario === "normal" ? 1.0 : activeScenario === "moderate" ? 0.90 : 0.75

  // Helper to get effective hours
  const getHours = (facId: string, blockId: string, defaultVal: number) => {
    const key = `${facId}_${blockId}`
    return editedHoursMap[key] !== undefined ? editedHoursMap[key] : defaultVal
  }

  const handleHourChange = (facId: string, blockId: string, val: string) => {
    const n = parseFloat(val)
    if (isNaN(n) || n < 0 || n > 8) return
    const key = `${facId}_${blockId}`
    setEditedHoursMap(prev => ({ ...prev, [key]: n }))
  }

  const resetToLpOptimum = () => {
    setEditedHoursMap({})
    toast.info("Reset to LP optimal pumping hours", {
      description: "Pumping schedule restored to PuLP CBC solver baseline.",
    })
  }

  const triggerLpSolve = () => {
    setIsSolving(true)
    setTimeout(() => {
      setIsSolving(false)
      setSolveIteration(prev => prev + 1)
      toast.success("LP Optimization Solver Completed", {
        description: "Optimal global solution converged in 0.084s with 0.00% duality gap.",
      })
    }, 600)
  }

  const copyDispatchSchedule = () => {
    const lines = [
      "TCWD AQUASTAT — DAILY PUMP DISPATCH ORDER",
      `Operational Scenario: ${activeScenario.toUpperCase()} | Generated: ${new Date().toLocaleDateString("en-PH")}`,
      "--------------------------------------------------------------------------------",
      "STATION | BLOCK | TARIFF | RUN HRS | DISPATCH VOL | EST. COST",
      ...defaultFacilities.flatMap(f =>
        (f.blocks || []).map(b => {
          const h = getHours(f.id, b.blockId, b.optimizedHours)
          const cost = Math.round(b.optimizedCostPhp * (h / (b.optimizedHours || 1)))
          const vol = Math.round(b.dispatchedVolumeM3 * (h / (b.optimizedHours || 1)))
          return `${f.station.padEnd(20)} | ${b.blockLabel.padEnd(22)} | ₱${b.tariffRatePhpPerKwh}/kWh | ${h}h | ${fmtN(vol)} m³ | ₱${fmtN(cost)}`
        })
      ),
      "--------------------------------------------------------------------------------",
      `Total Projected Monthly Savings: ₱${fmtN(prescriptive?.lpProblemSummary?.monthlySavingsPhp || 656100)} (-${fmtD(prescriptive?.lpProblemSummary?.savingsPercentage || 20.2, 1)}%)`
    ].join("\n")

    navigator.clipboard.writeText(lines).then(() => {
      setCopiedSchedule(true)
      toast.success("Dispatch Order Copied to Clipboard", {
        description: "Ready to paste into TCWD Operations Daily Log or print.",
      })
      setTimeout(() => setCopiedSchedule(false), 3000)
    }).catch(() => {
      toast.error("Could not copy to clipboard")
    })
  }

  // Dynamic cost computations based on edited hours and scenario
  let computedCurrentCost = 0
  let computedOptimizedCost = 0

  defaultFacilities.forEach(f => {
    (f.blocks || []).forEach(b => {
      const currentH = toNum(b.currentHours, 4)
      const optH = getHours(f.id, b.blockId, toNum(b.optimizedHours, 4))
      const costPerOptH = toNum(b.optimizedCostPhp, 200000) / (toNum(b.optimizedHours, 4) || 1)
      const costPerCurH = toNum(b.currentCostPhp, 250000) / (currentH || 1)

      computedCurrentCost += Math.round(currentH * costPerCurH * scenarioMultiplier)
      computedOptimizedCost += Math.round(optH * costPerOptH * scenarioMultiplier)
    })
  })

  const computedSavings = Math.max(0, computedCurrentCost - computedOptimizedCost)
  const computedSavingsPct = computedCurrentCost > 0 ? ((computedSavings / computedCurrentCost) * 100).toFixed(1) : "0.0"

  const tariffs = (prescriptive?.tariffs && prescriptive.tariffs.length > 0)
    ? prescriptive.tariffs
    : OPT_DEFAULT_TARIFFS

  const mcdaRows = (prescriptive?.mcdaPrioritization && prescriptive.mcdaPrioritization.length > 0)
    ? prescriptive.mcdaPrioritization
    : OPT_DEFAULT_MCDA

  const fpRules = (prescriptive?.fpGrowthRules && prescriptive.fpGrowthRules.length > 0)
    ? prescriptive.fpGrowthRules
    : OPT_DEFAULT_FP_RULES

  const lpSummary = prescriptive?.lpProblemSummary || {
    peakTariffKwhShaved: 4850,
    hydraulicReliabilityPct: 99.4,
    solveTimeSeconds: 0.084,
    status: "OPTIMAL",
    iterationCount: 48,
  }

  // Visual Graph Data 1: Pumping Dispatch & Peak Shaving by Time Block
  const dispatchChartData = [
    { block: "Night (22:00-06:00)", baselineHours: 14.5, optHours: 16.4, tariffRate: 6.20, dispatchedM3: 6600 },
    { block: "Morning (06:00-12:00)", baselineHours: 16.5, optHours: 13.2, tariffRate: 8.50, dispatchedM3: 5330 },
    { block: "Afternoon (12:00-18:00)", baselineHours: 15.0, optHours: 12.5, tariffRate: 8.50, dispatchedM3: 5041 },
    { block: "Evening Peak (18:00-22:00)", baselineHours: 11.3, optHours: 6.0, tariffRate: 11.80, dispatchedM3: 2426 },
  ]

  // Visual Graph Data 2: Monthly Energy Cost Comparison by Facility
  const facilityCostChartData = defaultFacilities.map(f => {
    let cur = 0
    let opt = 0
    f.blocks.forEach(b => {
      const h = getHours(f.id, b.blockId, toNum(b.optimizedHours, 4))
      cur += b.currentCostPhp * scenarioMultiplier
      opt += b.optimizedCostPhp * (h / (b.optimizedHours || 1)) * scenarioMultiplier
    })
    return {
      name: f.station.replace(" Station", ""),
      currentCost: Math.round(cur),
      optimizedCost: Math.round(opt),
      savings: Math.round(cur - opt),
    }
  })

  return (
    <div className="space-y-6">
      {/* Page Title & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              Prescriptive Water Allocation &amp; Pumping Optimization
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#0038A8] border border-blue-200">
              Objective 5 · §3.3.3
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Linear Programming (LP) Cost Minimization · Time-of-Use Electricity Tariff Arbitrage · MCDA TOPSIS Water Rationing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerLpSolve}
            disabled={isSolving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0038A8] text-white hover:bg-[#002b80] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={12} className={isSolving ? "animate-spin" : ""} />
            {isSolving ? "Solving LP Model…" : "Re-run LP Solver"}
          </button>

          <button
            onClick={copyDispatchSchedule}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            {copiedSchedule ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Copy size={12} />}
            {copiedSchedule ? "Copied!" : "Export Dispatch Order"}
          </button>
        </div>
      </div>

      {/* Scenario Switcher Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1">
            <Sliders size={13} className="text-slate-400" />
            Operational Scenario:
          </span>
          <button
            onClick={() => setActiveScenario("normal")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeScenario === "normal"
                ? "bg-[#0038A8] text-white shadow-sm font-semibold"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Normal Operations (Cost Min.)
          </button>
          <button
            onClick={() => setActiveScenario("moderate")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeScenario === "moderate"
                ? "bg-amber-600 text-white shadow-sm font-semibold"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Moderate Dry Season (-10% Yield)
          </button>
          <button
            onClick={() => setActiveScenario("severe")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeScenario === "severe"
                ? "bg-red-600 text-white shadow-sm font-semibold"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Severe Drought (-25% Deficit &amp; Rationing)
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Solver: <strong>PuLP / COIN-OR CBC</strong> (Iter #{solveIteration})</span>
        </div>
      </div>

      {/* Mathematical LP Problem Formulation Card (§3.3.3) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white shadow-md border border-slate-700 space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-blue-400" />
            <h3 className="text-sm font-bold tracking-wide uppercase text-blue-200">
              Linear Programming (LP) Mathematical Formulation (§3.3.3)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
            Optimal Solution Verified (Duality Gap: 0.00%)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-sans">Objective Function (Cost Minimization)</p>
            <p className="text-emerald-300 font-bold text-sm">
              Minimize C<sub>total</sub> = ∑<sub>s=1</sub><sup>10</sup> ∑<sub>t=1</sub><sup>4</sup> (Tariff<sub>t</sub> · SpecificEnergy<sub>s</sub> + Maint<sub>s</sub>) · X<sub>s,t</sub>
            </p>
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
              Minimizes cumulative electromechanical power expenditures by allocating production flow across 6 gravity springs and 4 deep wells over 4 daily electricity tariff blocks.
            </p>
          </div>

          <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-sans">Active Operational Constraints</p>
            <div className="space-y-1 text-slate-300 text-[11px]">
              <p><span className="text-blue-300 font-bold">1. Demand Satisfaction:</span> ∑<sub>s</sub> X<sub>s,t</sub> ≥ D&#770;<sub>t</sub> (LSTM Champion Forecast)</p>
              <p><span className="text-blue-300 font-bold">2. Facility Yield Limit:</span> 0 ≤ X<sub>s,t</sub> ≤ Cap<sub>s</sub><sup>max</sup> · u<sub>s,t</sub></p>
              <p><span className="text-blue-300 font-bold">3. Duty Cycle Bound:</span> ∑<sub>t</sub> u<sub>s,t</sub> ≤ H<sub>s</sub><sup>max</sup> (max daily pump run hours)</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Baseline Unoptimized Cost</p>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            ₱{fmtN(computedCurrentCost)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Flat continuous pumping</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">LP Optimized Cost</p>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            ₱{fmtN(computedOptimizedCost)}
          </p>
          <p className="text-[11px] text-emerald-600 mt-1">Time-of-use tariff optimized</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">Monthly Power Savings</p>
            <TrendingDown size={14} className="text-emerald-600" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-800 mt-1">
            ₱{fmtN(computedSavings)}
          </p>
          <p className="text-[11px] font-bold text-emerald-700 mt-1">
            -{computedSavingsPct}% Power Expenditure
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-[#0038A8] uppercase tracking-wider">Peak Tariff Shaved</p>
            <Zap size={14} className="text-[#0038A8]" />
          </div>
          <p className="text-xl font-bold font-mono text-[#0038A8] mt-1">
            {fmtN(lpSummary?.peakTariffKwhShaved || 4850)} kWh
          </p>
          <p className="text-[11px] text-blue-700 mt-1">
            Reliability Index: <strong>{fmtD(lpSummary?.hydraulicReliabilityPct || 99.4, 1)}%</strong>
          </p>
        </div>
      </div>

      {/* ── VISUAL OPTIMIZATION GRAPHS (Peak Shaving & Cost Waterfall) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Pumping Hours & Tariff Arbitrage */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 size={15} className="text-[#0038A8]" />
                Peak Load Shaving: Baseline vs. Optimized Pumping Hours
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Strategic load shifting: Throttling evening peak (₱11.80/kWh) and ramping night off-peak (₱6.20/kWh)
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dispatchChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="block" tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} unit="h" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#DC2626" }} axisLine={false} tickLine={false} unit="₱" domain={[0, 15]} />
                <RTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-lg text-[11px] space-y-1">
                          <p className="font-bold border-b border-white/20 pb-1">{data.block}</p>
                          <p className="text-slate-300">Baseline Run: <strong className="text-white">{data.baselineHours}h</strong></p>
                          <p className="text-emerald-300">LP Optimized: <strong className="text-white">{data.optHours}h</strong> ({data.optHours > data.baselineHours ? `+${(data.optHours - data.baselineHours).toFixed(1)}h` : `${(data.optHours - data.baselineHours).toFixed(1)}h`})</p>
                          <p className="text-amber-300">APEC Electricity Tariff: <strong>₱{data.tariffRate.toFixed(2)}/kWh</strong></p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                <Bar yAxisId="left" dataKey="baselineHours" name="Baseline Run Hours" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="optHours" name="LP Optimized Hours" fill="#0038A8" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="tariffRate" name="APEC Tariff (₱/kWh)" stroke="#DC2626" strokeWidth={2.5} dot={{ r: 4, fill: "#DC2626" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Monthly Energy Cost Comparison by Facility */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <DollarSign size={15} className="text-emerald-600" />
                Monthly Power Expenditure by Pump Station (PHP)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Financial comparison per major pumping installation under LP dispatch
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Total Savings: ₱{fmtN(computedSavings)}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={facilityCostChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                <RTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-lg text-[11px] space-y-1">
                          <p className="font-bold border-b border-white/20 pb-1">{data.name}</p>
                          <p className="text-slate-300">Baseline Cost: <strong>₱{data.currentCost.toLocaleString()}</strong></p>
                          <p className="text-emerald-300">Optimized Cost: <strong>₱{data.optimizedCost.toLocaleString()}</strong></p>
                          <p className="text-blue-300 font-bold">Net Savings: ₱{data.savings.toLocaleString()} (-{((data.savings / data.currentCost) * 100).toFixed(1)}%)</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                <Bar dataKey="currentCost" name="Baseline Cost (₱)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="optimizedCost" name="Optimized Cost (₱)" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Time-of-Use (TOU) Energy Tariff Arbitrage Strategy Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Zap size={15} className="text-amber-500" />
              Time-of-Use (TOU) Electricity Tariff Arbitrage Strategy (§3.3.3)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tariff schedules based on Albay Power &amp; Energy Corp. (APEC) commercial water utility tariff brackets
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">4 Time Blocks / 24 Hours</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {tariffs.map(t => (
            <div
              key={t.blockId}
              className={`rounded-lg p-3.5 border transition-all ${
                t.classification === "Off-Peak"
                  ? "bg-emerald-50/50 border-emerald-200"
                  : t.classification === "Peak"
                  ? "bg-red-50/50 border-red-200"
                  : "bg-blue-50/40 border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">{t.blockName}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  t.classification === "Off-Peak"
                    ? "bg-emerald-100 text-emerald-800"
                    : t.classification === "Peak"
                    ? "bg-red-100 text-red-800"
                    : "bg-blue-100 text-blue-800"
                }`}>
                  {t.classification}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1">{t.timeRange}</p>
              <p className="text-lg font-bold font-mono text-slate-900 mt-1">
                ₱{fmtD(t.ratePhpPerKwh, 2)} <span className="text-[10px] font-sans font-normal text-slate-500">/ kWh</span>
              </p>
              <p className="text-[10px] text-slate-600 mt-2 border-t border-slate-200/60 pt-1.5 leading-relaxed">
                {t.strategyDirective}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Pumping Schedule Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Optimal Pumping Dispatch Schedule &amp; Cost Variance
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Edit &quot;Optimized Hrs&quot; to test manual operator overrides; live solver updates cost and savings
            </p>
          </div>
          <button
            onClick={resetToLpOptimum}
            className="text-[11px] font-medium text-[#0038A8] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={11} /> Reset to LP Optimum
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-2.5 text-left">Pumping Station</th>
                <th className="px-4 py-2.5 text-left">Time Block</th>
                <th className="px-3 py-2.5 text-left">Tariff</th>
                <th className="px-3 py-2.5 text-center">Baseline Hrs</th>
                <th className="px-4 py-2.5 text-center">Optimized Hrs</th>
                <th className="px-3 py-2.5 text-center">Δ Shift</th>
                <th className="px-4 py-2.5 text-right">Dispatched Vol</th>
                <th className="px-4 py-2.5 text-right">Baseline Cost</th>
                <th className="px-4 py-2.5 text-right">Optimized Cost</th>
                <th className="px-4 py-2.5 text-center">Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {defaultFacilities.map((fac) => (
                (fac.blocks || []).map((b, bi) => {
                  const currentH = toNum(b.currentHours, 4)
                  const optH = getHours(fac.id, b.blockId, toNum(b.optimizedHours, 4))
                  const deltaH = parseFloat((optH - currentH).toFixed(1))
                  const costPerOptH = toNum(b.optimizedCostPhp, 200000) / (toNum(b.optimizedHours, 4) || 1)
                  const newCost = Math.round(optH * costPerOptH * scenarioMultiplier)
                  const curCost = Math.round(toNum(b.currentCostPhp, 250000) * scenarioMultiplier)
                  const lineSavings = curCost - newCost
                  const lineSavingsPct = curCost > 0 ? ((lineSavings / curCost) * 100).toFixed(1) : "0.0"
                  const volDispatched = Math.round(toNum(b.dispatchedVolumeM3, 1000) * (optH / (toNum(b.optimizedHours, 4) || 1)))

                  return (
                    <tr key={`${fac.id}-${b.blockId}`} className="hover:bg-slate-50/70 transition-colors">
                      {bi === 0 && (
                        <td
                          rowSpan={fac.blocks?.length || 4}
                          className="px-4 py-3 font-bold text-slate-900 border-r border-slate-100 align-top bg-slate-50/30"
                        >
                          <div>{fac.station}</div>
                          <div className="text-[10px] font-normal text-slate-400 mt-0.5">{fac.type}</div>
                          <div className="text-[10px] font-mono text-[#0038A8] mt-1 font-semibold">
                            Cap: {fmtN(fac.capacityM3PerDay)} m³/d
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-2.5 text-slate-700 font-medium">
                        {b.blockLabel}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          b.tariffPeriod === "Off-Peak"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.tariffPeriod === "Peak"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          ₱{fmtD(b.tariffRatePhpPerKwh, 2)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                        {fmtD(currentH, 1)}h
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="8"
                          step="0.1"
                          value={optH}
                          onChange={e => handleHourChange(fac.id, b.blockId, e.target.value)}
                          className="w-16 text-center font-mono text-xs font-bold text-[#0038A8] border border-blue-200 rounded-md py-1 bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-[#0038A8]/20"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          deltaH > 0
                            ? "bg-amber-100 text-amber-800"
                            : deltaH < 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {deltaH > 0 ? `+${deltaH}h ↑` : deltaH < 0 ? `${deltaH}h ↓` : "0.0h"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                        {fmtN(volDispatched)} m³
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600">
                        ₱{fmtN(curCost)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                        ₱{fmtN(newCost)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          lineSavings > 0
                            ? "bg-emerald-100 text-emerald-800"
                            : lineSavings < 0
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {lineSavings > 0 ? `−${lineSavingsPct}%` : `+${Math.abs(Number(lineSavingsPct))}%`}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Criteria Decision Analysis (MCDA - TOPSIS) Water Rationing Table (§3.3.3) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-[#0038A8]" />
              <h3 className="text-sm font-bold text-slate-800">
                Multi-Criteria Decision Analysis (MCDA - TOPSIS) — Water Rationing &amp; Deficit Intervention
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Mathematical criteria weights: NRW Leakage (30%) · Deficit Severity (25%) · Population Density (15%) · Pipe Age (15%) · Revenue Loss (15%)
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
            Mandatory Trigger under Dry Season Deficit
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-2.5 text-center">Rank</th>
                <th className="px-4 py-2.5 text-left">Service Zone</th>
                <th className="px-3 py-2.5 text-center">TOPSIS Score (C<sub>i</sub>)</th>
                <th className="px-3 py-2.5 text-center">Priority</th>
                <th className="px-3 py-2.5 text-right">NRW %</th>
                <th className="px-3 py-2.5 text-right">Deficit</th>
                <th className="px-3 py-2.5 text-center">Rationed Supply</th>
                <th className="px-3 py-2.5 text-center">Tanker Standby</th>
                <th className="px-5 py-2.5 text-left">Prescriptive Engineering Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mcdaRows.map(row => (
                <tr key={row.rank} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 text-center font-bold text-slate-800">
                    #{row.rank}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#0038A8]">
                    {row.zone}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                    {fmtD(row.topsisScore, 4)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      row.priorityLevel === "CRITICAL"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : row.priorityLevel === "HIGH"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : row.priorityLevel === "MEDIUM"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      {row.priorityLevel}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-red-600">
                    {fmtD(row.nrwPct, 1)}%
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-slate-700">
                    {fmtN(row.deficitM3)} m³
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {row.rationedHours || 8}h / day
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (row.tankerPriority || 1) <= 2
                        ? "bg-purple-100 text-purple-800 font-bold"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      Priority #{row.tankerPriority || 1}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-[11px] leading-relaxed">
                    {row.recommendedAction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FP-Growth Association Rule Mining (§3.1.5) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles size={15} className="text-purple-600" />
              FP-Growth Frequent Pattern Mining — Joint Operational Risk Rules (§3.1.5)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Uncovered association rules linking climatological thresholds, peak electricity tariffs, and pipeline failure incidents
            </p>
          </div>
          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
            Min Support: 20% · Min Confidence: 60%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fpRules.map(rule => (
            <div
              key={rule.ruleId}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:shadow-md transition-all space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#0038A8] bg-blue-100 px-2 py-0.5 rounded">
                  {rule.ruleId}
                </span>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                  <span>Support: <strong>{rule.support}</strong></span>
                  <span>Confidence: <strong>{rule.confidence}</strong></span>
                  <span className="text-purple-700 font-bold">Lift: {rule.lift}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {(rule.antecedents || []).map((ant, idx) => (
                  <span key={idx} className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-medium">
                    {ant}
                  </span>
                ))}
                <ArrowRight size={12} className="text-slate-400" />
                {(rule.consequents || []).map((con, idx) => (
                  <span key={idx} className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-medium">
                    {con}
                  </span>
                ))}
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-2 italic">
                {rule.insight}
              </p>
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
  const [notes, setNotes] = useState<string>("")
  const [signatory, setSignatory] = useState<string>("J. Reyes")
  const [designation, setDesignation] = useState<string>("Operations Manager · TCWD")
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

  const NOTE_PRESETS = [
    {
      label: "Q1 2026 Peak Season Action Directive",
      text: "Directives approved for TCWD Board Action: (1) Pre-fill elevated storage reservoirs at 100% capacity during Off-Peak tariff block (22:00-06:00). (2) Throttle deep-well pumps during Evening Peak (18:00-22:00) to shave ₱656,100/mo in electricity tariffs. (3) Stage mobile water tankers for priority supply in Zones 1 and 2."
    },
    {
      label: "LWUA NRW Compliance Milestone",
      text: "Board Resolution Compliance Note: System NRW at 28.0% exceeds the 20.0% LWUA threshold. Acoustic leak sweeps in Panal-Poblacion DMA successfully recovered an estimated 4.2% physical losses. Field inspection of Cluster 4 delinquent accounts scheduled for next cycle."
    },
    {
      label: "Pumping Dispatch & Engineering Caveat",
      text: "Engineering Advisory: San Vicente Main PS-01 deep well scheduled for routine submersible impeller servicing on Oct 18. Booster Station A and B will absorb intermediate hydraulic flow under standard operating tariffs."
    }
  ]

  const canGenerate = reportType && format && !generating
  const preview = reportType ? REPORT_PREVIEWS[reportType] : null

  const handleCopyMemo = () => {
    if (!reportType) {
      toast.error("Please select a report type first")
      return
    }
    const rt = reportTypes.find(r => r.id === reportType)
    const memoText = `======================================================================
AQUASTAT TCWD DECISION SUPPORT SYSTEM · OFFICIAL EXECUTIVE BOARD BRIEF
Tabaco City Water District · Department of Operations & Analytics
======================================================================
Document: ${rt?.title || "Executive Briefing"}
Reporting Period: ${startDate} to ${endDate}
Geographic Scope: ${zones === "all" ? "All 20 Service Zones" : zones.toUpperCase()}
Report Signatory: ${signatory} (${designation})
Generated On: ${new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at ${new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })} PHT

----------------------------------------------------------------------
1. AUTOMATED PREDICTIVE & PRESCRIPTIVE SUMMARY
----------------------------------------------------------------------
${rt?.id === "demand" ? "Ensemble ML models (SARIMA + LSTM) project total Q4 2025 consumption at 196,400 m³ (+1.4% MoM). Peak dry season demand arrives April 2026 with an anticipated deficit of 41,800 m³/mo in Zones 1 and 2 (Model MAPE: 3.24%)." : rt?.desc}

----------------------------------------------------------------------
2. EXECUTIVE ANNOTATIONS & OPERATIONAL DIRECTIVES (§1.3.2 Objective 1)
----------------------------------------------------------------------
${notes.trim() ? notes : "No manual notes or operational caveats entered by the operator."}

----------------------------------------------------------------------
3. COMPLIANCE & AUTHORIZATION
----------------------------------------------------------------------
Submitted to: General Manager & TCWD Board of Directors
Status: APPROVED FOR DISTRIBUTION AND LWUA SUBMISSION
======================================================================`

    navigator.clipboard.writeText(memoText)
    toast.success("Executive Board Memo copied to clipboard!", {
      description: `Includes automated analytics and notes signed by ${signatory}.`
    })
  }

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
        const hasNotes = Boolean(notes.trim())
        const record: ExportRecord = {
          id: nextId.current++,
          title: `${rt.title}${hasNotes ? " (with Executive Notes)" : ""}`,
          format: fmt.label,
          size: fmt.size(),
          timestamp: new Date(),
        }
        setHistory(prev => [record, ...prev])
        toast.success(`${rt.title} downloaded`, {
          description: `${fmt.label} · ${record.size} · Signed by ${signatory} (${record.timestamp.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })} PHT)`,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Export &amp; Report Builder</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Customizable reporting with qualitative operator annotations · LWUA compliance documentation (§1.3.2 Objective 1, §3.6.10)
          </p>
        </div>
        {reportType && (
          <button
            onClick={handleCopyMemo}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0038A8] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
            title="Copy complete board report with manual annotations"
          >
            <Copy size={13} />
            <span>Copy Board Memo</span>
          </button>
        )}
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
          Period &amp; Scope
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
              <option value="zone1">Zone 1 (Tabaco Center)</option>
              <option value="zone2">Zone 2 (Panal / Poblacion)</option>
              <option value="custom">Custom Selection…</option>
            </select>
          </div>
        </div>
      </div>

      {/* Step 3: Executive Annotations & Manual Notes (§1.3.2 Objective 1, §3.6.10) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#0038A8] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</span>
              <MessageSquare size={14} className="text-[#0038A8]" />
              Executive Annotations &amp; Policy Directives (Manual Input)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Manuscript §1.3.2 Objective 1 requirement: append qualitative observations, engineering caveats, and board directives to official exports
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400 self-end sm:self-auto">
            {notes.length} characters
          </span>
        </div>

        {/* Quick Insert Preset Buttons */}
        <div>
          <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1">
            <Sparkles size={11} className="text-[#0038A8]" />
            Quick Insert Standard Directives:
          </p>
          <div className="flex flex-wrap gap-2">
            {NOTE_PRESETS.map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setNotes(preset.text)}
                className="text-[11px] bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#0038A8] border border-slate-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left"
              >
                + {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes Textarea */}
        <div className="relative">
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Type executive observations, operational caveats, or official board directives to be included with this export (e.g. 'Priority pipe rehabilitation authorized for Panal DMA in Q1 2026. Pre-fill elevated storage reservoirs during Night Off-Peak block.')..."
            className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 bg-slate-50/70 focus:outline-none focus:border-[#0038A8] focus:ring-2 focus:ring-[#0038A8]/10 transition-all resize-y leading-relaxed"
          />
          {notes && (
            <button
              onClick={() => setNotes("")}
              className="absolute top-2 right-2 text-[10px] text-slate-400 hover:text-slate-600 bg-white/80 border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Signatory credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">
              Reporting Signatory
            </label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50/50">
              <User size={13} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={signatory}
                onChange={e => setSignatory(e.target.value)}
                className="w-full text-xs text-slate-800 bg-transparent focus:outline-none font-medium"
                placeholder="Operator name"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">
              Official Designation / Department
            </label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50/50">
              <Shield size={13} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                className="w-full text-xs text-slate-800 bg-transparent focus:outline-none font-medium"
                placeholder="Department role"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step 4: Output Format */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#0038A8] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">4</span>
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

      {/* Dynamic Summary Preview (with integrated Manual Notes Addendum) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Activity size={14} className="text-[#0038A8]" />
            Official Report &amp; Executive Memo Preview
          </h3>
          <div className="flex items-center gap-2">
            {notes && (
              <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                Includes Manual Directives
              </span>
            )}
            <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
              Live Preview
            </span>
          </div>
        </div>

        <div className="p-5 bg-slate-50/50 space-y-4">
          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div key={reportType} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }} className="space-y-4">
                {/* Machine Learning / Statistical Core Summary */}
                <div className="text-xs text-slate-700 leading-relaxed bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
                  <p className="font-bold text-slate-900 mb-2 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                    <span>{preview.title}</span>
                    <span className="text-[10px] font-normal text-slate-400 font-mono">
                      Scope: {zones === "all" ? "All Zones" : zones} · {startDate} to {endDate}
                    </span>
                  </p>
                  <div>{preview.body}</div>
                </div>

                {/* Qualitative Executive Annotation Callout (Rendered when notes exist) */}
                {notes.trim() ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-blue-50/80 border-l-4 border-l-[#0038A8] border-y border-r border-blue-200 rounded-r-lg p-3.5 text-xs text-blue-900 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-[#0038A8]">
                        <PenTool size={12} />
                        Executive Observation &amp; Operational Caveats (§3.6.10):
                      </span>
                      <span className="text-[10px] font-mono text-blue-600">
                        Signatory: {signatory} ({designation})
                      </span>
                    </div>
                    <p className="text-blue-950 font-sans italic leading-relaxed pl-2">
                      &quot;{notes}&quot;
                    </p>
                    <div className="text-[10px] text-blue-600 pt-1 border-t border-blue-200/60 flex items-center justify-between">
                      <span>Certified for LWUA compliance review &amp; TCWD Engineering Section</span>
                      <span>Recorded: {new Date().toLocaleDateString("en-PH")}</span>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic bg-white/70 p-3 rounded border border-dashed border-slate-200 text-center">
                    Optional: Add manual text directives or caveats in Step 3 above to embed executive commentary into this export.
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.p key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs text-slate-400 italic py-4 text-center">
                Select a report type above to preview the automated summary and manual executive annotations.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Generate Button + Progress */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {!reportType && !format && "Select a report type and format to continue."}
            {reportType && !format && "Select an output format (PDF, CSV, Excel) to continue."}
            {!reportType && format && "Select a report type to continue."}
            {reportType && format && !generating && (
              <span className="text-slate-700">
                Ready: <span className="font-semibold text-[#0038A8]">{reportTypes.find(r => r.id === reportType)?.title}</span> as{" "}
                <span className="font-semibold">{formats.find(f => f.id === format)?.label}</span>
                {notes.trim() && <span className="text-emerald-600 font-semibold"> (with Executive Annotations)</span>}
              </span>
            )}
            {generating && <span className="text-[#0038A8] font-semibold">Compiling document… {Math.round(progress)}%</span>}
          </div>
          <div className="flex items-center gap-2">
            {reportType && (
              <button
                type="button"
                onClick={handleCopyMemo}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <Copy size={14} />
                <span>Copy Memo</span>
              </button>
            )}
            <button onClick={handleGenerate} disabled={!canGenerate}
              className="flex items-center gap-2 text-sm font-semibold text-white px-6 py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer shadow-sm"
              style={{ background: generating ? "#6B8FD4" : "#0038A8" }}>
              {generating ? (
                <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block"><RefreshCw size={15} /></motion.span> Generating…</>
              ) : (
                <><Download size={15} /> Generate &amp; Download</>
              )}
            </button>
          </div>
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
function Sidebar({ current, onNavigate, collapsed, onToggle, onOpenSearch, user, onOpenProfile, onInitiateLogout }: {
  current: ScreenId; onNavigate: (s: ScreenId) => void
  collapsed: boolean; onToggle: () => void
  onOpenSearch?: () => void
  user: UserAccount
  onOpenProfile: () => void
  onInitiateLogout: () => void
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

      {/* Quick Search trigger in Sidebar */}
      {!collapsed && onOpenSearch && (
        <div className="px-3 pt-3 pb-1">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Search size={13} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span className="text-[11px] font-medium text-slate-300">Quick Command</span>
            </div>
            <kbd className="text-[9px] font-mono text-slate-400 bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
              Ctrl K
            </kbd>
          </button>
        </div>
      )}

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

      {/* Footer User Profile Card with Direct Log Out */}
      {!collapsed ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="border-t border-white/5 px-3 py-3">
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-colors group">
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
              title="Click to view officer credentials & profile"
            >
              <div className="w-8 h-8 rounded-full bg-[#0038A8] border border-white/20 flex items-center justify-center flex-shrink-0 text-white font-mono font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
                {user.avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors truncate">{user.name.split(",")[0]}</p>
                <p className="text-[10px] text-blue-300/70 truncate">{user.role}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={onInitiateLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/15 border border-transparent hover:border-red-500/30 transition-all cursor-pointer flex-shrink-0"
              title="Log Out (Sign out of session)"
              aria-label="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-white/5 flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              <span>Secure session · TLS 1.3</span>
            </div>
            <button
              type="button"
              onClick={onInitiateLogout}
              className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-red-400 transition-colors cursor-pointer group"
              title="Log Out (Sign out of session)"
            >
              <LogOut size={11} className="group-hover:translate-x-0.5 transition-transform" />
              <span>Log out</span>
            </button>
          </div>
          <p className="text-[9px] text-slate-600 mt-1 px-1">AquaStat v2.4.1</p>
        </motion.div>
      ) : (
        <div className="border-t border-white/5 py-3 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-full bg-[#0038A8] border border-white/20 flex items-center justify-center text-white font-mono font-bold text-xs cursor-pointer shadow-sm hover:scale-105 transition-transform"
            title={`Signed in as ${user.name} — Click to view profile`}
          >
            {user.avatarInitials}
          </button>
          <button
            type="button"
            onClick={onInitiateLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
            title="Log Out (Sign out of session)"
            aria-label="Log Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}
    </motion.aside>
  )
}

// ── GLOBAL SEARCH & COMMAND PALETTE REGISTRY ────────────────────────────────
interface SearchItem {
  id: string
  title: string
  category: "Zone / Barangay" | "Analytics Module" | "Production Facility" | "Algorithm / Model"
  subtitle: string
  screen: ScreenId
  badge?: string
  zoneId?: number
}

const SEARCH_REGISTRY: SearchItem[] = [
  // Analytics Modules
  { id: "mod-opt",   title: "Prescriptive Optimization & Pump Scheduling", category: "Analytics Module", subtitle: "MILP cost minimization, TOU tariffs, and MCDA TOPSIS rationing", screen: "optimization", badge: "Prescriptive" },
  { id: "mod-pred",  title: "Demand Forecasting & Predictive Tier", category: "Analytics Module", subtitle: "Multivariate LSTM, SARIMA, Meta Prophet, and XGBoost models", screen: "predictive", badge: "Predictive" },
  { id: "mod-desc",  title: "Descriptive Analytics & Customer Segmentation", category: "Analytics Module", subtitle: "K-Means clustering (k=4), RFM consumer profiling, and historical heatmaps", screen: "descriptive", badge: "Descriptive" },
  { id: "mod-nrw",   title: "NRW Hotspot Analysis & Water Balance Audit", category: "Analytics Module", subtitle: "IWA standard water loss accounting and acoustic sweep schedule", screen: "nrw", badge: "Operations" },
  { id: "mod-short", title: "Supply & Shortage Monitoring", category: "Analytics Module", subtitle: "Sustainable supply capacity, storage gauges, and dry season deficits", screen: "shortage", badge: "Operations" },
  { id: "mod-weath", title: "Weather & Climate Correlation", category: "Analytics Module", subtitle: "PAGASA Doppler live radar, r²=0.72 demand regression, and 10-day forecast", screen: "weather", badge: "External Regressors" },
  { id: "mod-zones", title: "Service Zone-by-Zone Detailed Analysis", category: "Analytics Module", subtitle: "20 zone profiles, diurnal consumption curves, and connection counts", screen: "zones", badge: "Spatial" },
  { id: "mod-alert", title: "Alerts & Operational Notifications", category: "Analytics Module", subtitle: "Centralized threshold monitoring, pressure drop flags, and work orders", screen: "alerts", badge: "Alerts" },
  { id: "mod-exp",   title: "Export & Report Builder (with Executive Notes)", category: "Analytics Module", subtitle: "LWUA compliance documentation, manual annotations, and PDF/CSV export", screen: "export", badge: "Reporting" },
  { id: "mod-dash",  title: "Executive Overview Dashboard", category: "Analytics Module", subtitle: "High-level summary metrics, NRW gauges, and real-time operational status", screen: "dashboard", badge: "Executive" },

  // Zones & Barangays in Tabaco City (Deep-linked with zoneId)
  { id: "zone-01", title: "Zone 1 · Tabaco Center (Poblacion)", category: "Zone / Barangay", subtitle: "Commercial core · 24.2% NRW · 892 accounts · Pop: 4,120", screen: "zones", badge: "Critical Zone", zoneId: 1 },
  { id: "zone-02", title: "Zone 2 · Panal (Poblacion)", category: "Zone / Barangay", subtitle: "High density · 27.0% NRW · 1,124 accounts · Pop: 5,280", screen: "zones", badge: "Critical Zone", zoneId: 2 },
  { id: "zone-03", title: "Zone 3 · Magallanes", category: "Zone / Barangay", subtitle: "Coastal sector · 18.4% NRW · 698 accounts · Pop: 3,140", screen: "zones", badge: "Warning Zone", zoneId: 3 },
  { id: "zone-04", title: "Zone 4 · San Roque", category: "Zone / Barangay", subtitle: "Residential · 14.8% NRW · 582 accounts · Pop: 2,680", screen: "zones", badge: "Normal Zone", zoneId: 4 },
  { id: "zone-05", title: "Zone 5 · Cormidal", category: "Zone / Barangay", subtitle: "Intermediate grid · 16.2% NRW · 461 accounts · Pop: 2,100", screen: "zones", badge: "Warning Zone", zoneId: 5 },
  { id: "zone-06", title: "Zone 6 · Tagas", category: "Zone / Barangay", subtitle: "Low leakage · 12.4% NRW · 428 accounts · Pop: 1,980", screen: "zones", badge: "Normal Zone", zoneId: 6 },
  { id: "zone-07", title: "Zone 7 · Sagrada / Fatima", category: "Zone / Barangay", subtitle: "Elevated sector · 19.8% NRW · 802 accounts · Pop: 3,720", screen: "zones", badge: "Warning Zone", zoneId: 7 },
  { id: "zone-08", title: "Zone 8 · Tayhi", category: "Zone / Barangay", subtitle: "Urban residential · 11.2% NRW · 384 accounts · Pop: 1,760", screen: "zones", badge: "Normal Zone", zoneId: 8 },
  { id: "zone-09", title: "Zone 9 · Bombon", category: "Zone / Barangay", subtitle: "Midday pressure draw · 17.6% NRW · 502 accounts · Pop: 2,320", screen: "zones", badge: "Warning Zone", zoneId: 9 },
  { id: "zone-10", title: "Zone 10 · Baranghawon", category: "Zone / Barangay", subtitle: "Standard baseline · 10.8% NRW · 318 accounts · Pop: 1,440", screen: "zones", badge: "Normal Zone", zoneId: 10 },
  { id: "zone-11", title: "Zone 11 · San Carlos", category: "Zone / Barangay", subtitle: "Low NRW loss · 15.4% NRW · 437 accounts · Pop: 2,020", screen: "zones", badge: "Normal Zone", zoneId: 11 },
  { id: "zone-12", title: "Zone 12 · Basud", category: "Zone / Barangay", subtitle: "Rural connection grid · 9.8% NRW · 286 accounts · Pop: 1,320", screen: "zones", badge: "Normal Zone", zoneId: 12 },
  { id: "zone-13", title: "Zone 13 · San Vicente", category: "Zone / Barangay", subtitle: "Main well proximity · 16.8% NRW · 449 accounts · Pop: 2,080", screen: "zones", badge: "Warning Zone", zoneId: 13 },
  { id: "zone-14", title: "Zone 14 · Quinastillohan", category: "Zone / Barangay", subtitle: "Agricultural buffer · 13.2% NRW · 363 accounts · Pop: 1,680", screen: "zones", badge: "Normal Zone", zoneId: 14 },
  { id: "zone-15", title: "Zone 15 · Sto. Cristo", category: "Zone / Barangay", subtitle: "High priority DMA · 22.3% NRW · 620 accounts · Pop: 3,360", screen: "zones", badge: "Critical Zone", zoneId: 15 },
  { id: "zone-16", title: "Zone 16 · Fatima (Upland)", category: "Zone / Barangay", subtitle: "Pressure stepdown active · 18.2% NRW · 410 accounts · Pop: 1,940", screen: "zones", badge: "Warning Zone", zoneId: 16 },
  { id: "zone-17", title: "Zone 17 · Buang", category: "Zone / Barangay", subtitle: "Booster station feed · 20.4% NRW · 512 accounts · Pop: 2,540", screen: "zones", badge: "Critical Zone", zoneId: 17 },
  { id: "zone-18", title: "Zone 18 · Mariroc", category: "Zone / Barangay", subtitle: "Peripheral sector · 14.2% NRW · 340 accounts · Pop: 1,590", screen: "zones", badge: "Normal Zone", zoneId: 18 },
  { id: "zone-19", title: "Zone 19 · Pinagbobong", category: "Zone / Barangay", subtitle: "Gravity spring intake · 11.5% NRW · 290 accounts · Pop: 1,350", screen: "zones", badge: "Normal Zone", zoneId: 19 },
  { id: "zone-20", title: "Zone 20 · Bogñabong", category: "Zone / Barangay", subtitle: "Southern boundary grid · 16.0% NRW · 375 accounts · Pop: 1,740", screen: "zones", badge: "Warning Zone", zoneId: 20 },

  // Production Facilities
  { id: "fac-ps01", title: "San Vicente Main Pumping Station PS-01", category: "Production Facility", subtitle: "6,000 m³/day submersible deep well extraction · 0.38 kWh/m³", screen: "optimization", badge: "Main Pump" },
  { id: "fac-psa",  title: "Booster Station A — Panal Intermediate", category: "Production Facility", subtitle: "4,500 m³/day variable frequency drive booster · 0.44 kWh/m³", screen: "optimization", badge: "Booster A" },
  { id: "fac-psb",  title: "Booster Station B — Buang High-Elevation", category: "Production Facility", subtitle: "3,200 m³/day multi-stage booster pump · 0.52 kWh/m³", screen: "optimization", badge: "Booster B" },
  { id: "fac-spr",  title: "Mayon Mountain Gravity Springs (Pinagbobong & Buang)", category: "Production Facility", subtitle: "1,800 m³/day uninterrupted gravity flow · ₱0.00 electricity cost", screen: "shortage", badge: "Gravity Springs" },

  // Algorithmic Models in Manuscript
  { id: "algo-milp",   title: "Mixed-Integer Linear Programming (MILP)", category: "Algorithm / Model", subtitle: "Objective: Min Total Pumping Cost subject to demand & hydraulic constraints", screen: "optimization", badge: "Mathematical Model" },
  { id: "algo-topsis", title: "TOPSIS Multi-Criteria Decision Analysis (MCDA)", category: "Algorithm / Model", subtitle: "Optimal water rationing prioritization under drought deficit scenarios", screen: "optimization", badge: "Decision Analysis" },
  { id: "algo-fpg",    title: "FP-Growth Association Rule Mining", category: "Algorithm / Model", subtitle: "Uncovering hidden relationships between weather, night flow, and pipe bursts", screen: "optimization", badge: "Pattern Mining" },
  { id: "algo-lstm",   title: "Multivariate Long Short-Term Memory (LSTM)", category: "Algorithm / Model", subtitle: "Champion forecasting neural network utilizing temperature and rainfall lag tensors", screen: "predictive", badge: "Deep Learning" },
  { id: "algo-kmeans", title: "K-Means Consumer Segmentation (k = 4)", category: "Algorithm / Model", subtitle: "RFM behavioral profiling of 26,720 active consumer connections", screen: "descriptive", badge: "Clustering" }
]

function SearchPaletteModal({
  isOpen,
  onClose,
  onSelectScreen
}: {
  isOpen: boolean
  onClose: () => void
  onSelectScreen: (s: ScreenId, zoneId?: number) => void
}) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  if (!isOpen) return null

  const trimmed = query.trim().toLowerCase()
  const filtered = trimmed === ""
    ? SEARCH_REGISTRY.slice(0, 10)
    : SEARCH_REGISTRY.filter(item =>
        item.title.toLowerCase().includes(trimmed) ||
        item.subtitle.toLowerCase().includes(trimmed) ||
        item.category.toLowerCase().includes(trimmed) ||
        (item.badge && item.badge.toLowerCase().includes(trimmed))
      )

  const handleSelect = (item: SearchItem) => {
    onSelectScreen(item.screen, item.zoneId)
    onClose()
    toast.info(`Navigated to ${SCREEN_LABELS[item.screen]}`, {
      description: item.title
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => (filtered.length > 0 ? (prev + 1) % filtered.length : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex])
      }
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-start justify-center pt-16 md:pt-24 px-4 transition-all"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -12 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <Search size={18} className="text-[#0038A8] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type zone, barangay (e.g. Panal, Tagas), module, or algorithm…"
            className="w-full text-sm bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400 font-medium"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery("")
                setSelectedIndex(0)
              }}
              className="text-xs text-slate-400 hover:text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded cursor-pointer"
            >
              Clear
            </button>
          ) : (
            <kbd className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-50 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Database className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No matching records found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try searching &quot;Panal&quot;, &quot;Optimization&quot;, &quot;LSTM&quot;, or &quot;Zone 1&quot;</p>
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group border ${
                  selectedIndex === idx
                    ? "bg-blue-50/90 border-blue-200/80 shadow-2xs"
                    : "border-transparent hover:bg-slate-50"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold transition-colors truncate ${
                      selectedIndex === idx ? "text-[#0038A8]" : "text-slate-800 group-hover:text-[#0038A8]"
                    }`}>
                      {item.title}
                    </span>
                    {item.badge && (
                      <span className="text-[9px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-800 transition-colors flex-shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-600 mt-0.5 truncate">
                    {item.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    {item.category}
                  </span>
                  <ArrowRight size={13} className={`transition-all ${
                    selectedIndex === idx ? "text-[#0038A8] translate-x-0.5" : "text-slate-300 group-hover:text-[#0038A8]"
                  }`} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="font-mono bg-white border px-1 rounded shadow-2xs text-[10px] text-slate-600">↑</kbd> <kbd className="font-mono bg-white border px-1 rounded shadow-2xs text-[10px] text-slate-600">↓</kbd> to navigate</span>
            <span><kbd className="font-mono bg-white border px-1 rounded shadow-2xs text-[10px] text-slate-600">Enter</kbd> to select</span>
            <span><kbd className="font-mono bg-white border px-1 rounded shadow-2xs text-[10px] text-slate-600">Esc</kbd> to close</span>
          </div>
          <span className="font-mono text-slate-500">{filtered.length} entries available</span>
        </div>
      </motion.div>
    </div>
  )
}

// ── TOPBAR ─────────────────────────────────────────────────────────────────
function Topbar({
  current,
  onMenuClick,
  onNavigate,
  onOpenSearch,
  user,
  onOpenProfile
}: {
  current: ScreenId
  onMenuClick: () => void
  onNavigate?: (s: ScreenId) => void
  onOpenSearch?: () => void
  user: UserAccount
  onOpenProfile: () => void
}) {
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
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full relative pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100/80 text-slate-400 hover:text-slate-600 transition-all flex items-center justify-between text-left cursor-pointer group shadow-2xs"
        >
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-600 transition-colors" />
          <span className="truncate">Search zone, barangay, model...</span>
          <kbd className="hidden lg:inline-flex items-center text-[9px] font-mono font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
            Ctrl K
          </kbd>
        </button>
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
        {/* Mobile search button — accessible on phones / narrow screens */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="sm:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Search (Ctrl + K)"
        >
          <Search size={15} />
        </button>
        <button className="relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D32F2F]" />
        </button>

        {/* User Profile & Credentials Trigger */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer group shadow-2xs"
          title={`Signed in as ${user.name} (${user.role}) — Click to view profile`}
        >
          <div className="w-6 h-6 rounded-full bg-[#0038A8] text-white flex items-center justify-center font-mono font-bold text-[10px] shadow-sm">
            {user.avatarInitials}
          </div>
          <div className="text-left hidden lg:block leading-none">
            <p className="text-xs font-bold text-slate-800 group-hover:text-[#0038A8] transition-colors truncate max-w-[120px]">
              {user.name.split(",")[0]}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[120px]">
              {user.role}
            </p>
          </div>
        </button>
      </div>
    </header>
  )
}

// ── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <DashboardProvider>
      <AppContent />
    </DashboardProvider>
  )
}

interface ErrorBoundaryProps {
  children: ReactNode
  screenKey: string
}
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}
class ScreenErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, info: any) {
    console.error("Screen crashed:", error, info)
  }
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.screenKey !== this.props.screenKey && this.state.hasError) {
      this.setState({ hasError: false, error: null })
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl border border-red-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-base font-bold text-slate-800">Screen Render Notice</h2>
          <p className="text-xs text-slate-500 font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 text-left overflow-auto max-h-32">
            {this.state.error?.message || "An issue occurred rendering this view."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-[#0038A8] text-white text-xs font-semibold rounded-lg hover:bg-blue-800 transition-all cursor-pointer"
          >
            Retry View
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function AppContent() {
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    try {
      const saved = localStorage.getItem("aquastat_user_session")
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return MANAGEMENT_ACCOUNTS[1] // Default: Engr. Julian Reyes, Operations Manager
  })

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(localStorage.getItem("aquastat_user_session")))

  const [currentScreen, setCurrentScreen] = useState<ScreenId>("dashboard")
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false)
  const [targetZoneId, setTargetZoneId] = useState<number | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchPaletteOpen(prev => !prev)
      }
      if (e.key === "Escape") {
        setSearchPaletteOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
  }

  const handleConfirmLogout = () => {
    localStorage.removeItem("aquastat_user_session")
    setIsAuthenticated(false)
    setIsLogoutConfirmOpen(false)
    setIsProfileOpen(false)
    toast.info("Signed Out Successfully", {
      description: "Secure executive session terminated."
    })
  }

  if (!isAuthenticated) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }} className="h-screen">
        <Toaster position="bottom-right" richColors />
        <LoginScreen onLogin={handleLogin} />
      </div>
    )
  }

  const handleNavigate = (s: ScreenId, zoneId?: number) => {
    setCurrentScreen(s)
    setMobileNavOpen(false)
    if (zoneId !== undefined) {
      setTargetZoneId(zoneId)
    }
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "dashboard":    return <DashboardScreen onNavigate={handleNavigate} />
      case "descriptive":  return <DescriptiveScreen />
      case "predictive":   return <PredictiveScreen />
      case "shortage":     return <ShortageScreen />
      case "weather":      return <WeatherScreen />
      case "nrw":          return <NRWScreen />
      case "zones":        return <ZonesScreen initialZoneId={targetZoneId} onClearInitialZone={() => setTargetZoneId(null)} />
      case "optimization": return <OptimizationScreen />
      case "alerts":       return <AlertsScreen />
      case "export":       return <ExportScreen />
    }
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

      {/* Global Search & Command Palette Modal */}
      <SearchPaletteModal
        isOpen={searchPaletteOpen}
        onClose={() => setSearchPaletteOpen(false)}
        onSelectScreen={handleNavigate}
      />

      {/* Executive User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={currentUser}
      />

      {/* Sign Out Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirmLogout={handleConfirmLogout}
        userName={currentUser.name}
      />

      {/* Sidebar — drawer on mobile, static on desktop */}
      <div className={`fixed inset-y-0 left-0 z-50 md:relative md:z-auto md:translate-x-0 transition-transform duration-300 ease-in-out ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <Sidebar
          current={currentScreen}
          onNavigate={handleNavigate}
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          onOpenSearch={() => setSearchPaletteOpen(true)}
          user={currentUser}
          onOpenProfile={() => setIsProfileOpen(true)}
          onInitiateLogout={() => setIsLogoutConfirmOpen(true)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          current={currentScreen}
          onMenuClick={() => setMobileNavOpen(true)}
          onNavigate={handleNavigate}
          onOpenSearch={() => setSearchPaletteOpen(true)}
          user={currentUser}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ScreenErrorBoundary screenKey={currentScreen}>
              {renderScreen()}
            </ScreenErrorBoundary>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
