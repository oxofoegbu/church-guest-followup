import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Called daily by Vercel cron at 9am UTC
// vercel.json: { "crons": [{ "path": "/api/cron/schedule-reminders", "schedule": "0 9 * * *" }] }

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const WHAPI_TOKEN    = process.env.WHAPI_TOKEN!
const FROM_EMAIL     = process.env.FROM_EMAIL || 'noreply@gracelifecenter.org'
const CHURCH_NAME    = 'Grace Life Center'
const CONTACT_NAME   = 'Pastor Okezie'
const CONTACT_PHONE  = process.env.ADMIN_WHATSAPP || ''

type UserInfo = { id: string; name: string | null; email: string | null; phone: string | null } | null

async function sendEmail(to: string, name: string, role: string, schedule: {
  date: Date; topic: string; monthTheme: string | null
}) {
  const dateStr = schedule.date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  })

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `${CHURCH_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `📅 Reminder: Your Role This Sunday — ${dateStr}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <div style="background:#4f46e5;color:white;padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;font-size:22px;">${CHURCH_NAME}</h1>
            <p style="margin:8px 0 0;opacity:0.85;">Sunday Service Reminder</p>
          </div>
          <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="font-size:16px;">Hi <strong>${name}</strong>,</p>
            <p>This is your reminder that you are scheduled to serve as <strong>${role}</strong> this Sunday.</p>
            
            <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Service Details</p>
              <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#111827;">📅 ${dateStr}</p>
              ${schedule.monthTheme ? `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Monthly Theme: ${schedule.monthTheme}</p>` : ''}
              <p style="margin:0;color:#374151;font-size:15px;line-height:1.5;font-style:italic;">"${schedule.topic}"</p>
            </div>

            <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 8px 8px 0;">
              <p style="margin:0;font-size:14px;color:#1e40af;">
                Your Role: <strong>${role}</strong><br/>
                Questions? Contact <strong>${CONTACT_NAME}</strong>${CONTACT_PHONE ? ` at ${CONTACT_PHONE}` : ''}.
              </p>
            </div>

            <p style="margin-top:24px;font-size:13px;color:#9ca3af;">
              This reminder was sent automatically by the ${CHURCH_NAME} Guest & Schedule System.
            </p>
          </div>
        </div>
      `,
    }),
  })
}

async function sendWhatsApp(phone: string, name: string, role: string, schedule: {
  date: Date; topic: string; monthTheme: string | null
}) {
  const dateStr = schedule.date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  })
  const themeLine = schedule.monthTheme ? `\n📖 Theme: ${schedule.monthTheme}` : ''

  const message =
    `🙏 *${CHURCH_NAME} — Sunday Reminder*\n\n` +
    `Hi ${name},\n\nYou're scheduled as *${role}* this Sunday.\n\n` +
    `📅 *${dateStr}*${themeLine}\n\n` +
    `📝 Topic: _${schedule.topic}_\n\n` +
    `Questions? Contact ${CONTACT_NAME}${CONTACT_PHONE ? ` — ${CONTACT_PHONE}` : ''}.\n\n` +
    `_See you Sunday! 🎉_`

  // Normalize phone: remove spaces, dashes; ensure starts with country code
  const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '')

  await fetch(`https://gate.whapi.cloud/messages/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WHAPI_TOKEN}`,
    },
    body: JSON.stringify({
      to: `${normalizedPhone}@s.whatsapp.net`,
      body: message,
    }),
  })
}

async function notifyUser(user: UserInfo, role: string, schedule: {
  date: Date; topic: string; monthTheme: string | null; id: string
}) {
  if (!user) return

  const name = user.name || 'Team Member'
  const errors: string[] = []

  if (user.email) {
    try {
      await sendEmail(user.email, name, role, schedule)
    } catch (e) {
      errors.push(`email: ${e}`)
    }
  }

  if (user.phone) {
    try {
      await sendWhatsApp(user.phone, name, role, schedule)
    } catch (e) {
      errors.push(`whatsapp: ${e}`)
    }
  }

  if (errors.length) {
    console.error(`[schedule-reminders] Notify errors for ${name} (${role}):`, errors)
  }
}

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorised triggers
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Vercel cron calls don't use Authorization header, they use x-vercel-cron
    const isVercelCron = req.headers.get('x-vercel-cron') === '1'
    if (!isVercelCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // Find all services happening exactly 7 days from today (UTC)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const targetDate = new Date(today)
    targetDate.setUTCDate(targetDate.getUTCDate() + 7)

    const nextDay = new Date(targetDate)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)

    const upcomingServices = await prisma.serviceSchedule.findMany({
      where: {
        date: { gte: targetDate, lt: nextDay },
        reminderSent: false,
      },
      include: {
        speaker:           { select: { id: true, name: true, email: true, phone: true } },
        serviceCoordinator:{ select: { id: true, name: true, email: true, phone: true } },
        propheticPrayer:   { select: { id: true, name: true, email: true, phone: true } },
        worshipLeader:     { select: { id: true, name: true, email: true, phone: true } },
      },
    })

    if (upcomingServices.length === 0) {
      return NextResponse.json({ message: 'No reminders to send today', sent: 0 })
    }

    let totalSent = 0

    for (const svc of upcomingServices) {
      const scheduleInfo = { date: svc.date, topic: svc.topic, monthTheme: svc.monthTheme, id: svc.id }

      await notifyUser(svc.speaker,            'Speaker (Word Minister)',    scheduleInfo)
      await notifyUser(svc.serviceCoordinator, 'Service Coordinator',        scheduleInfo)
      await notifyUser(svc.propheticPrayer,    'Prophetic Prayer Minister',  scheduleInfo)
      await notifyUser(svc.worshipLeader,      'Worship Leader',             scheduleInfo)

      await prisma.serviceSchedule.update({
        where: { id: svc.id },
        data: { reminderSent: true },
      })

      totalSent++
    }

    console.log(`[schedule-reminders] Sent reminders for ${totalSent} service(s)`)
    return NextResponse.json({ message: `Reminders sent for ${totalSent} service(s)`, sent: totalSent })
  } catch (error) {
    console.error('[schedule-reminders] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Allow POST as well (for manual triggering from admin UI)
export { GET as POST }
