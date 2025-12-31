'use client';

import { useState, useCallback } from 'react';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { useAuthStore } from '../stores/authStore';

interface Use2FAReturn {
  isSetup: boolean;
  qrCodeUrl: string | null;
  secret: string | null;
  isLoading: boolean;
  error: string | null;
  generateSecret: () => Promise<void>;
  verifyCode: (code: string) => boolean;
  enable2FA: (code: string) => Promise<boolean>;
  disable2FA: (code: string) => Promise<boolean>;
}

export function use2FA(): Use2FAReturn {
  const { user, settings, updateSettings } = useAuthStore();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSecret = useCallback(async () => {
    if (!user?.email) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate new TOTP secret
      const totp = new OTPAuth.TOTP({
        issuer: 'SELAI Admin Hub',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromHex(
          Array.from(crypto.getRandomValues(new Uint8Array(20)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        ),
      });

      const secretBase32 = totp.secret.base32;
      setSecret(secretBase32);

      // Generate QR code
      const otpauthUrl = totp.toString();
      const qrUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      setQrCodeUrl(qrUrl);
    } catch (err) {
      console.error('Error generating 2FA secret:', err);
      setError('Failed to generate 2FA secret');
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  const verifyCode = useCallback((code: string): boolean => {
    if (!secret) return false;

    try {
      const totp = new OTPAuth.TOTP({
        issuer: 'SELAI Admin Hub',
        label: user?.email || '',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      return delta !== null;
    } catch {
      return false;
    }
  }, [secret, user?.email]);

  const enable2FA = useCallback(async (code: string): Promise<boolean> => {
    if (!secret || !verifyCode(code)) {
      setError('Invalid verification code');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Save encrypted secret to server
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to enable 2FA');
      }

      await updateSettings({ two_factor_enabled: true });

      // Clear local secret after enabling
      setSecret(null);
      setQrCodeUrl(null);

      return true;
    } catch (err) {
      console.error('Error enabling 2FA:', err);
      setError(err instanceof Error ? err.message : 'Failed to enable 2FA');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [secret, verifyCode, updateSettings]);

  const disable2FA = useCallback(async (code: string): Promise<boolean> => {
    if (!settings?.two_factor_enabled) {
      setError('2FA is not enabled');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      await updateSettings({ two_factor_enabled: false });
      return true;
    } catch (err) {
      console.error('Error disabling 2FA:', err);
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [settings?.two_factor_enabled, updateSettings]);

  return {
    isSetup: settings?.two_factor_enabled || false,
    qrCodeUrl,
    secret,
    isLoading,
    error,
    generateSecret,
    verifyCode,
    enable2FA,
    disable2FA,
  };
}
