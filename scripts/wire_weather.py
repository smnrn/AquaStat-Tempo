import re

with open('src/app/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Normalize newlines
content = content.replace('\r\n', '\n')

old_hook = """function useWeatherData() {
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
}"""

new_hook = """function useWeatherData() {
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
}"""

if old_hook in content:
    content = content.replace(old_hook, new_hook, 1)
    content = content.replace(
        'const { current, forecast, loading, error, lastRefresh, refresh } = useWeatherData()',
        'const { current, forecast, correlation, loading, error, lastRefresh, refresh } = useWeatherData()',
        1
    )
    content = content.replace(
        '<Scatter key="scatter-temp" name="Historical Demand" data={TEMP_DEMAND} fill="#0038A8" opacity={0.7} />',
        '<Scatter key="scatter-temp" name="Historical Demand" data={correlation?.temperatureScatter && correlation.temperatureScatter.length > 0 ? correlation.temperatureScatter : TEMP_DEMAND} fill="#0038A8" opacity={0.7} />',
        1
    )
    
    old_dual = """data={[
              { month: 'Oct', rainfall: 180, nrw: 27.4 }, { month: 'Nov', rainfall: 220, nrw: 28.1 },
              { month: 'Dec', rainfall: 160, nrw: 27.8 }, { month: 'Jan', rainfall: 40,  nrw: 26.4 },
              { month: 'Feb', rainfall: 20,  nrw: 25.8 }, { month: 'Mar', rainfall: 15,  nrw: 26.2 },
              { month: 'Apr', rainfall: 12,  nrw: 27.0 }, { month: 'May', rainfall: 85,  nrw: 27.6 },
              { month: 'Jun', rainfall: 148, nrw: 28.2 }, { month: 'Jul', rainfall: 195, nrw: 28.8 },
              { month: 'Aug', rainfall: current ? Math.round(current.rainfallToday * 30) || 210 : 210, nrw: 29.1 },
              { month: 'Sep', rainfall: 175, nrw: 28.0 },
            ]}"""

    new_dual = """data={correlation?.rainfallDualAxis && correlation.rainfallDualAxis.length > 0 ? correlation.rainfallDualAxis : [
              { month: 'Oct', rainfall: 180, nrw: 27.4 }, { month: 'Nov', rainfall: 220, nrw: 28.1 },
              { month: 'Dec', rainfall: 160, nrw: 27.8 }, { month: 'Jan', rainfall: 40,  nrw: 26.4 },
              { month: 'Feb', rainfall: 20,  nrw: 25.8 }, { month: 'Mar', rainfall: 15,  nrw: 26.2 },
              { month: 'Apr', rainfall: 12,  nrw: 27.0 }, { month: 'May', rainfall: 85,  nrw: 27.6 },
              { month: 'Jun', rainfall: 148, nrw: 28.2 }, { month: 'Jul', rainfall: 195, nrw: 28.8 },
              { month: 'Aug', rainfall: current ? Math.round(current.rainfallToday * 30) || 210 : 210, nrw: 29.1 },
              { month: 'Sep', rainfall: 175, nrw: 28.0 },
            ]}"""
    content = content.replace(old_dual, new_dual, 1)

    content = content.replace(
        "label={{ value: 'r\u00b2 = 0.72', fill: '#D32F2F', fontSize: 9, position: 'insideTopRight' }}",
        "label={{ value: correlation?.summary?.rSquared ? `r\u00b2 = ${correlation.summary.rSquared}` : 'r\u00b2 = 0.72', fill: '#D32F2F', fontSize: 9, position: 'insideTopRight' }}",
        1
    )
    content = content.replace(
        '<p className="text-[10px] text-slate-400 mt-1">Regression: D = 192T \u2212 1,576 (R\u00b2 = 0.72) \u00b7 Telemetry correlation window: 2017\u20132025</p>',
        '<p className="text-[10px] text-slate-400 mt-1">{correlation?.summary?.regressionEquation ? `${correlation.summary.regressionEquation} (R\u00b2 = ${correlation.summary.rSquared}) \u00b7 Live Supabase dim_weather telemetry` : "Regression: D = 192T \u2212 1,576 (R\u00b2 = 0.72) \u00b7 Telemetry correlation window: 2017\u20132025"}</p>',
        1
    )

    with open('src/app/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: App.tsx wired with live weather-correlation data.")
else:
    print("ERROR: old_hook not found in App.tsx")

