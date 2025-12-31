import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as OTPAuth from 'otpauth';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = textParts.join(':');
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Missing code' },
        { status: 400 }
      );
    }

    // Get user settings with 2FA secret
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('two_factor_secret')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings?.two_factor_secret) {
      return NextResponse.json(
        { error: '2FA not configured' },
        { status: 400 }
      );
    }

    // Decrypt the secret
    const secret = decrypt(settings.two_factor_secret);

    // Verify the code first
    const totp = new OTPAuth.TOTP({
      issuer: 'SELAI Admin Hub',
      label: user.email || '',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token: code, window: 1 });

    if (delta === null) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Disable 2FA
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error disabling 2FA:', updateError);
      return NextResponse.json(
        { error: 'Failed to disable 2FA' },
        { status: 500 }
      );
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'disable_2fa',
      details: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
