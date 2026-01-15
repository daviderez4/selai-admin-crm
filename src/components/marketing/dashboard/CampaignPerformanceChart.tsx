'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Mock data for campaigns
const campaignData = [
  {
    name: 'ביטוח רכב',
    leads: 847,
    conversions: 156,
    views: 12450,
  },
  {
    name: 'ביטוח דירה',
    leads: 234,
    conversions: 67,
    views: 5680,
  },
  {
    name: 'ביטוח חיים',
    leads: 512,
    conversions: 89,
    views: 8920,
  },
  {
    name: 'ביטוח עסקי',
    leads: 156,
    conversions: 34,
    views: 3450,
  },
  {
    name: 'פנסיה',
    leads: 298,
    conversions: 52,
    views: 6780,
  },
]

export function CampaignPerformanceChart() {
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-xl p-4" dir="rtl">
          <p className="text-sm font-semibold text-slate-900 mb-2 border-b pb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-slate-900">
                  {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  // Custom legend
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex items-center justify-center gap-6 mt-4" dir="rtl">
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-slate-600">{item.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={campaignData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        barGap={8}
      >
        <defs>
          <linearGradient id="leadsBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="conversionsBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="100%" stopColor="#059669" stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          dx={-10}
          tickFormatter={(value) => value.toLocaleString()}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
        <Legend content={<CustomLegend />} />
        <Bar
          dataKey="leads"
          name="לידים"
          fill="url(#leadsBarGradient)"
          radius={[4, 4, 0, 0]}
          animationDuration={1000}
        />
        <Bar
          dataKey="conversions"
          name="המרות"
          fill="url(#conversionsBarGradient)"
          radius={[4, 4, 0, 0]}
          animationDuration={1000}
          animationBegin={300}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
