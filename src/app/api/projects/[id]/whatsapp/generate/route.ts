import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * WhatsApp Message Generator API
 * Generates wa.me links with pre-filled messages from templates
 */

interface GenerateRequest {
  templateId?: string;
  customMessage?: string;
  records: Array<{
    phone: string;
    name?: string;
    placeholders: Record<string, string>;
  }>;
}

interface GeneratedMessage {
  phone: string;
  formattedPhone: string;
  name: string;
  message: string;
  waLink: string;
}

// POST - Generate WhatsApp messages for multiple records
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check project access
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body: GenerateRequest = await request.json();
    const { templateId, customMessage, records } = body;

    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: 'No records provided' },
        { status: 400 }
      );
    }

    // Get template if provided
    let templateText = customMessage || '';

    if (templateId) {
      const { data: template } = await supabase
        .from('message_templates')
        .select('template_text')
        .eq('id', templateId)
        .single();

      if (template) {
        templateText = template.template_text;

        // Update usage count
        await supabase
          .from('message_templates')
          .update({
            usage_count: supabase.rpc('increment', { row_id: templateId }),
            last_used_at: new Date().toISOString(),
          })
          .eq('id', templateId);
      }
    }

    if (!templateText) {
      return NextResponse.json(
        { error: 'No template or custom message provided' },
        { status: 400 }
      );
    }

    // Generate messages for each record
    const generatedMessages: GeneratedMessage[] = [];
    const errors: Array<{ phone: string; error: string }> = [];

    for (const record of records) {
      try {
        // Format phone number
        const formattedPhone = formatPhoneNumber(record.phone);

        if (!formattedPhone) {
          errors.push({ phone: record.phone, error: 'Invalid phone number' });
          continue;
        }

        // Replace placeholders in template
        let message = templateText;
        for (const [key, value] of Object.entries(record.placeholders)) {
          message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
        }

        // Clean up any unreplaced placeholders
        message = message.replace(/\{[^}]+\}/g, '');

        // Generate wa.me link
        const encodedMessage = encodeURIComponent(message.trim());
        const waLink = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

        generatedMessages.push({
          phone: record.phone,
          formattedPhone,
          name: record.name || record.placeholders['שם_לקוח'] || record.placeholders['לקוח'] || '',
          message: message.trim(),
          waLink,
        });

      } catch (err) {
        errors.push({ phone: record.phone, error: 'Failed to generate message' });
      }
    }

    // Log the communication (optional - can be batched for performance)
    if (generatedMessages.length > 0) {
      // Log in batches to avoid too many DB calls
      const logEntries = generatedMessages.slice(0, 100).map(msg => ({
        project_id: projectId,
        channel: 'whatsapp',
        template_id: templateId || null,
        recipient_phone: msg.formattedPhone,
        recipient_name: msg.name,
        message_content: msg.message,
        status: 'sent',
        sent_by: user.id,
      }));

      await supabase
        .from('communication_logs')
        .insert(logEntries)
        .select();
    }

    return NextResponse.json({
      messages: generatedMessages,
      count: generatedMessages.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('WhatsApp generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate messages' },
      { status: 500 }
    );
  }
}

/**
 * Format phone number to international format (972XXXXXXXXX)
 * Handles Israeli phone formats
 */
function formatPhoneNumber(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  if (!digits) return null;

  // Handle Israeli formats
  if (digits.startsWith('972')) {
    // Already international format
    return digits;
  }

  if (digits.startsWith('0')) {
    // Israeli local format (05X, 07X, etc.)
    digits = '972' + digits.slice(1);
  } else if (digits.length === 9 && (digits.startsWith('5') || digits.startsWith('7'))) {
    // Missing leading zero
    digits = '972' + digits;
  }

  // Validate length (Israeli mobile: 972 + 9 digits = 12)
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

// GET - Get a single wa.me link for quick actions
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const templateId = searchParams.get('templateId');
    const message = searchParams.get('message');

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const formattedPhone = formatPhoneNumber(phone);

    if (!formattedPhone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    let messageText = message || '';

    // If template ID provided, fetch and use it
    if (templateId && !message) {
      const { id: projectId } = await params;
      const supabase = await createClient();

      const { data: template } = await supabase
        .from('message_templates')
        .select('template_text')
        .eq('id', templateId)
        .single();

      if (template) {
        messageText = template.template_text;
      }
    }

    const encodedMessage = messageText ? `?text=${encodeURIComponent(messageText)}` : '';
    const waLink = `https://wa.me/${formattedPhone}${encodedMessage}`;

    return NextResponse.json({
      phone: formattedPhone,
      waLink,
      message: messageText,
    });

  } catch (error) {
    console.error('WhatsApp GET error:', error);
    return NextResponse.json(
      { error: 'Failed to generate link' },
      { status: 500 }
    );
  }
}
