// Run 51 — per-teaching Open Graph image. A branded social card generated at the
// edge for each article (title + topic), so shared links look distinct instead of
// all using the one static og.jpg. Mirrors the proven /api/og route (edge runtime,
// next/og ImageResponse, system fonts, explicit display:flex on every element).
// Sermons keep their YouTube thumbnail; only articles point their og:image here.
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') || 'Teaching').slice(0, 130);
  const topic = (searchParams.get('topic') || 'Watch & Read').slice(0, 60);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: '#FBF7EF',
          fontFamily: 'serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '12px', background: '#A63D1F', display: 'flex' }} />
        {/* Right accent bar */}
        <div style={{ position: 'absolute', top: '40px', right: '44px', width: '7px', height: '540px', borderRadius: '4px', background: '#B0894F', opacity: 0.55, display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column', padding: '76px 88px', flex: 1, justifyContent: 'space-between' }}>
          {/* Wordmark + topic */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#B0894F', fontFamily: 'sans-serif', letterSpacing: '3px', textTransform: 'uppercase', display: 'flex' }}>
              Grace Life Center
            </span>
            <span style={{ fontSize: '24px', color: '#6C6358', fontFamily: 'sans-serif', display: 'flex' }}>
              {topic}
            </span>
          </div>

          {/* Title */}
          <span style={{ fontSize: '56px', fontWeight: 'bold', color: '#33201A', lineHeight: 1.1, display: 'flex' }}>
            {title}
          </span>

          {/* Footer */}
          <span style={{ fontSize: '22px', color: '#6C6358', fontFamily: 'sans-serif', display: 'flex' }}>
            gracelifecenter.com  ·  Watch &amp; Read
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
