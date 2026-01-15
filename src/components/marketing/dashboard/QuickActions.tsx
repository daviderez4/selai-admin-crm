'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Plus,
  FileText,
  Image,
  Share2,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface QuickAction {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  gradient: string
  shadowColor: string
}

const quickActions: QuickAction[] = [
  {
    title: 'קמפיין חדש',
    description: 'צור קמפיין לרשתות חברתיות',
    icon: <Plus className="h-5 w-5 text-white" />,
    href: '/marketing/create',
    gradient: 'from-purple-600 to-blue-600',
    shadowColor: 'shadow-purple-500/20',
  },
  {
    title: 'דף נחיתה',
    description: 'בנה דף נחיתה מתבנית',
    icon: <FileText className="h-5 w-5 text-white" />,
    href: '/marketing/landing-pages',
    gradient: 'from-orange-500 to-pink-500',
    shadowColor: 'shadow-orange-500/20',
  },
  {
    title: 'ספריית מדיה',
    description: 'העלה תמונות וסרטונים',
    icon: <Image className="h-5 w-5 text-white" />,
    href: '/marketing/assets',
    gradient: 'from-emerald-500 to-teal-500',
    shadowColor: 'shadow-emerald-500/20',
  },
  {
    title: 'שתף לינק',
    description: 'צור לינק לשיתוף מהיר',
    icon: <Share2 className="h-5 w-5 text-white" />,
    href: '/marketing/campaigns',
    gradient: 'from-cyan-500 to-blue-500',
    shadowColor: 'shadow-cyan-500/20',
  },
]

export function QuickActions() {
  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm h-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          פעולות מהירות
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-3">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <Link href={action.href}>
              <div className={`group relative p-4 rounded-xl bg-white border border-slate-100 hover:border-slate-200 ${action.shadowColor} shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden`}>
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />

                <div className="relative flex items-center gap-4">
                  {/* Icon */}
                  <div className="relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity`} />
                    <div className={`relative p-2.5 bg-gradient-to-br ${action.gradient} rounded-xl`}>
                      {action.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-slate-900 group-hover:text-slate-800">
                      {action.title}
                    </h4>
                    <p className="text-xs text-slate-500">{action.description}</p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  )
}
