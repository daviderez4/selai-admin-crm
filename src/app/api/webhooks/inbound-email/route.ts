import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Inbound Email Webhook for Resend
 *
 * Receives parsed email data from Resend Inbound and processes attachments
 * for automatic import into the database.
 *
 * Flow:
 * 1. Receive email webhook from Resend
 * 2. Validate sender against whitelist (if configured)
 * 3. Extract Excel attachment
 * 4. Store attachment in Supabase Storage
 * 5. Trigger import process (append mode only)
 * 6. Log the inbound email
 * 7. Send confirmation email back
 */

// Resend webhook payload types
interface ResendInboundEmail {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded
    content_type: string;
  }>;
  headers?: Record<string, string>;
  message_id?: string;
  date?: string;
}

// Helper to create admin Supabase client
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createSupabaseClient(supabaseUrl, serviceKey);
}

// POST - Receive inbound email from Resend
export async function POST(request: Request) {
  try {
    // Verify webhook signature (in production)
    const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-resend-signature');
      // TODO: Implement signature verification
      // For now, we'll proceed without verification in development
    }

    const email: ResendInboundEmail = await request.json();
    const supabase = createAdminClient();

    console.log('Received inbound email:', {
      from: email.from,
      to: email.to,
      subject: email.subject,
      attachments: email.attachments?.map(a => a.filename),
    });

    // Extract recipient email to find the scheduled import config
    const recipientEmail = email.to?.[0];
    if (!recipientEmail) {
      return NextResponse.json({ error: 'No recipient email' }, { status: 400 });
    }

    // Look up scheduled import configuration
    const { data: scheduledImport, error: lookupError } = await supabase
      .from('scheduled_imports')
      .select('*, projects(id, name, supabase_url, supabase_service_key)')
      .eq('email_address', recipientEmail)
      .eq('is_active', true)
      .single();

    if (lookupError || !scheduledImport) {
      console.log('No matching scheduled import found for:', recipientEmail);
      // Log the email anyway for debugging
      await supabase.from('inbound_emails').insert({
        message_id: email.message_id || `unknown-${Date.now()}`,
        from_email: email.from,
        subject: email.subject || '(no subject)',
        received_at: email.date || new Date().toISOString(),
        status: 'rejected',
        error_message: 'No matching import configuration',
      });
      return NextResponse.json({ error: 'No matching import configuration' }, { status: 404 });
    }

    // Validate sender (if whitelist is configured)
    if (scheduledImport.sender_whitelist && scheduledImport.sender_whitelist.length > 0) {
      const senderEmail = email.from.match(/<([^>]+)>/)?.[1] || email.from;
      const isWhitelisted = scheduledImport.sender_whitelist.some(
        (allowed: string) => senderEmail.toLowerCase().includes(allowed.toLowerCase())
      );

      if (!isWhitelisted) {
        console.log('Sender not whitelisted:', senderEmail);
        await supabase.from('inbound_emails').insert({
          scheduled_import_id: scheduledImport.id,
          message_id: email.message_id || `unknown-${Date.now()}`,
          from_email: email.from,
          subject: email.subject || '(no subject)',
          received_at: email.date || new Date().toISOString(),
          status: 'rejected',
          error_message: 'Sender not in whitelist',
        });
        return NextResponse.json({ error: 'Sender not authorized' }, { status: 403 });
      }
    }

    // Validate subject pattern (if configured)
    if (scheduledImport.subject_pattern) {
      const pattern = scheduledImport.subject_pattern.replace(/\*/g, '.*');
      const regex = new RegExp(pattern, 'i');
      if (!regex.test(email.subject || '')) {
        console.log('Subject does not match pattern:', email.subject);
        await supabase.from('inbound_emails').insert({
          scheduled_import_id: scheduledImport.id,
          message_id: email.message_id || `unknown-${Date.now()}`,
          from_email: email.from,
          subject: email.subject || '(no subject)',
          received_at: email.date || new Date().toISOString(),
          status: 'rejected',
          error_message: 'Subject does not match pattern',
        });
        return NextResponse.json({ error: 'Subject does not match pattern' }, { status: 400 });
      }
    }

    // Find Excel attachment
    const excelAttachment = email.attachments?.find(a =>
      a.content_type.includes('spreadsheet') ||
      a.content_type.includes('excel') ||
      a.filename.endsWith('.xlsx') ||
      a.filename.endsWith('.xls')
    );

    if (!excelAttachment) {
      console.log('No Excel attachment found');
      await supabase.from('inbound_emails').insert({
        scheduled_import_id: scheduledImport.id,
        message_id: email.message_id || `unknown-${Date.now()}`,
        from_email: email.from,
        subject: email.subject || '(no subject)',
        received_at: email.date || new Date().toISOString(),
        status: 'error',
        error_message: 'No Excel attachment found',
      });
      return NextResponse.json({ error: 'No Excel attachment found' }, { status: 400 });
    }

    // Decode and store attachment
    const fileBuffer = Buffer.from(excelAttachment.content, 'base64');
    const fileName = `inbound/${scheduledImport.projects.id}/${Date.now()}_${excelAttachment.filename}`;

    const { error: uploadError } = await supabase.storage
      .from('imports')
      .upload(fileName, fileBuffer, {
        contentType: excelAttachment.content_type,
      });

    if (uploadError) {
      console.error('Failed to upload attachment:', uploadError);
      await supabase.from('inbound_emails').insert({
        scheduled_import_id: scheduledImport.id,
        message_id: email.message_id || `unknown-${Date.now()}`,
        from_email: email.from,
        subject: email.subject || '(no subject)',
        received_at: email.date || new Date().toISOString(),
        attachment_name: excelAttachment.filename,
        status: 'error',
        error_message: `Upload failed: ${uploadError.message}`,
      });
      return NextResponse.json({ error: 'Failed to store attachment' }, { status: 500 });
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage.from('imports').getPublicUrl(fileName);

    // Log the inbound email as pending
    const { data: emailLog, error: logError } = await supabase
      .from('inbound_emails')
      .insert({
        scheduled_import_id: scheduledImport.id,
        message_id: email.message_id || `unknown-${Date.now()}`,
        from_email: email.from,
        subject: email.subject || '(no subject)',
        received_at: email.date || new Date().toISOString(),
        attachment_name: excelAttachment.filename,
        attachment_url: urlData?.publicUrl,
        status: 'pending',
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to log email:', logError);
    }

    // Trigger import process
    // Note: In production, this would call the import API or use a queue
    try {
      const importResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects/${scheduledImport.projects.id}/excel/import-master`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Webhook': 'true', // Special header for internal calls
          },
          body: JSON.stringify({
            fileUrl: urlData?.publicUrl,
            fileName: excelAttachment.filename,
            importMode: 'append', // Always append for automated imports
            source: 'inbound_email',
            emailLogId: emailLog?.id,
          }),
        }
      );

      if (importResponse.ok) {
        // Update email log status
        await supabase
          .from('inbound_emails')
          .update({ status: 'processed' })
          .eq('id', emailLog?.id);

        // Update last import timestamp
        await supabase
          .from('scheduled_imports')
          .update({
            last_import_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', scheduledImport.id);

        // TODO: Send confirmation email via Resend
        console.log('Import successful for email:', email.message_id);

      } else {
        const errorResult = await importResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorResult.error || 'Import failed');
      }

    } catch (importError) {
      console.error('Import failed:', importError);
      const errorMessage = importError instanceof Error ? importError.message : 'Import failed';

      // Update email log with error
      if (emailLog?.id) {
        await supabase
          .from('inbound_emails')
          .update({
            status: 'error',
            error_message: errorMessage,
          })
          .eq('id', emailLog.id);
      }

      // Update scheduled import with error
      await supabase
        .from('scheduled_imports')
        .update({ last_error: errorMessage })
        .eq('id', scheduledImport.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Email processed',
      emailId: emailLog?.id,
    });

  } catch (error) {
    console.error('Inbound email webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process inbound email' },
      { status: 500 }
    );
  }
}

// GET - Health check / info endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Inbound Email Webhook',
    description: 'Receives emails from Resend Inbound for automatic report import',
    supportedAttachments: ['.xlsx', '.xls'],
  });
}
