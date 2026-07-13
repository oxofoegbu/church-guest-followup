import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ACTION_ITEM_TYPES } from '@/lib/utils';

// This endpoint is called by Vercel Cron or external cron service
// It finds action items due within their reminder window and sends notifications
export async function GET(request: NextRequest) {
  try {
    // Simple auth via secret header (for cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.JWT_SECRET;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find action items that are:
    // 1. Not completed
    // 2. Not already reminded
    // 3. Due within their reminder window
    const items = await prisma.actionItem.findMany({
      where: {
        completed: false,
        reminderSent: false,
        dueDate: { gte: now }, // not overdue yet
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        guest: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    let sent = 0;

    for (const item of items) {
      // Check if we're within the reminder window
      const reminderTime = new Date(item.dueDate.getTime() - item.reminderMinutes * 60000);
      if (now < reminderTime) continue; // not yet time to remind

      const actionLabel = ACTION_ITEM_TYPES[item.actionType]?.label || item.customAction || item.actionType;
      const guestName = item.guest ? `${item.guest.firstName} ${item.guest.lastName}` : '';


      // Send Email via Resend
      if (item.user.email) {
        try {
          const resendKey = process.env.RESEND_API_KEY;
          const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@church.com';
          const fromName = process.env.RESEND_FROM_NAME || 'Church Guest Follow-Up';
          if (resendKey) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: `${fromName} <${fromEmail}>`,
                to: [item.user.email],
                subject: `Reminder: ${item.title}`,
                html: `<h3>⏰ ${item.title}</h3><p><strong>Action:</strong> ${actionLabel}</p>${guestName ? `<p><strong>For:</strong> ${guestName}</p>` : ''}<p><strong>Due:</strong> ${item.dueDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${item.dueTime ? ` at ${item.dueTime}` : ''}</p>${item.notes ? `<p><strong>Notes:</strong> ${item.notes}</p>` : ''}`,
              }),
            });
          }
        } catch (e) { console.error('Email reminder failed:', e); }
      }

      // Mark as reminded
      await prisma.actionItem.update({
        where: { id: item.id },
        data: { reminderSent: true },
      });
      sent++;
    }

    return NextResponse.json({ ok: true, checked: items.length, sent });
  } catch (error) {
    console.error('Reminder cron error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
