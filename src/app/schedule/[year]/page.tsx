import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import prisma from '@/lib/db';

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

const MONTH_BG = [
  '#f5f3ff','#fff1f2','#f0fdf4','#fffbeb','#ecfeff','#f7fee7',
  '#fff7ed','#f0fdfa','#eef2ff','#fef2f2','#faf5ff','#eff6ff',
];
const MONTH_ACCENT = [
  '#7c3aed','#e11d48','#059669','#d97706','#0891b2','#65a30d',
  '#ea580c','#0d9488','#4f46e5','#dc2626','#9333ea','#2563eb',
];

function getDisplayName(name: string | null, user: { name: string } | null): string {
  if (user?.name) return user.name;
  if (name && name !== 'TBD') return name;
  return 'TBD';
}

// ── OG Meta tags for WhatsApp / social previews ───────────────────────────────
export async function generateMetadata({ params }: { params: { year: string } }): Promise<Metadata> {
  const year = parseInt(params.year);
  const scheduleYear = await prisma.scheduleYear.findUnique({ where: { year } }).catch(() => null);
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://church-guest-followup.vercel.app';

  if (!scheduleYear) {
    return { title: 'Grace Life Center' };
  }

  const title       = `Grace Life Center — ${scheduleYear.label}`;
  const description = scheduleYear.theme
    ? `${scheduleYear.theme} · View our full ${year} Sunday service schedule.`
    : `View our full ${year} Sunday service schedule at Grace Life Center.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url:       `${APP_URL}/schedule/${year}`,
      siteName:  'Grace Life Center',
      type:      'website',
      images: [{
        url:    `${APP_URL}/og-schedule.png`,   // add a 1200×630 banner to /public if you want an image preview
        width:  1200,
        height: 630,
        alt:    title,
      }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PublicSchedulePage({ params }: { params: { year: string } }) {
  const year = parseInt(params.year);
  if (isNaN(year) || year < 2020 || year > 2100) notFound();

  const scheduleYear = await prisma.scheduleYear.findUnique({ where: { year } });
  if (!scheduleYear) notFound();

  const schedules = await prisma.serviceSchedule.findMany({
    where: { date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } },
    select: {
      id: true, date: true, monthTheme: true, topic: true,
      speakerName: true, serviceCoordinatorName: true,
      propheticPrayerName: true, worshipLeaderName: true,
      speaker:            { select: { name: true } },
      serviceCoordinator: { select: { name: true } },
      propheticPrayer:    { select: { name: true } },
      worshipLeader:      { select: { name: true } },
      notes: true,
    },
    orderBy: { date: 'asc' },
  });

  const byMonth = schedules.reduce<Record<number, typeof schedules>>((acc, svc) => {
    const m = new Date(svc.date).getUTCMonth();
    if (!acc[m]) acc[m] = [];
    acc[m].push(svc);
    return acc;
  }, {});

  const printUrl = `/schedule/${year}/print`;
  const APP_URL  = process.env.NEXT_PUBLIC_APP_URL || 'https://church-guest-followup.vercel.app';

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #102a43 0%, #4a1772 100%)', color: '#fff', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⛪</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 'bold', letterSpacing: '-0.5px' }}>
            Grace Life Center
          </h1>
          <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 'normal', opacity: 0.85 }}>
            {scheduleYear.label}
          </h2>
          {scheduleYear.theme && (
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 20px', display: 'inline-block', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 15, opacity: 0.9, fontStyle: 'italic' }}>{scheduleYear.theme}</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
            <a href={printUrl} target="_blank"
              style={{ background: '#d57d2a', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontFamily: 'sans-serif', fontSize: 14, fontWeight: 'bold' }}>
              🖨️ Print / Save as PDF
            </a>
            <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '10px 20px', borderRadius: 8, fontFamily: 'sans-serif', fontSize: 13 }}>
              📅 {schedules.length} Sundays · {year}
            </span>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>
        {Object.entries(byMonth)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([monthStr, services]) => {
            const month = Number(monthStr);
            const accent = MONTH_ACCENT[month];
            const bg     = MONTH_BG[month];
            const theme  = services[0]?.monthTheme || '';
            const cleanTheme = theme.replace(/^[A-Z]+ THEME:\s*/i, '');
            const [themeName, themeSub] = cleanTheme.includes(' — ') ? cleanTheme.split(' — ') : [cleanTheme, ''];

            return (
              <div key={month} style={{ marginBottom: 32 }}>
                <div style={{ background: accent, color: '#fff', borderRadius: '12px 12px 0 0', padding: '16px 24px' }}>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>{MONTH_NAMES[month]}</h2>
                  {themeName && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.85, fontFamily: 'sans-serif' }}>
                      {themeName}{themeSub ? ` — ${themeSub}` : ''}
                    </p>
                  )}
                </div>
                <div style={{ background: bg, border: `1px solid ${accent}33`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {services.map(svc => {
                      const date = new Date(svc.date);
                      const day  = date.getUTCDate();
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
                      const scriptureMatch = svc.topic.match(/\(([^)]+)\)\s*$/);
                      const scripture = scriptureMatch?.[1] || null;
                      const title = scripture ? svc.topic.replace(/\s*\([^)]+\)\s*$/, '') : svc.topic;
                      const speaker  = getDisplayName(svc.speakerName, svc.speaker);
                      const coord    = getDisplayName(svc.serviceCoordinatorName, svc.serviceCoordinator);
                      const prayer   = getDisplayName(svc.propheticPrayerName, svc.propheticPrayer);
                      const worship  = getDisplayName(svc.worshipLeaderName, svc.worshipLeader);

                      return (
                        <div key={svc.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ background: accent, color: '#fff', borderRadius: 8, width: 42, height: 42, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 9, fontFamily: 'sans-serif', opacity: 0.85, textTransform: 'uppercase' }}>{dayName}</span>
                              <span style={{ fontSize: 18, fontWeight: 'bold', lineHeight: 1.1 }}>{day}</span>
                            </div>
                          </div>
                          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 'bold', lineHeight: 1.4, color: '#1a1a2e' }}>{title}</p>
                          {scripture && <p style={{ margin: '0 0 10px', fontSize: 11, color: accent, fontStyle: 'italic', fontFamily: 'sans-serif' }}>{scripture}</p>}
                          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontFamily: 'sans-serif' }}>
                            {[{ icon: '🎤', label: 'Speaker', val: speaker }, { icon: '📋', label: 'Coord.', val: coord }, { icon: '🙏', label: 'Prayer', val: prayer }, { icon: '🎵', label: 'Worship', val: worship }].map(({ icon, label, val }) => (
                              <div key={label}>
                                <p style={{ margin: 0, fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{icon} {label}</p>
                                <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 600, color: val === 'TBD' ? '#d1d5db' : '#374151', fontStyle: val === 'TBD' ? 'italic' : 'normal' }}>{val}</p>
                              </div>
                            ))}
                          </div>
                          {svc.notes && <p style={{ margin: '8px 0 0', fontSize: 11, color: '#92400e', background: '#fef3c7', padding: '4px 8px', borderRadius: 4, fontFamily: 'sans-serif' }}>📌 {svc.notes}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div style={{ background: '#102a43', color: '#829ab1', textAlign: 'center', padding: '24px 16px', fontFamily: 'sans-serif', fontSize: 13 }}>
        <p style={{ margin: '0 0 8px' }}>⛪ Grace Life Center · {year} Sunday Schedule</p>
        <p style={{ margin: 0, fontSize: 12 }}>This schedule is subject to change. God bless!</p>
      </div>
    </div>
  );
}
