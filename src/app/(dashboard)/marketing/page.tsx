'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Plus,
  TrendingUp,
  Users,
  Target,
  Zap,
  ArrowUpRight,
  Eye,
  MousePointerClick,
  FileText,
  BarChart3,
  Sparkles,
  Rocket,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatsCards } from '@/components/marketing/dashboard/StatsCards'
import { LeadsChart } from '@/components/marketing/dashboard/LeadsChart'
import { TrafficSourcesChart } from '@/components/marketing/dashboard/TrafficSourcesChart'
import { CampaignPerformanceChart } from '@/components/marketing/dashboard/CampaignPerformanceChart'
import { RecentActivity } from '@/components/marketing/dashboard/RecentActivity'
import { QuickActions } from '@/components/marketing/dashboard/QuickActions'
import { useMarketingStore } from '@/stores/marketingStore'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
}

export default function MarketingDashboardPage() {
  const { campaigns, landingPages, leads, stats, setStats, isLoading } = useMarketingStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load mock stats for demo
    setStats({
      total_campaigns: 12,
      active_campaigns: 5,
      total_leads: 2847,
      new_leads_today: 47,
      total_views: 45230,
      conversion_rate: 18.3,
      leads_by_source: {
        facebook: 1280,
        instagram: 854,
        whatsapp: 427,
        tiktok: 286,
      },
      leads_trend: [
        { date: '2024-01-01', count: 120 },
        { date: '2024-01-02', count: 145 },
        { date: '2024-01-03', count: 132 },
        { date: '2024-01-04', count: 178 },
        { date: '2024-01-05', count: 165 },
        { date: '2024-01-06', count: 198 },
        { date: '2024-01-07', count: 210 },
      ],
    })
  }, [setStats])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30" dir="rtl">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-40 -right-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <motion.div
        className="relative z-10 p-6 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-50" />
                <div className="relative p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl">
                  <Rocket className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent">
                  Marketing Studio
                </h1>
                <p className="text-slate-500">נהל קמפיינים, דפי נחיתה ולידים במקום אחד</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/marketing/analytics">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                אנליטיקס
              </Button>
            </Link>
            <Link href="/marketing/create">
              <Button className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25">
                <Plus className="h-4 w-4" />
                קמפיין חדש
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={itemVariants}>
          <StatsCards stats={stats} />
        </motion.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leads Trend Chart */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      מגמת לידים
                    </CardTitle>
                    <CardDescription>לידים חדשים ב-7 הימים האחרונים</CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <ArrowUpRight className="h-3 w-3 ml-1" />
                    +23% מהשבוע שעבר
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="relative h-[300px]">
                <LeadsChart data={stats?.leads_trend || []} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Traffic Sources */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm h-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  מקורות תנועה
                </CardTitle>
                <CardDescription>התפלגות לידים לפי פלטפורמה</CardDescription>
              </CardHeader>
              <CardContent className="relative h-[260px]">
                <TrafficSourcesChart data={stats?.leads_by_source || {}} />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaign Performance */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-yellow-500/5" />
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-600" />
                      ביצועי קמפיינים
                    </CardTitle>
                    <CardDescription>השוואת לידים והמרות לפי קמפיין</CardDescription>
                  </div>
                  <Link href="/marketing/campaigns">
                    <Button variant="ghost" size="sm" className="gap-1 text-slate-600">
                      צפה בכל הקמפיינים
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="relative h-[300px]">
                <CampaignPerformanceChart />
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <QuickActions />
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <RecentActivity />
        </motion.div>
      </motion.div>

      {/* Custom CSS for animations */}
      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
