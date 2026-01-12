import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SELAI InsuranceOS - פלטפורמת AI לניהול סוכנויות ביטוח';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #f1f5f9 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Background Grid Pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.3,
            backgroundImage: `
              linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Content Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
          }}
        >
          {/* Logo Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 24px',
              background: 'white',
              borderRadius: '50px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>S</span>
            </div>
            <span style={{ color: '#64748b', fontSize: '18px' }}>AI INSURANCE PLATFORM</span>
            <div
              style={{
                width: '12px',
                height: '12px',
                background: '#22c55e',
                borderRadius: '50%',
              }}
            />
          </div>

          {/* Main Title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontSize: '96px',
                fontWeight: 'bold',
                color: '#1e293b',
                letterSpacing: '-2px',
              }}
            >
              SELAI
            </span>
            <span
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                backgroundClip: 'text',
                color: 'transparent',
                letterSpacing: '-1px',
              }}
            >
              InsuranceOS
            </span>
          </div>

          {/* Hebrew Description */}
          <p
            style={{
              fontSize: '28px',
              color: '#64748b',
              textAlign: 'center',
              maxWidth: '800px',
              lineHeight: 1.4,
            }}
          >
            פלטפורמת ה-AI המתקדמת לניהול סוכנויות ביטוח
          </p>

          {/* Feature Pills */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '16px',
            }}
          >
            {['Real-time Data', 'AI Agents', 'Automation'].map((feature) => (
              <div
                key={feature}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  borderRadius: '24px',
                  border: '1px solid #e2e8f0',
                  fontSize: '18px',
                  color: '#475569',
                }}
              >
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '24px', color: '#94a3b8' }}>selai.app</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
