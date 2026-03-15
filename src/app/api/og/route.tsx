import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year       = searchParams.get('year')  || '2026';
  const theme      = searchParams.get('theme') || 'Bringing In The Harvest';
  const scripture  = searchParams.get('scripture') || 'Matt. 9:35–38 · John 4:35–37 · Psalm 126:6';

  return new ImageResponse(
    (
      <div
        style={{
          width:           '1200px',
          height:          '630px',
          display:         'flex',
          flexDirection:   'column',
          background:      '#102a43',
          fontFamily:      'serif',
          position:        'relative',
          overflow:        'hidden',
        }}
      >
        {/* Top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10px', background: '#4a1772', display: 'flex' }} />

        {/* Right accent bar */}
        <div style={{ position: 'absolute', top: '30px', right: '36px', width: '7px', height: '500px', borderRadius: '4px', background: '#d57d2a', opacity: 0.6, display: 'flex' }} />

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '60px 80px', flex: 1 }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px', marginBottom: '40px' }}>
            {/* Church icon circle */}
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%',
              background: 'rgba(74,23,114,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '48px',
            }}>
              ⛪
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', lineHeight: 1 }}>
                Grace Life Center
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: '#d57d2a', borderRadius: '6px',
                  padding: '4px 14px',
                  fontSize: '22px', fontWeight: 'bold', color: '#ffffff',
                  fontFamily: 'sans-serif',
                  display: 'flex',
                }}>
                  {year}
                </div>
                <span style={{ fontSize: '22px', color: '#829ab1', fontFamily: 'sans-serif' }}>
                  Sunday Schedule
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '40px', display: 'flex' }} />

          {/* Theme */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '48px' }}>
            <span style={{ fontSize: '44px', fontWeight: 'bold', color: '#ffffff', lineHeight: 1.1 }}>
              {theme}
            </span>
            <span style={{ fontSize: '22px', color: '#829ab1', fontFamily: 'sans-serif' }}>
              {scripture}
            </span>
          </div>

          {/* Stats cards */}
          <div style={{ display: 'flex', gap: '20px' }}>
            {[
              { value: '52', label: 'Sundays' },
              { value: '12', label: 'Monthly themes' },
              { value: 'Jan – Dec', label: 'Full year', highlight: true },
            ].map(({ value, label, highlight }) => (
              <div key={label} style={{
                background:   'rgba(255,255,255,0.07)',
                borderRadius: '12px',
                padding:      '18px 32px',
                display:      'flex',
                flexDirection: 'column',
                alignItems:   'center',
                gap:          '6px',
                minWidth:     '200px',
              }}>
                <span style={{
                  fontSize:   highlight ? '32px' : '42px',
                  fontWeight: 'bold',
                  color:      highlight ? '#d57d2a' : '#ffffff',
                  fontFamily: 'sans-serif',
                  lineHeight: 1,
                }}>
                  {value}
                </span>
                <span style={{ fontSize: '18px', color: '#829ab1', fontFamily: 'sans-serif' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          background:  'rgba(0,0,0,0.3)',
          padding:     '16px 80px',
          display:     'flex',
          alignItems:  'center',
        }}>
          <span style={{ fontSize: '18px', color: '#829ab1', fontFamily: 'sans-serif' }}>
            church-guest-followup.vercel.app/schedule/{year}
          </span>
        </div>
      </div>
    ),
    {
      width:  1200,
      height: 630,
    }
  );
}
