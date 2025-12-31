import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as OTPAuth from 'otpauth';
import crypto from 'crypto';

// Encryption key should be in environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
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

    const { secret, code } = await request.json();

    if (!secret || !code) {
      return NextResponse.json(
        { error: 'Missing secret or code' },
        { status: 400 }
      );
    }

    // Verify the code
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

    // Encrypt and save the secret
    const encryptedSecret = encrypt(secret);

    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        two_factor_enabled: true,
        two_factor_secret: encryptedSecret,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error saving 2FA secret:', updateError);
      return NextResponse.json(
        { error: 'Failed to enable 2FA' },
        { status: 500 }
      );
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'enable_2fa',
      details: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
