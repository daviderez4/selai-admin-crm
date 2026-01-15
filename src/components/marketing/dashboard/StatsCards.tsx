'use client'

import { motion } from 'framer-motion'
import {
  TrendingUp,
  Users,
  Eye,
  MousePointerClick,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { MarketingStats } from '@/stores/marketingStore'

interface StatsCardsProps {
  stats: MarketingStats | null
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
}

interface StatCardData {
  title: string
  value: string | number
  change: number
  icon: React.ReactNode
  gradient: string
  shadowColor: string
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards: StatCardData[] = [
    {
      title: 'קמפיינים פעילים',
      value: stats?.active_campaigns || 0,
      change: 12,
      icon: <Zap className="h-6 w-6 text-white" />,
      gradient: 'from-violet-600 to-purple-600',
      shadowColor: 'shadow-violet-500/30',
    },
    {
      title: 'לידים חדשים',
      value: stats?.total_leads?.toLocaleString() || '0',
      change: 23,
      icon: <Users className="h-6 w-6 text-white" />,
      gradient: 'from-blue-600 to-cyan-600',
      shadowColor: 'shadow-blue-500/30',
    },
    {
      title: 'אחוז המרה',
      value: `${stats?.conversion_rate || 0}%`,
      change: 8,
      icon: <Target className="h-6 w-6 text-white" />,
      gradient: 'from-emerald-600 to-teal-600',
      shadowColor: 'shadow-emerald-500/30',
    },
    {
      title: 'צפיות בדפי נחיתה',
      value: stats?.total_views?.toLocaleString() || '0',
      change: -5,
      icon: <Eye className="h-6 w-6 text-white" />,
      gradient: 'from-orange-600 to-amber-600',
      shadowColor: 'shadow-orange-500/30',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: index * 0.1 }}
        >
          <Card className={`relative overflow-hidden border-0 shadow-xl ${card.shadowColor} bg-white/80 backdrop-blur-sm group hover:scale-[1.02] transition-all duration-300`}>
            {/* Gradient Background Effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.03] group-hover:opacity-[0.06] transition-opacity`} />

            {/* Decorative Circle */}
            <div className={`absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-br ${card.gradient} rounded-full opacity-10 blur-2xl`} />

            <CardContent className="relative p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-500 mb-1">{card.title}</p>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">{card.value}</h3>
                  <div className="flex items-center gap-1">
                    {card.change >= 0 ? (
                      <>
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-600">
                          +{card.change}%
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-500">
                          {card.change}%
                        </span>
                      </>
                    )}
                    <span className="text-xs text-slate-400 mr-1">מהשבוע שעבר</span>
                  </div>
                </div>

                {/* Icon Container */}
                <div className={`relative`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} rounded-xl blur-lg opacity-40`} />
                  <div className={`relative p-3 bg-gradient-to-br ${card.gradient} rounded-xl shadow-lg`}>
                    {card.icon}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${card.gradient} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(Math.abs(card.change) * 3, 100)}%` }}
                  transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
