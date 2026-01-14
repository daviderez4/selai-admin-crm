/**
 * Guest View Dashboard API (Public)
 * Fetches complete dashboard data for authenticated guests
 * Supports: gemel, nifraim, master_data (sales)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createProjectClient } from '@/lib/utils/projectDatabase'

// Use service role to bypass RLS for guest access
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceKey)
}

interface AgentStats {
  name: string
  count: number
  commission: number
  premium: number
  accumulation: number
}

interface ProviderStats {
  name: string
  count: number
  commission: number
  premium: number
  accumulation: number
}

interface BranchStats {
  name: string
  count: number
  commission: number
}

interface MonthlyData {
  month: string
  commission: number
  premium: number
  accumulation: number
  count: number
}

// Sales (master_data) interfaces
interface SalesAgentStats {
  name: string
  agentNumber: string | null
  supervisor: string | null
  count: number
  totalAccumulation: number
  totalPremium: number
}

interface SupervisorStats {
  name: string
  agents: string[]
  count: number
  totalAccumulation: number
  totalPremium: number
}

interface ProductStats {
  name: string
  count: number
  totalAccumulation: number
  percentage: number
}

// Excel column indices for master_data (sales)
const COLUMN_INDICES = {
  מספר_תהליך: 1,
  סוג_תהליך: 4,
  סטטוס: 5,
  מטפל: 9,
  לקוח: 25,
  מזהה_לקוח: 28,
  סלולרי_לקוח: 34,
  סוג_מוצר_קיים: 35,
  יצרן_קיים: 36,
  מספר_חשבון_פוליסה_קיים: 44,
  סהכ_צבירה_צפויה_מניוד: 51,
  סוג_מוצר_חדש: 56,
  יצרן_חדש: 57,
  מספר_חשבון_פוליסה_חדש: 65,
  הפקדה_חד_פעמית_צפויה: 103,
  תאריך_פתיחת_תהליך: 108,
  תאריך_העברת_מסמכים_ליצרן: 111,
  פרמיה_צפויה: 119,
  מספר_סוכן_רשום: 141,
  מפקח: 145,
}

// GET /api/guest/[token]/view-dashboard - Get dashboard data for guest
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length !== 64) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Find and validate guest
    const { data: guest, error: guestError } = await supabase
      .from('project_guests')
      .select('id, project_id, is_active, expires_at, access_count')
      .eq('access_token', token)
      .single()

    if (guestError || !guest) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401 })
    }

    if (!guest.is_active) {
      return NextResponse.json({ error: 'Access has been revoked' }, { status: 403 })
    }

    if (new Date(guest.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Access has expired' }, { status: 410 })
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, description, table_name, storage_mode, data_type, icon, color, supabase_url, supabase_service_key, is_configured')
      .eq('id', guest.project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const tableName = project.table_name || 'gemel'

    // Determine dashboard type based on table name
    const isNifraim = tableName === 'nifraim'
    const isGemel = tableName === 'gemel'
    const isSales = tableName === 'master_data'

    if (!isNifraim && !isGemel && !isSales) {
      return NextResponse.json({
        error: 'This dashboard supports nifraim, gemel, or master_data (sales) tables only',
        tableName
      }, { status: 400 })
    }

    // Determine which client to use based on storage mode
    const isLocalProject = !project.supabase_url || project.storage_mode === 'local'

    let dataClient
    if (isLocalProject) {
      dataClient = supabase
    } else {
      const clientResult = createProjectClient({
        supabase_url: project.supabase_url,
        supabase_service_key: project.supabase_service_key,
        table_name: tableName,
        is_configured: project.is_configured,
      })

      if (!clientResult.success) {
        console.error('Failed to create project client:', clientResult.error)
        return NextResponse.json({
          error: 'Database not configured',
          details: clientResult.error
        }, { status: 400 })
      }
      dataClient = clientResult.client!
    }

    // Route to appropriate handler based on table type
    if (isSales) {
      return handleSalesDashboard(request, dataClient, tableName, project)
    } else {
      return handleGemelNifraimDashboard(request, dataClient, tableName, project, isNifraim, isGemel)
    }
  } catch (error) {
    console.error('Guest view dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}

// Handler for gemel/nifraim dashboards
async function handleGemelNifraimDashboard(
  request: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataClient: any,
  tableName: string,
  project: Record<string, unknown>,
  isNifraim: boolean,
  isGemel: boolean
) {
  // Parse query params for filters
  const url = new URL(request.url)
  const provider = url.searchParams.get('provider')
  const agentName = url.searchParams.get('agent')
  const branch = url.searchParams.get('branch')
  const month = url.searchParams.get('month')
  const year = url.searchParams.get('year')

  // First, get the total count with filters
  let countQuery = dataClient
    .from(tableName)
    .select('*', { count: 'exact', head: true })

  if (provider) countQuery = countQuery.eq('provider', provider)
  if (agentName) countQuery = countQuery.ilike('agent_name', `%${agentName}%`)
  if (branch) countQuery = countQuery.eq('branch', branch)
  if (month) {
    countQuery = countQuery.like('processing_month', `${month}%`)
  } else if (year) {
    countQuery = countQuery.like('processing_month', `${year}%`)
  }

  const { count: totalCount } = await countQuery
  const total = totalCount || 0

  // Fetch ALL data in chunks to get accurate totals
  const CHUNK_SIZE = 1000
  const allData: Record<string, unknown>[] = []

  for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
    let query = dataClient
      .from(tableName)
      .select('*')

    if (provider) query = query.eq('provider', provider)
    if (agentName) query = query.ilike('agent_name', `%${agentName}%`)
    if (branch) query = query.eq('branch', branch)
    if (month) {
      query = query.like('processing_month', `${month}%`)
    } else if (year) {
      query = query.like('processing_month', `${year}%`)
    }

    query = query.order('processing_month', { ascending: false }).range(offset, offset + CHUNK_SIZE - 1)

    const { data: chunkData, error: chunkError } = await query

    if (chunkError) {
      console.error('Guest view dashboard chunk error:', chunkError)
      return NextResponse.json({ error: chunkError.message }, { status: 500 })
    }

    if (chunkData) {
      allData.push(...chunkData)
    }
  }

  console.log(`Guest view dashboard: Fetched ${allData.length} records for project ${project.name}`)

  const data = allData

  // Calculate statistics
  const agentMap = new Map<string, AgentStats>()
  const providerMap = new Map<string, ProviderStats>()
  const branchMap = new Map<string, BranchStats>()
  const monthMap = new Map<string, MonthlyData>()

  let totalCommission = 0
  let totalPremium = 0
  let totalAccumulation = 0

  data.forEach((row: Record<string, unknown>) => {
    const commission = Number(row.comission) || 0
    const premium = Number(row.premium) || 0
    const accumulation = Number(row.accumulation_balance) || 0
    const providerName = String(row.provider || 'לא ידוע')
    const branchName = String(row.branch || 'לא ידוע')
    const agentNameVal = String(row.agent_name || 'לא ידוע')
    const monthVal = String(row.processing_month || '').substring(0, 7) || 'unknown'

    // Totals
    totalCommission += commission
    totalPremium += premium
    totalAccumulation += accumulation

    // By Agent
    if (!agentMap.has(agentNameVal)) {
      agentMap.set(agentNameVal, {
        name: agentNameVal,
        count: 0,
        commission: 0,
        premium: 0,
        accumulation: 0,
      })
    }
    const agentStats = agentMap.get(agentNameVal)!
    agentStats.count++
    agentStats.commission += commission
    agentStats.premium += premium
    agentStats.accumulation += accumulation

    // By Provider
    if (!providerMap.has(providerName)) {
      providerMap.set(providerName, {
        name: providerName,
        count: 0,
        commission: 0,
        premium: 0,
        accumulation: 0,
      })
    }
    const providerStats = providerMap.get(providerName)!
    providerStats.count++
    providerStats.commission += commission
    providerStats.premium += premium
    providerStats.accumulation += accumulation

    // By Branch
    if (!branchMap.has(branchName)) {
      branchMap.set(branchName, {
        name: branchName,
        count: 0,
        commission: 0,
      })
    }
    const branchStats = branchMap.get(branchName)!
    branchStats.count++
    branchStats.commission += commission

    // By Month
    if (!monthMap.has(monthVal)) {
      monthMap.set(monthVal, {
        month: monthVal,
        commission: 0,
        premium: 0,
        accumulation: 0,
        count: 0,
      })
    }
    const monthStats = monthMap.get(monthVal)!
    monthStats.count++
    monthStats.commission += commission
    monthStats.premium += premium
    monthStats.accumulation += accumulation
  })

  // Sort and limit results
  const topAgents = Array.from(agentMap.values())
    .filter(a => a.name !== 'לא ידוע')
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 30)

  const providers = Array.from(providerMap.values())
    .filter(p => p.name !== 'לא ידוע')
    .sort((a, b) => b.commission - a.commission)

  // Filter branches to show only the main 4 branches
  const mainBranches = ['בריאות', 'פנסיה', 'גמל', 'חיים']
  const branches = Array.from(branchMap.values())
    .filter(b => b.name !== 'לא ידוע' && mainBranches.includes(b.name))
    .sort((a, b) => b.commission - a.commission)

  const monthlyTrend = Array.from(monthMap.values())
    .filter(m => m.month !== 'unknown')
    .sort((a, b) => a.month.localeCompare(b.month))

  // Get unique values for filters
  const uniqueProviders = [...new Set(data.map((r: Record<string, unknown>) => String(r.provider || '')))].filter(Boolean)
  const uniqueBranches = [...new Set(data.map((r: Record<string, unknown>) => String(r.branch || '')))]
    .filter(b => b && mainBranches.includes(b))
  const uniqueAgents = [...new Set(data.map((r: Record<string, unknown>) => String(r.agent_name || '')))].filter(Boolean)
  const uniqueMonths = [...new Set(data.map((r: Record<string, unknown>) => {
    const date = String(r.processing_month || '')
    return date.substring(0, 7) // Get YYYY-MM format
  }))].filter(Boolean).sort((a, b) => b.localeCompare(a)) // Sort descending (newest first)

  return NextResponse.json({
    // Project info
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      icon: project.icon,
      color: project.color,
    },

    // Meta info
    tableName,
    dashboardType: isNifraim ? 'nifraim' : 'gemel',

    // Stats
    stats: {
      totalRecords: total,
      totalCommission,
      totalPremium: isNifraim ? totalPremium : 0,
      totalAccumulation: isGemel ? totalAccumulation : 0,
      uniqueAgents: agentMap.size,
      uniqueProviders: providerMap.size,
      uniqueBranches: branchMap.size,
    },

    // Breakdown data
    topAgents,
    providers,
    branches,
    monthlyTrend,

    // Filter options
    filterOptions: {
      providers: uniqueProviders,
      branches: uniqueBranches,
      agents: uniqueAgents.slice(0, 100),
      months: uniqueMonths,
    },

    // Recent records for table display
    recentRecords: data.slice(0, 100).map((row: Record<string, unknown>) => ({
      provider: row.provider,
      processing_month: row.processing_month,
      branch: row.branch,
      agent_name: row.agent_name,
      commission: row.comission,
      premium: isNifraim ? row.premium : null,
      accumulation: isGemel ? row.accumulation_balance : null,
    })),

    // All data for data table (paginated)
    allData: data,
  })
}

// Handler for sales (master_data) dashboard
async function handleSalesDashboard(
  request: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataClient: any,
  tableName: string,
  project: Record<string, unknown>
) {
  // Parse query params
  const url = new URL(request.url)
  const agentFilter = url.searchParams.get('agent')
  const supervisorFilter = url.searchParams.get('supervisor')
  const productFilter = url.searchParams.get('product')
  const importMonth = url.searchParams.get('month')
  const importYear = url.searchParams.get('year')

  // Helper functions
  const parseNumber = (val: unknown): number => {
    if (val === null || val === undefined || val === '') return 0
    if (typeof val === 'number') return val
    const cleaned = String(val).replace(/[₪,$€,\s]/g, '').trim()
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }

  const getFieldValue = (rawData: unknown, arrayIndex: number, objectKey: string): unknown => {
    if (Array.isArray(rawData)) {
      return rawData[arrayIndex]
    } else if (typeof rawData === 'object' && rawData !== null) {
      return (rawData as Record<string, unknown>)[objectKey]
    }
    return null
  }

  // Fetch data in batches
  const BATCH_SIZE = 1000
  let allData: Record<string, unknown>[] = []
  let offset = 0
  let hasMore = true

  // Get total count
  const { count: recordCount } = await dataClient
    .from(tableName)
    .select('*', { count: 'exact', head: true })

  const totalCount = recordCount || 0
  const maxRecords = Math.min(totalCount, 10000)

  while (offset < maxRecords && hasMore) {
    let query = dataClient
      .from(tableName)
      .select('*')
      .range(offset, offset + BATCH_SIZE - 1)

    if (importMonth) query = query.eq('import_month', parseInt(importMonth))
    if (importYear) query = query.eq('import_year', parseInt(importYear))

    const { data: batchData, error: queryError } = await query

    if (queryError) {
      console.error('Guest sales dashboard query error:', queryError)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    if (batchData && batchData.length > 0) {
      allData = allData.concat(batchData)
      offset += BATCH_SIZE
      hasMore = batchData.length === BATCH_SIZE
    } else {
      hasMore = false
    }
  }

  const data = allData

  // Calculate aggregates
  const stats = {
    totalRecords: totalCount || data.length,
    totalAccumulation: 0,
    totalPremium: 0,
    uniqueAgents: new Set<string>(),
    uniqueSupervisors: new Set<string>(),
  }

  const agentMap = new Map<string, SalesAgentStats>()
  const supervisorMap = new Map<string, SupervisorStats>()
  const productMap = new Map<string, ProductStats>()
  const statusMap = new Map<string, number>()

  // Process each row
  data.forEach(row => {
    const rawData = row.raw_data

    // Extract field values
    const agent = String(getFieldValue(rawData, COLUMN_INDICES.מטפל, 'מטפל') || 'לא ידוע')
    const agentNumber = getFieldValue(rawData, COLUMN_INDICES.מספר_סוכן_רשום, 'מספר סוכן רשום') as string | null
    const supervisor = String(getFieldValue(rawData, COLUMN_INDICES.מפקח, 'מפקח') || 'לא ידוע')
    const product = String(getFieldValue(rawData, COLUMN_INDICES.סוג_מוצר_חדש, 'סוג מוצר חדש') || 'לא ידוע')
    const status = String(getFieldValue(rawData, COLUMN_INDICES.סטטוס, 'סטטוס') || 'לא ידוע')

    // Get accumulation values
    const totalExpected = parseNumber(row.total_expected_accumulation)
    const accumulation = parseNumber(getFieldValue(rawData, COLUMN_INDICES.סהכ_צבירה_צפויה_מניוד, 'סה"כ צבירה צפויה מניוד'))
    const oneTimeDeposit = parseNumber(getFieldValue(rawData, COLUMN_INDICES.הפקדה_חד_פעמית_צפויה, 'הפקדה חד פעמית צפויה'))
    const premium = parseNumber(getFieldValue(rawData, COLUMN_INDICES.פרמיה_צפויה, 'פרמיה צפויה'))

    const totalAccumulationValue = totalExpected || (accumulation + oneTimeDeposit)

    // Apply filters
    if (agentFilter && !agent.includes(agentFilter)) return
    if (supervisorFilter && !supervisor.includes(supervisorFilter)) return
    if (productFilter && !product.includes(productFilter)) return

    // Update totals
    stats.totalAccumulation += totalAccumulationValue
    stats.totalPremium += premium
    stats.uniqueAgents.add(agent)
    stats.uniqueSupervisors.add(supervisor)

    // By Agent
    if (!agentMap.has(agent)) {
      agentMap.set(agent, {
        name: agent,
        agentNumber,
        supervisor,
        count: 0,
        totalAccumulation: 0,
        totalPremium: 0,
      })
    }
    const agentStats = agentMap.get(agent)!
    agentStats.count++
    agentStats.totalAccumulation += totalAccumulationValue
    agentStats.totalPremium += premium

    // By Supervisor
    if (supervisor && supervisor !== 'לא ידוע') {
      if (!supervisorMap.has(supervisor)) {
        supervisorMap.set(supervisor, {
          name: supervisor,
          agents: [],
          count: 0,
          totalAccumulation: 0,
          totalPremium: 0,
        })
      }
      const supStats = supervisorMap.get(supervisor)!
      supStats.count++
      supStats.totalAccumulation += totalAccumulationValue
      supStats.totalPremium += premium
      if (!supStats.agents.includes(agent)) {
        supStats.agents.push(agent)
      }
    }

    // By Product
    if (product && product !== 'לא ידוע') {
      if (!productMap.has(product)) {
        productMap.set(product, {
          name: product,
          count: 0,
          totalAccumulation: 0,
          percentage: 0,
        })
      }
      const prodStats = productMap.get(product)!
      prodStats.count++
      prodStats.totalAccumulation += totalAccumulationValue
    }

    // By Status
    statusMap.set(status, (statusMap.get(status) || 0) + 1)
  })

  // Calculate product percentages
  const totalProductAccumulation = Array.from(productMap.values()).reduce((sum, p) => sum + p.totalAccumulation, 0)
  productMap.forEach(p => {
    p.percentage = totalProductAccumulation > 0 ? (p.totalAccumulation / totalProductAccumulation) * 100 : 0
  })

  // Sort results
  const topAgents = Array.from(agentMap.values())
    .filter(a => a.name !== 'לא ידוע')
    .sort((a, b) => b.totalAccumulation - a.totalAccumulation)
    .slice(0, 30)

  const supervisors = Array.from(supervisorMap.values())
    .sort((a, b) => b.totalAccumulation - a.totalAccumulation)

  const products = Array.from(productMap.values())
    .sort((a, b) => b.totalAccumulation - a.totalAccumulation)
    .slice(0, 10)

  const statuses = Array.from(statusMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // Get unique values for filters
  const uniqueAgents = [...stats.uniqueAgents].filter(a => a !== 'לא ידוע')
  const uniqueSupervisors = [...stats.uniqueSupervisors].filter(s => s !== 'לא ידוע')
  const uniqueProducts = [...new Set(data.map(r => {
    const rawData = r.raw_data
    return String(getFieldValue(rawData, COLUMN_INDICES.סוג_מוצר_חדש, 'סוג מוצר חדש') || '')
  }))].filter(Boolean)

  // Transform data for table view - expand raw_data into columns
  const transformedData = data.map(row => {
    const rawData = row.raw_data
    return {
      id: row.id,
      מספר_תהליך: getFieldValue(rawData, COLUMN_INDICES.מספר_תהליך, 'מספר תהליך'),
      סוג_תהליך: getFieldValue(rawData, COLUMN_INDICES.סוג_תהליך, 'סוג תהליך'),
      סטטוס: getFieldValue(rawData, COLUMN_INDICES.סטטוס, 'סטטוס'),
      מטפל: getFieldValue(rawData, COLUMN_INDICES.מטפל, 'מטפל'),
      מפקח: getFieldValue(rawData, COLUMN_INDICES.מפקח, 'מפקח'),
      לקוח: getFieldValue(rawData, COLUMN_INDICES.לקוח, 'לקוח'),
      סוג_מוצר_חדש: getFieldValue(rawData, COLUMN_INDICES.סוג_מוצר_חדש, 'סוג מוצר חדש'),
      יצרן_חדש: getFieldValue(rawData, COLUMN_INDICES.יצרן_חדש, 'יצרן חדש'),
      צבירה_צפויה: parseNumber(getFieldValue(rawData, COLUMN_INDICES.סהכ_צבירה_צפויה_מניוד, 'סה"כ צבירה צפויה מניוד')),
      הפקדה_חד_פעמית: parseNumber(getFieldValue(rawData, COLUMN_INDICES.הפקדה_חד_פעמית_צפויה, 'הפקדה חד פעמית צפויה')),
      פרמיה_צפויה: parseNumber(getFieldValue(rawData, COLUMN_INDICES.פרמיה_צפויה, 'פרמיה צפויה')),
      תאריך_פתיחה: getFieldValue(rawData, COLUMN_INDICES.תאריך_פתיחת_תהליך, 'תאריך פתיחת תהליך'),
      import_month: row.import_month,
      import_year: row.import_year,
    }
  })

  return NextResponse.json({
    // Project info
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      icon: project.icon,
      color: project.color,
    },

    // Meta info
    tableName,
    dashboardType: 'sales',

    // Stats
    stats: {
      totalRecords: stats.totalRecords,
      totalAccumulation: stats.totalAccumulation,
      totalPremium: stats.totalPremium,
      totalCommission: 0, // Sales doesn't have commission
      uniqueAgents: stats.uniqueAgents.size,
      uniqueSupervisors: stats.uniqueSupervisors.size,
      uniqueProviders: 0,
      uniqueBranches: 0,
    },

    // Breakdown data
    topAgents,
    supervisors,
    products,
    statuses,
    providers: [], // Not applicable for sales
    branches: [], // Not applicable for sales
    monthlyTrend: [], // TODO: Add if needed

    // Filter options
    filterOptions: {
      agents: uniqueAgents.slice(0, 100),
      supervisors: uniqueSupervisors,
      products: uniqueProducts,
      providers: [],
      branches: [],
      months: [],
    },

    // Recent records for table display
    recentRecords: transformedData.slice(0, 100),

    // All data for data table
    allData: transformedData,
  })
}
