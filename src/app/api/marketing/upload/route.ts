import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

// POST /api/marketing/upload - Upload a file (image or video)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime']

    const isImage = validImageTypes.includes(file.type)
    const isVideo = validVideoTypes.includes(file.type)

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Validate file size
    const maxImageSize = 10 * 1024 * 1024 // 10MB
    const maxVideoSize = 100 * 1024 * 1024 // 100MB

    if (isImage && file.size > maxImageSize) {
      return NextResponse.json({ error: 'Image file too large. Max 10MB' }, { status: 400 })
    }

    if (isVideo && file.size > maxVideoSize) {
      return NextResponse.json({ error: 'Video file too large. Max 100MB' }, { status: 400 })
    }

    // Generate unique filename
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const folder = isImage ? 'images' : 'videos'
    const filename = `marketing/${folder}/${uuidv4()}.${extension}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('marketing-assets')
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '31536000', // Cache for 1 year
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)

      // If bucket doesn't exist, try to create public URL using a fallback
      if (error.message.includes('Bucket not found') || error.message.includes('does not exist')) {
        // For now, return error - bucket needs to be created in Supabase dashboard
        return NextResponse.json(
          { error: 'Storage bucket not configured. Please create "marketing-assets" bucket in Supabase.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('marketing-assets')
      .getPublicUrl(filename)

    return NextResponse.json({
      url: publicUrl,
      filename: data.path,
      type: isImage ? 'image' : 'video',
    })
  } catch (error) {
    console.error('Error in POST /api/marketing/upload:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
