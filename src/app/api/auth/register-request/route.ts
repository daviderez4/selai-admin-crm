/**
 * @feature AUTH-REG-001
 * @module Authentication
 * @description New user registration request - creates pending request for admin approval
 * @related AUTH-REG-004, AUTH-REG-005, HIER-AGT-002
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createSelaiClient } from '@/lib/supabase/server';

// Simple encryption for temporary password storage (until admin approval)
// In production, use proper encryption with environment-based keys
function encryptPassword(password: string): string {
  const key = process.env.PASSWORD_ENCRYPTION_KEY || 'selai-temp-key-2024';
  let encrypted = '';
  for (let i = 0; i < password.length; i++) {
    encrypted += String.fromCharCode(
      password.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return Buffer.from(encrypted).toString('base64');
}

export function decryptPassword(encrypted: string): string {
  const key = process.env.PASSWORD_ENCRYPTION_KEY || 'selai-temp-key-2024';
  const decoded = Buffer.from(encrypted, 'base64').toString();
  let decrypted = '';
  for (let i = 0; i < decoded.length; i++) {
    decrypted += String.fromCharCode(
      decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return decrypted;
}

export async function POST(request: NextRequest) {
  try {
    // Use admin client for registration (no auth required)
    const supabase = createAdminClient();

    const body = await request.json();
    const {
      full_name,
      phone,
      national_id,
      email,
      password,
      user_type,
      supervisor_id,
    } = body;

    // Validation
    if (!full_name || !phone || !national_id || !email || !password) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({
        error: 'Invalid email format'
      }, { status: 400 });
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({
        error: 'Password must be at least 6 characters'
      }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists in registration_requests (pending)
    const { data: existingRequest } = await supabase
      .from('registration_requests')
      .select('id, status')
      .eq('email', normalizedEmail)
      .in('status', ['pending', 'needs_review'])
      .maybeSingle();

    if (existingRequest) {
      return NextResponse.json({
        error: 'Registration request already pending for this email'
      }, { status: 400 });
    }

    // Encrypt password for storage (will be decrypted when admin approves to create auth user)
    const encryptedPassword = encryptPassword(password);

    // Step 1: Try to find matching agent in external_agents (from SELAI database)
    let matchedExternalId = null;
    let matchScore = 0;
    let matchDetails: Record<string, any> = {};

    try {
      // Clean and normalize ID number (remove leading zeros for comparison)
      const cleanId = national_id.replace(/\D/g, '').replace(/^0+/, '');
      const normalizedPhone = phone.replace(/[-\s]/g, '');
      const phoneLastDigits = normalizedPhone.slice(-9);

      // Search in external_agents from SELAI database
      const selaiClient = createSelaiClient();
      const { data: matchingAgents } = await selaiClient
        .from('external_agents')
        .select('id, full_name, email, mobile_phone, id_number')
        .eq('is_active_in_sela', true)
        .or(`id_number.eq.${cleanId},id_number.eq.0${cleanId},mobile_phone.ilike.%${phoneLastDigits}`);

      if (matchingAgents && matchingAgents.length > 0) {
        // Find best match
        let bestMatch = null;
        let bestScore = 0;

        for (const agent of matchingAgents) {
          let score = 0;
          const details: Record<string, boolean> = {};

          // ID match (highest priority)
          const agentId = agent.id_number?.replace(/^0+/, '');
          if (agentId === cleanId) {
            score += 50;
            details.id_match = true;
          }

          // Phone match
          const agentPhone = agent.mobile_phone?.replace(/[-\s]/g, '');
          if (agentPhone?.slice(-9) === phoneLastDigits) {
            score += 30;
            details.phone_match = true;
          }

          // Email match
          if (agent.email?.toLowerCase() === email.toLowerCase()) {
            score += 20;
            details.email_match = true;
          }

          if (score > bestScore) {
            bestScore = score;
            bestMatch = agent;
            matchDetails = details;
          }
        }

        if (bestMatch && bestScore >= 50) {
          matchedExternalId = bestMatch.id;
          matchScore = bestScore;
        }
      }
    } catch (matchErr) {
      console.error('Error finding agent match:', matchErr);
      // Continue without match - admin can manually link
    }

    // Determine initial status based on match
    const initialStatus = matchedExternalId && matchScore >= 80
      ? 'pending'
      : 'needs_review';

    // Step 3: Create registration request
    const { data: regRequest, error: regError } = await supabase
      .from('registration_requests')
      .insert({
        email: normalizedEmail,
        full_name,
        phone,
        id_number: national_id,
        requested_role: user_type || 'agent',
        supervisor_id: supervisor_id || null,
        matched_external_id: matchedExternalId,
        match_score: matchScore,
        match_details: matchDetails,
        status: initialStatus,
        encrypted_password: encryptedPassword,
      })
      .select()
      .single();

    if (regError) {
      console.error('Registration request error:', regError);
      return NextResponse.json({
        error: 'Failed to create registration request'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Registration request submitted successfully',
      request_id: regRequest.id,
      status: initialStatus,
      matched: !!matchedExternalId
    });

  } catch (error) {
    console.error('Registration request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
