import { notFound } from 'next/navigation';
import prisma from '@/lib/db';

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function getDisplayName(name: string | null, user: { name: string } | null): string {
  if (user?.name) return user.name;
  if (name && name !== 'TBD') return name;
  return 'TBD';
}

export default async function PrintSchedulePage({ params }: { params: { year: string } }) {
  const year = parseInt(params.year);
  if (isNaN(year)) notFound();

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

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Grace Life Center — {scheduleYear.label}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Georgia, serif; font-size: 11pt; color: #1a1a2e; background: #fff; }

          /* Print button — hidden when printing */
          .print-toolbar {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            background: #102a43; color: #fff; padding: 10px 20px;
            display: flex; align-items: center; justify-between; gap: 12px;
            font-family: sans-serif; font-size: 14px;
          }
          .print-toolbar button {
            background: #d57d2a; color: #fff; border: none; padding: 8px 18px;
            border-radius: 6px; font-size: 14px; font-weight: bold; cursor: pointer;
          }
          .print-spacer { height: 52px; }

          @media print {
            .print-toolbar, .print-spacer { display: none !important; }
            body { font-size: 9pt; }
            @page { size: A4 landscape; margin: 10mm 8mm; }
          }

          /* Cover */
          .cover {
            text-align: center; padding: 32px 16px 24px;
            border-bottom: 3px solid #102a43; margin-bottom: 24px;
          }
          .cover h1 { font-size: 26pt; color: #102a43; margin-bottom: 6px; }
          .cover h2 { font-size: 14pt; color: #4a1772; font-weight: normal; margin-bottom: 8px; }
          .cover .theme { font-size: 11pt; color: #627d98; font-style: italic; }
          .cover .meta { font-family: sans-serif; font-size: 9pt; color: #9ca3af; margin-top: 8px; }

          /* Month section */
          .month-section { margin-bottom: 20px; page-break-inside: avoid; }
          .month-header {
            background: #102a43; color: #fff; padding: 7px 12px;
            border-radius: 6px 6px 0 0; font-size: 13pt; font-weight: bold;
          }
          .month-theme { font-family: sans-serif; font-size: 8pt; opacity: 0.8; margin-top: 2px; }

          /* Table */
          table { width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 8.5pt; }
          thead tr { background: #f0f4f8; }
          thead th { padding: 5px 8px; text-align: left; font-weight: 600; color: #486581; border-bottom: 1px solid #d9e2ec; }
          tbody tr { border-bottom: 1px solid #e4eaf0; }
          tbody tr:last-child { border-bottom: none; }
          tbody tr:nth-child(even) { background: #fafbfc; }
          td { padding: 6px 8px; vertical-align: top; }
          td.date-col { width: 70px; font-weight: bold; white-space: nowrap; color: #102a43; }
          td.topic-col { max-width: 280px; }
          td.topic-title { font-weight: 600; color: #1a1a2e; line-height: 1.3; }
          td.scripture { font-style: italic; color: #5a3e8a; font-size: 8pt; }
          td.role-val { color: #374151; }
          td.tbd { color: #d1d5db; font-style: italic; }
          .notes-row td { background: #fffbeb; color: #92400e; font-style: italic; font-size: 7.5pt; padding: 3px 8px 5px; }

          /* Footer */
          .footer { text-align: center; padding: 16px; border-top: 1px solid #d9e2ec; margin-top: 24px; font-family: sans-serif; font-size: 9pt; color: #9ca3af; }
        `}</style>
      </head>
      <body>
        {/* Print toolbar — only visible on screen */}
        <div className="print-toolbar">
          <span>⛪ Grace Life Center — {scheduleYear.label}</span>
          <button onClick={() => window?.print()}>🖨️ Print / Save as PDF</button>
        </div>
        <div className="print-spacer" />

        {/* Cover */}
        <div className="cover">
          <div style={{ fontSize: '2.5em', marginBottom: 8 }}>⛪</div>
          <h1>Grace Life Center</h1>
          <h2>{scheduleYear.label}</h2>
          {scheduleYear.theme && <p className="theme">{scheduleYear.theme}</p>}
          <p className="meta">{schedules.length} Sundays · Printed {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Months */}
        {Object.entries(byMonth)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([monthStr, services]) => {
            const month = Number(monthStr);
            const theme = services[0]?.monthTheme || '';
            const cleanTheme = theme.replace(/^[A-Z]+ THEME:\s*/i, '');

            return (
              <div key={month} className="month-section">
                <div className="month-header">
                  {MONTH_NAMES[month]}
                  {cleanTheme && <div className="month-theme">{cleanTheme}</div>}
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>Date</th>
                      <th>Topic</th>
                      <th style={{ width: 130 }}>🎤 Speaker</th>
                      <th style={{ width: 120 }}>📋 Coordinator</th>
                      <th style={{ width: 110 }}>🙏 Prayer</th>
                      <th style={{ width: 110 }}>🎵 Worship</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(svc => {
                      const date = new Date(svc.date);
                      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                      const scriptureMatch = svc.topic.match(/\(([^)]+)\)\s*$/);
                      const scripture = scriptureMatch?.[1] || null;
                      const title     = scripture ? svc.topic.replace(/\s*\([^)]+\)\s*$/, '') : svc.topic;
                      const speaker   = getDisplayName(svc.speakerName, svc.speaker);
                      const coord     = getDisplayName(svc.serviceCoordinatorName, svc.serviceCoordinator);
                      const prayer    = getDisplayName(svc.propheticPrayerName, svc.propheticPrayer);
                      const worship   = getDisplayName(svc.worshipLeaderName, svc.worshipLeader);

                      return (
                        <>
                          <tr key={svc.id}>
                            <td className="date-col">{dateStr}</td>
                            <td className="topic-col">
                              <div className="topic-title">{title}</div>
                              {scripture && <div className="scripture">{scripture}</div>}
                            </td>
                            <td className={speaker === 'TBD' ? 'tbd' : 'role-val'}>{speaker}</td>
                            <td className={coord   === 'TBD' ? 'tbd' : 'role-val'}>{coord}</td>
                            <td className={prayer  === 'TBD' ? 'tbd' : 'role-val'}>{prayer}</td>
                            <td className={worship === 'TBD' ? 'tbd' : 'role-val'}>{worship}</td>
                          </tr>
                          {svc.notes && (
                            <tr className="notes-row" key={`${svc.id}-notes`}>
                              <td />
                              <td colSpan={5}>📌 {svc.notes}</td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}

        <div className="footer">
          ⛪ Grace Life Center · {scheduleYear.label} · This schedule is subject to change. God bless!
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          document.querySelector('button')?.addEventListener('click', function() { window.print(); });
        ` }} />
      </body>
    </html>
  );
}
