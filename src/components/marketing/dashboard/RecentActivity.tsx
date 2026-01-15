'use client'

import { motion } from 'framer-motion'
import {
  User,
  FileText,
  Zap,
  Eye,
  CheckCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Activity {
  id: string
  type: 'lead' | 'campaign' | 'page' | 'conversion'
  title: string
  description: string
  time: string
  source?: string
}

// Mock recent activity
const recentActivity: Activity[] = [
  {
    id: '1',
    type: 'lead',
    title: 'ליד חדש מפייסבוק',
    description: 'דוד כהן - ביטוח רכב',
    time: 'לפני 5 דקות',
    source: 'facebook',
  },
  {
    id: '2',
    type: 'conversion',
    title: 'המרה חדשה!',
    description: 'שרה לוי - ביטוח דירה',
    time: 'לפני 12 דקות',
  },
  {
    id: '3',
    type: 'page',
    title: 'דף נחיתה פורסם',
    description: 'קמפיין ביטוח חיים Q1',
    time: 'לפני 34 דקות',
  },
  {
    id: '4',
    type: 'lead',
    title: 'ליד חדש מאינסטגרם',
    description: 'משה דוד - פנסיה',
    time: 'לפני שעה',
    source: 'instagram',
  },
  {
    id: '5',
    type: 'campaign',
    title: 'קמפיין הופעל',
    description: 'ביטוח עסקי לעסקים קטנים',
    time: 'לפני שעתיים',
  },
  {
    id: '6',
    type: 'lead',
    title: 'ליד חדש מוואטסאפ',
    description: 'רחל אברהם - ביטוח בריאות',
    time: 'לפני 3 שעות',
    source: 'whatsapp',
  },
]

const activityIcons: Record<Activity['type'], React.ReactNode> = {
  lead: <User className="h-4 w-4" />,
  campaign: <Zap className="h-4 w-4" />,
  page: <FileText className="h-4 w-4" />,
  conversion: <CheckCircle className="h-4 w-4" />,
}

const activityColors: Record<Activity['type'], string> = {
  lead: 'bg-blue-100 text-blue-600',
  campaign: 'bg-purple-100 text-purple-600',
  page: 'bg-orange-100 text-orange-600',
  conversion: 'bg-green-100 text-green-600',
}

const sourceColors: Record<string, string> = {
  facebook: 'bg-blue-500',
  instagram: 'bg-gradient-to-r from-pink-500 to-purple-500',
  whatsapp: 'bg-green-500',
  tiktok: 'bg-slate-800',
}

export function RecentActivity() {
  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-slate-600/5" />
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-600" />
            פעילות אחרונה
          </CardTitle>
          <Link href="/marketing/leads">
            <Button variant="ghost" size="sm" className="gap-1 text-slate-600">
              צפה בכל הפעילות
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="space-y-1">
          {recentActivity.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
            >
              {/* Icon */}
              <div className={`p-2.5 rounded-xl ${activityColors[activity.type]} transition-transform group-hover:scale-110`}>
                {activityIcons[activity.type]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {activity.title}
                  </p>
                  {activity.source && (
                    <div className={`w-2 h-2 rounded-full ${sourceColors[activity.source]}`} />
                  )}
                </div>
                <p className="text-sm text-slate-500 truncate">{activity.description}</p>
              </div>

              {/* Time */}
              <div className="text-xs text-slate-400 whitespace-nowrap">
                {activity.time}
              </div>

              {/* Hover Arrow */}
              <ArrowUpRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
