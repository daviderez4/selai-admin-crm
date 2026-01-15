'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Users,
  Eye,
  Target,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Facebook,
  Instagram,
  MessageCircle,
  Music2,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Funnel,
  FunnelChart,
  LabelList,
} from 'recharts'

// Mock data
const dailyData = [
  { date: '01/01', leads: 45, views: 1200, conversions: 8 },
  { date: '02/01', leads: 52, views: 1350, conversions: 10 },
  { date: '03/01', leads: 38, views: 980, conversions: 6 },
  { date: '04/01', leads: 65, views: 1580, conversions: 12 },
  { date: '05/01', leads: 48, views: 1240, conversions: 9 },
  { date: '06/01', leads: 72, views: 1820, conversions: 14 },
  { date: '07/01', leads: 85, views: 2100, conversions: 18 },
]

const platformData = [
  { name: 'פייסבוק', value: 1280, color: '#1877F2' },
  { name: 'אינסטגרם', value: 854, color: '#E4405F' },
  { name: 'וואטסאפ', value: 427, color: '#25D366' },
  { name: 'טיקטוק', value: 286, color: '#000000' },
]

const funnelData = [
  { name: 'צפיות', value: 45230, fill: '#3b82f6' },
  { name: 'קליקים', value: 12450, fill: '#8b5cf6' },
  { name: 'לידים', value: 2847, fill: '#f97316' },
  { name: 'המרות', value: 521, fill: '#10b981' },
]

const campaignPerformance = [
  { name: 'ביטוח רכב', leads: 847, conversions: 156, rate: 18.4 },
  { name: 'ביטוח דירה', leads: 234, conversions: 67, rate: 28.6 },
  { name: 'ביטוח חיים', leads: 512, conversions: 89, rate: 17.4 },
  { name: 'ביטוח עסקי', leads: 156, conversions: 34, rate: 21.8 },
  { name: 'פנסיה', leads: 298, conversions: 52, rate: 17.4 },
]

const hourlyData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i.toString().padStart(2, '0')}:00`,
  leads: Math.floor(Math.random() * 50) + 10,
}))

export default function AnalyticsDashboardPage() {
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedCampaign, setSelectedCampaign] = useState('all')

  const stats = [
    {
      title: 'סה"כ לידים',
      value: '2,847',
      change: 23,
      icon: <Users className="h-5 w-5" />,
      gradient: 'from-blue-600 to-cyan-600',
    },
    {
      title: 'צפיות בדפים',
      value: '45,230',
      change: 15,
      icon: <Eye className="h-5 w-5" />,
      gradient: 'from-purple-600 to-pink-600',
    },
    {
      title: 'אחוז המרה',
      value: '18.3%',
      change: 8,
      icon: <Target className="h-5 w-5" />,
      gradient: 'from-emerald-600 to-teal-600',
    },
    {
      title: 'לידים היום',
      value: '47',
      change: -5,
      icon: <TrendingUp className="h-5 w-5" />,
      gradient: 'from-orange-600 to-red-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-indigo-600" />
            אנליטיקס
          </h1>
          <p className="text-slate-500">מעקב אחר ביצועי הקמפיינים ודפי הנחיתה</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] bg-white">
              <Calendar className="h-4 w-4 ml-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 ימים</SelectItem>
              <SelectItem value="30d">30 יום</SelectItem>
              <SelectItem value="90d">90 יום</SelectItem>
              <SelectItem value="year">שנה</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2 bg-white">
            <Download className="h-4 w-4" />
            יצוא
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {stats.map((stat, index) => (
          <Card key={stat.title} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.change >= 0 ? (
                      <>
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm text-emerald-600">+{stat.change}%</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-500">{stat.change}%</span>
                      </>
                    )}
                    <span className="text-xs text-slate-400 mr-1">מהתקופה הקודמת</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} text-white`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Leads Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    מגמת לידים וצפיות
                  </CardTitle>
                  <CardDescription>ביצועים יומיים לאורך התקופה</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      name="לידים"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#leadsGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="conversions"
                      name="המרות"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#viewsGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Traffic Sources Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-600" />
                התפלגות לפי פלטפורמה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {platformData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-slate-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Funnel Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-600" />
                משפך המרות
              </CardTitle>
              <CardDescription>מסע הלקוח מצפייה להמרה</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnelData.map((item, index) => {
                  const percentage = index === 0 ? 100 : (item.value / funnelData[0].value * 100).toFixed(1)
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{item.name}</span>
                        <span className="text-sm text-slate-500">
                          {item.value.toLocaleString()} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                          className="h-full rounded-lg"
                          style={{ backgroundColor: item.fill }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Campaign Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                ביצועי קמפיינים
              </CardTitle>
              <CardDescription>השוואת לידים והמרות</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaignPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip />
                    <Bar dataKey="leads" name="לידים" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="conversions" name="המרות" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Hourly Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-600" />
              פעילות לפי שעה
            </CardTitle>
            <CardDescription>לידים חדשים לאורך היום</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} interval={2} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
