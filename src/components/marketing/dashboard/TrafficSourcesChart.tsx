'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Facebook, Instagram, MessageCircle, Music2 } from 'lucide-react'

interface TrafficSourcesChartProps {
  data: Record<string, number>
}

const PLATFORM_COLORS: Record<string, { color: string; gradient: string }> = {
  facebook: { color: '#1877F2', gradient: 'from-blue-500 to-blue-600' },
  instagram: { color: '#E4405F', gradient: 'from-pink-500 to-rose-500' },
  whatsapp: { color: '#25D366', gradient: 'from-green-500 to-emerald-500' },
  tiktok: { color: '#000000', gradient: 'from-slate-700 to-slate-900' },
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  tiktok: <Music2 className="h-4 w-4" />,
}

const PLATFORM_NAMES: Record<string, string> = {
  facebook: 'פייסבוק',
  instagram: 'אינסטגרם',
  whatsapp: 'וואטסאפ',
  tiktok: 'טיקטוק',
}

export function TrafficSourcesChart({ data }: TrafficSourcesChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
    color: PLATFORM_COLORS[name]?.color || '#94a3b8',
  }))

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      const percentage = ((item.value / total) * 100).toFixed(1)
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-xl p-3">
          <p className="text-sm font-medium text-slate-900 mb-1">
            {PLATFORM_NAMES[item.name] || item.name}
          </p>
          <p className="text-lg font-bold" style={{ color: item.color }}>
            {item.value.toLocaleString()} ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="none"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="space-y-2 mt-2">
        {chartData.map((item) => {
          const percentage = ((item.value / total) * 100).toFixed(0)
          return (
            <div
              key={item.name}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span
                  className="text-sm text-slate-600"
                  style={{ color: item.color }}
                >
                  {PLATFORM_ICONS[item.name]}
                </span>
                <span className="text-sm text-slate-700">
                  {PLATFORM_NAMES[item.name] || item.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">
                  {item.value.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">({percentage}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
