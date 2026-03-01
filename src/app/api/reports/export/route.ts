import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { toCSV, formatDate, STATUS_LABELS, ACTIVITY_LABELS } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request, ['ADMIN', 'LEADER']);
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'guests';

    let csv = '';
    let filename = '';

    switch (type) {
      case 'guests': {
        const guests = await prisma.guest.findMany({
          include: { assignedVolunteer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        });
        csv = toCSV(
          guests.map(g => ({
            firstName: g.firstName,
            lastName: g.lastName,
            phone: g.phone,
            email: g.email,
            preferredContact: g.preferredContactMethod,
            firstVisitDate: formatDate(g.firstVisitDate),
            serviceAttended: g.serviceAttended,
            status: STATUS_LABELS[g.status] || g.status,
            assignedVolunteer: g.assignedVolunteer?.name || 'Unassigned',
            assignedAt: formatDate(g.assignedAt),
            serviceReturnCount: g.serviceReturnCount,
            becomeSignup: g.becomeSignup ? 'Yes' : 'No',
            becomeSignupDate: formatDate(g.becomeSignupDate),
            becomeCohort: g.becomeCohort,
            createdAt: formatDate(g.createdAt),
          })),
          [
            { key: 'firstName', label: 'First Name' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'preferredContact', label: 'Preferred Contact' },
            { key: 'firstVisitDate', label: 'First Visit Date' },
            { key: 'serviceAttended', label: 'Service Attended' },
            { key: 'status', label: 'Status' },
            { key: 'assignedVolunteer', label: 'Assigned Volunteer' },
            { key: 'assignedAt', label: 'Assigned Date' },
            { key: 'serviceReturnCount', label: 'Service Returns' },
            { key: 'becomeSignup', label: 'Become Signup' },
            { key: 'becomeSignupDate', label: 'Become Date' },
            { key: 'becomeCohort', label: 'Cohort' },
            { key: 'createdAt', label: 'Created' },
          ]
        );
        filename = `guests-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }
      case 'activities': {
        const activities = await prisma.followUpActivity.findMany({
          include: {
            guest: { select: { firstName: true, lastName: true } },
            performedBy: { select: { name: true } },
          },
          orderBy: { activityDateTime: 'desc' },
        });
        csv = toCSV(
          activities.map(a => ({
            guestName: `${a.guest.firstName} ${a.guest.lastName}`,
            performedBy: a.performedBy.name,
            activityType: ACTIVITY_LABELS[a.activityType] || a.activityType,
            activityDate: formatDate(a.activityDateTime),
            outcome: a.outcome,
            notes: a.notes,
            nextFollowUp: formatDate(a.nextFollowUpDate),
          })),
          [
            { key: 'guestName', label: 'Guest' },
            { key: 'performedBy', label: 'Performed By' },
            { key: 'activityType', label: 'Activity Type' },
            { key: 'activityDate', label: 'Date' },
            { key: 'outcome', label: 'Outcome' },
            { key: 'notes', label: 'Notes' },
            { key: 'nextFollowUp', label: 'Next Follow-Up' },
          ]
        );
        filename = `activities-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }
      case 'service-returns': {
        const returns = await prisma.guestServiceReturn.findMany({
          include: {
            guest: { select: { firstName: true, lastName: true } },
            recordedBy: { select: { name: true } },
          },
          orderBy: [{ guestId: 'asc' }, { returnNumber: 'asc' }],
        });
        csv = toCSV(
          returns.map(r => ({
            guestName: `${r.guest.firstName} ${r.guest.lastName}`,
            returnNumber: r.returnNumber,
            serviceDate: formatDate(r.serviceDate),
            serviceName: r.serviceName,
            recordedBy: r.recordedBy.name,
          })),
          [
            { key: 'guestName', label: 'Guest' },
            { key: 'returnNumber', label: 'Return #' },
            { key: 'serviceDate', label: 'Service Date' },
            { key: 'serviceName', label: 'Service Name' },
            { key: 'recordedBy', label: 'Recorded By' },
          ]
        );
        filename = `service-returns-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }
      case 'volunteer-summary': {
        const volunteers = await prisma.user.findMany({
          where: { role: 'VOLUNTEER' },
          select: {
            name: true,
            email: true,
            active: true,
            _count: { select: { assignedGuests: true, activities: true } },
            assignedGuests: {
              select: { becomeSignup: true, serviceReturnCount: true },
            },
          },
        });
        csv = toCSV(
          volunteers.map(v => ({
            name: v.name,
            email: v.email,
            active: v.active ? 'Yes' : 'No',
            assignedGuests: v._count.assignedGuests,
            totalActivities: v._count.activities,
            becomeSignups: v.assignedGuests.filter(g => g.becomeSignup).length,
            avgReturns: v.assignedGuests.length > 0
              ? (v.assignedGuests.reduce((s, g) => s + g.serviceReturnCount, 0) / v.assignedGuests.length).toFixed(1)
              : '0',
          })),
          [
            { key: 'name', label: 'Volunteer' },
            { key: 'email', label: 'Email' },
            { key: 'active', label: 'Active' },
            { key: 'assignedGuests', label: 'Assigned Guests' },
            { key: 'totalActivities', label: 'Total Activities' },
            { key: 'becomeSignups', label: 'Become Signups' },
            { key: 'avgReturns', label: 'Avg Service Returns' },
          ]
        );
        filename = `volunteer-summary-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
