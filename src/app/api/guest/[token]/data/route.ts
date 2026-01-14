/**
 * Guest Data Access API (Public)
 * Returns comprehensive project data for authenticated guests
 * Handles both local and external storage modes with raw_data JSON parsing
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

// Helper to parse numbers from various formats
const parseNumber = (val: unknown): number | null => {
  if (val === null || val === undefined || val === '') return null
  const cleaned = String(val).replace(/[₪,$€,\s]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

// Detect column type from values
function detectColumnType(values: unknown[]): 'text' | 'number' | 'date' | 'boolean' {
  const nonNullValues = values.filter(v => v !== null && v !== undefined)
  if (nonNullValues.length === 0) return 'text'

  const sample = nonNullValues[0]

  if (typeof sample === 'boolean') return 'boolean'
  if (typeof sample === 'number') return 'number'
  if (typeof sample === 'string') {
    // Check if it looks like a date
    if (/^\d{4}-\d{2}-\d{2}/.test(sample)) return 'date'
    // Check if it's a number string
    if (!isNaN(Number(sample)) && sample.trim() !== '') return 'number'
  }
  return 'text'
}

// Process a record - handle raw_data JSON if present
function processRecord(row: Record<string, unknown>, index: number): Record<string, unknown> {
  // Check if row has raw_data that needs parsing
  if (row.raw_data) {
    let parsed: unknown = null
    try {
      if (typeof row.raw_data === 'string') {
        parsed = JSON.parse(row.raw_data)
      } else {
        parsed = row.raw_data
      }
    } catch {
      // Keep as-is if parse fails
    }

    // If raw_data is an object, spread its fields into the row
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const { raw_data, ...rest } = row
      return { id: row.id || index, ...rest, ...(parsed as Record<string, unknown>) }
    }
  }

  return { id: row.id || index, ...row }
}

// GET /api/guest/[token]/data - Get comprehensive project data for guest
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

    // Update access stats (only on first page load)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    if (page === 1) {
      await supabase
        .from('project_guests')
        .update({
          last_accessed_at: new Date().toISOString(),
          access_count: (guest.access_count || 0) + 1,
        })
        .eq('id', guest.id)
    }

    // Get project details - include credentials for external projects
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, description, table_name, storage_mode, data_type, icon, color, supabase_url, supabase_service_key, is_configured')
      .eq('id', guest.project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Determine table name with fallback
    const tableName = project.table_name || 'master_data'

    // Get query params
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '100'), 500)
    const sortColumn = searchParams.get('sortColumn')
    const sortDirection = searchParams.get('sortDirection') || 'desc'

    // Determine which client to use based on storage mode
    const isLocalProject = !project.supabase_url || project.storage_mode === 'local'

    let dataClient
    if (isLocalProject) {
      // Use main Supabase client with service role for local projects
      dataClient = supabase
    } else {
      // Create external project client
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

    // Get total count first
    const { count: totalCount, error: countError } = await dataClient
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Count error:', countError)
      return NextResponse.json({
        error: `Table '${tableName}' not found or inaccessible`,
        details: countError.message
      }, { status: 500 })
    }

    // Known views have different sort columns
    const VIEW_SORT_KEYS: Record<string, string> = {
      nifraim: 'processing_month',
      gemel: 'processing_month',
    }
    const defaultSortKey = VIEW_SORT_KEYS[tableName] || 'created_at'

    // Fetch data in chunks for stats (up to 5000 for performance)
    const CHUNK_SIZE = 1000
    const allRawData: Record<string, unknown>[] = []
    let offset = 0
    const maxForStats = 5000

    while (allRawData.length < maxForStats && offset < (totalCount || 0)) {
      // Try with default sort, fall back to no sort if column doesn't exist
      let chunkQuery = dataClient
        .from(tableName)
        .select('*')
        .range(offset, offset + CHUNK_SIZE - 1)

      // Only add order if not a problematic table
      if (VIEW_SORT_KEYS[tableName]) {
        chunkQuery = chunkQuery.order(defaultSortKey, { ascending: false })
      }

      const { data: chunk, error: chunkError } = await chunkQuery

      if (chunkError) {
        console.error('Chunk error:', chunkError)
        // Try without ordering
        const { data: fallbackChunk } = await dataClient
          .from(tableName)
          .select('*')
          .range(offset, offset + CHUNK_SIZE - 1)
        if (fallbackChunk && fallbackChunk.length > 0) {
          allRawData.push(...fallbackChunk)
        }
        break
      }
      if (!chunk || chunk.length === 0) break
      allRawData.push(...chunk)
      offset += CHUNK_SIZE
    }

    // Build paginated query for display
    let query = dataClient
      .from(tableName)
      .select('*', { count: 'exact' })

    // Apply sorting - use user's choice or default for the table type
    if (sortColumn) {
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' })
    } else if (VIEW_SORT_KEYS[tableName]) {
      query = query.order(defaultSortKey, { ascending: false })
    }
    // If no sort key specified and not a known view, skip ordering to avoid errors

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: rawRecords, error: dataError, count } = await query

    if (dataError) {
      console.error('Error fetching project data:', dataError)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    // Process records - handle raw_data JSON column if it exists
    const records = (rawRecords || []).map((row, index) => processRecord(row, index))

    // Process allData similarly for stats
    const allData = allRawData.map((row, index) => processRecord(row, index))

    // Analyze columns from processed data
    const sampleData = allData.length > 0 ? allData : records
    const columns: { name: string; type: string; uniqueValues?: string[] }[] = []
    const numericColumns: string[] = []
    const textColumns: string[] = []
    const stats: Record<string, unknown> = {}

    if (sampleData.length > 0) {
      // Get all keys from sample data, excluding internal fields
      const keys = Object.keys(sampleData[0]).filter(k =>
        !k.startsWith('_') &&
        k !== 'raw_data' &&
        k !== 'import_batch_id'
      )

      for (const key of keys) {
        const values = sampleData.map(row => row[key])
        const colType = detectColumnType(values)

        // Get unique values for text columns (for filters)
        let uniqueValues: string[] | undefined
        if (colType === 'text') {
          const uniqueSet = new Set(values.filter(v => v != null).map(String))
          if (uniqueSet.size <= 50) {
            uniqueValues = Array.from(uniqueSet).sort()
          }
          textColumns.push(key)
        }

        if (colType === 'number') {
          numericColumns.push(key)
          // Calculate stats for numeric columns
          const numericValues = values
            .filter(v => v != null && !isNaN(Number(v)))
            .map(v => parseNumber(v) || 0)
          if (numericValues.length > 0) {
            stats[`${key}_sum`] = numericValues.reduce((a, b) => a + b, 0)
            stats[`${key}_avg`] = (stats[`${key}_sum`] as number) / numericValues.length
            stats[`${key}_min`] = Math.min(...numericValues)
            stats[`${key}_max`] = Math.max(...numericValues)
          }
        }

        columns.push({ name: key, type: colType, uniqueValues })
      }
    }

    // Calculate summary stats for common financial fields
    let totalCommission = 0
    let totalPremium = 0
    let totalAccumulation = 0

    sampleData.forEach(row => {
      // Commission - look for עמלה or comission/commission
      const commissionKeys = Object.keys(row).filter(k => /עמלה|commission|comission/i.test(k))
      commissionKeys.forEach(k => {
        totalCommission += parseNumber(row[k]) || 0
      })

      // Premium - look for פרמיה or premium
      const premiumKeys = Object.keys(row).filter(k => /פרמיה|premium/i.test(k))
      premiumKeys.forEach(k => {
        totalPremium += parseNumber(row[k]) || 0
      })

      // Accumulation - look for צבירה or accumulation
      const accumulationKeys = Object.keys(row).filter(k => /צבירה|accumulation/i.test(k))
      accumulationKeys.forEach(k => {
        totalAccumulation += parseNumber(row[k]) || 0
      })
    })

    // Add summary totals to stats
    if (totalCommission > 0) stats.totalCommission = totalCommission
    if (totalPremium > 0) stats.totalPremium = totalPremium
    if (totalAccumulation > 0) stats.totalAccumulation = totalAccumulation
    stats.total = sampleData.length

    // Generate summary stats
    const summaryStats = {
      totalRecords: totalCount || 0,
      displayedRecords: records.length,
      numericColumns: numericColumns.length,
      textColumns: textColumns.length,
    }

    console.log(`Guest data: ${records.length} records, ${columns.length} columns for project ${project.name}`)

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        dataType: project.data_type,
        icon: project.icon,
        color: project.color,
        tableName: tableName,
      },
      data: records,
      columns,
      numericColumns,
      textColumns,
      stats,
      summaryStats,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    })
  } catch (error) {
    console.error('Guest data access error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
