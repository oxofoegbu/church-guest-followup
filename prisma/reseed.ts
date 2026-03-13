import { PrismaClient, GuestStatus, PreferredContact, ActivityType, NotificationChannel, NotificationStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log('🧹 Cleaning old seeded data...');

  // Delete all activities, service returns, notification logs, guests
  await prisma.followUpActivity.deleteMany({});
  await prisma.guestServiceReturn.deleteMany({});
  await prisma.notificationLog.deleteMany({});
  await prisma.guest.deleteMany({});
  console.log('✅ Old guests and related data cleared');

  // Remove deactivated sample users (church.org emails)
  const deactivatedUsers = await prisma.user.findMany({
    where: {
      email: { in: ['james@church.org', 'samuel@church.org', 'faith@church.org', 'grace@church.org'] },
    },
  });
  for (const u of deactivatedUsers) {
    await prisma.user.delete({ where: { id: u.id } });
  }
  console.log(`✅ Removed ${deactivatedUsers.length} old sample users`);

  // Look up active volunteers and leaders
  const allUsers = await prisma.user.findMany({ where: { active: true } });
  const volunteers = allUsers.filter(u => u.role === 'VOLUNTEER');
  const leaders = allUsers.filter(u => u.role === 'LEADER');
  const admins = allUsers.filter(u => u.role === 'ADMIN');

  console.log(`Found ${volunteers.length} active volunteers, ${leaders.length} leaders, ${admins.length} admins`);

  if (volunteers.length === 0) {
    console.error('❌ No active volunteers found! Please create users first.');
    return;
  }

  // 20 guests with African names and US contact details
  const guestsData = [
    { firstName: 'Adaeze', lastName: 'Nwankwo', phone: '+12025551001', email: 'adaeze.nwankwo@gmail.com', preferredContactMethod: PreferredContact.CALL, firstVisitDate: daysAgo(3), serviceAttended: 'Sunday 10am', howHeardAboutUs: 'Friend/Family', prayerRequest: 'Praying for a new job opportunity', status: GuestStatus.NEW_GUEST },
    { firstName: 'Chidi', lastName: 'Okafor', phone: '+12405552002', email: 'chidi.okafor@yahoo.com', preferredContactMethod: PreferredContact.WHATSAPP, firstVisitDate: daysAgo(5), serviceAttended: 'Sunday 10am', howHeardAboutUs: 'Social Media', prayerRequest: null, status: GuestStatus.ASSIGNED },
    { firstName: 'Ngozi', lastName: 'Eze', phone: '+14435553003', email: 'ngozi.eze@gmail.com', preferredContactMethod: PreferredContact.TEXT, firstVisitDate: daysAgo(7), serviceAttended: 'Wednesday Bible Study', howHeardAboutUs: 'Friend/Family', prayerRequest: 'Please pray for my mother\'s health', status: GuestStatus.CONTACTED },
    { firstName: 'Emeka', lastName: 'Udoh', phone: '+13015554004', email: 'emeka.udoh@outlook.com', preferredContactMethod: PreferredContact.CALL, firstVisitDate: daysAgo(10), serviceAttended: 'Sunday 10am', howHeardAboutUs: 'Website', prayerRequest: null, status: GuestStatus.MEETING_SCHEDULED },
    { firstName: 'Amara', lastName: 'Igwe', phone: '+17325555005', email: 'amara.igwe@gmail.com', preferredContactMethod: PreferredContact.EMAIL, firstVisitDate: daysAgo(14), serviceAttended: 'Friday Prayer Meeting', howHeardAboutUs: 'Drove By', prayerRequest: 'Seeking direction in career', status: GuestStatus.MET },
    { firstName: 'Tunde', lastName: 'Adebayo', phone: '+12025556006', email: 'tunde.adebayo@gmail.com', preferredContactMethod: PreferredContact.WHATSAPP, firstVisitDate: daysAgo(18), serviceAttended: 'Sunday 10am', howHeardAboutUs: 'Friend/Family', prayerRequest: null, status: GuestStatus.ATTENDING_REGULARLY },
    { firstName: 'Funke', lastName: 'Olawale', phone: '+12405557007', email: 'funke.olawale@yahoo.com', preferredContactMethod: PreferredContact.CALL, firstVisitDate: daysAgo(25), serviceAttended: 'Sunday 10am', howHeardAboutUs: 'Social Media', prayerRequest: 'Family unity', status: GuestStatus.BECOME_SIGNED_UP },
    { firstName: 'Obiora', lastName: 'Mbah', phone: '+14435558008', email: null, preferredContactMethod: PreferredContact.CALL, firstVisitDate: daysAgo(2), serviceAttended: 'Sunday 10am', howHeardAboutUs: 'Friend/Family', prayerRequest: null, status: GuestStatus.NEW_GUEST },
    { firstName: 'Yetunde', lastName: 'Fashola', phone: '+13015559009', email: 'yetunde.f@gmail.com', preferredContactMethod: PreferredContact.TEXT, firstVisitDate: daysAgo(4), serviceAttended: 'Wednesday Bible Study', howHeardAboutUs: 'Invited by Member', prayerRequest: 'Struggling with anxiety', status: GuestStatus.NEW_GUEST },
    { firstName: 'Kelechi', lastName: 'Onuoha', phone: '+16675550010', email: 'kelechi.onuoha@gmail.com', preferredContactMethod: PreferredContact.WHATSAPP, firstVisitDate: daysAgo(8), serviceAttended: 'Sunday 10am', howHeardAboutUs: 'Google Search', prayerRequest: null, status: GuestStatus.CONTACT_ATTEMPTED },
    { firstName: 'Aisha', lastName: 'Bello', phone: '+12025550011', email: 'aisha.bello@outlook.com', preferredContactMethod: PreferredContact.EMAIL, firstVisitDate: daysAgo(12), serviceAttended: 'Special Event', howHeardAboutUs: 'Community Event', prayerRequest: 'Healing for my sister', status: GuestStatus.CONTACTED },
    { firstName: 'Ifeanyi', lastName: 'Chukwuma', phone: '+12405550012', email: 'ifeanyi.c@gmail.com', preferredContactMethod: PreferredContact.CALL, firstVisitDate: daysAgo(20), serviceAttended: 'Sunday 10am', howHeardAboutUs: 'Friend/Family', prayerRequest: null, status: GuestStatus.ATTENDING_REGULARLY },
    { firstName: 'Blessing', lastName: 'Okonkwo', phone: '+14435550013', email: 'blessing.o@yahoo.com', preferredContactMethod: PreferredContact.WHATSAPP, firstVisitDate: daysAgo(30), serviceAttended: 'Sunday 10am', howHeardAboutUs: 'Friend/Family', prayerRequest: 'Financial breakthrough', status: GuestStatus.BECOME_SIGNED_UP },
    { firstName: 'Segun', lastName: 'Afolabi', phone: '+13015550014', email: null, preferredContactMethod: PreferredContact.CALL, firstVisitDate: daysAgo(6), serviceAttended: 'Friday Prayer Meeting', howHeardAboutUs: 'Flyer', prayerRequest: null, status: GuestStatus.ASSIGNED },
    { firstName: 'Chiamaka', lastName: 'Nnamdi', phone: '+17325550015', email: 'chiamaka.n@gmail.com', preferredContactMethod: PreferredContact.TEXT, firstVisitDate: daysAgo(15), serviceAttended: 'Sunday 10am', howHeardAboutUs: 'Social Media', prayerRequest: 'Wisdom for decisions', status: GuestStatus.MET },
    { firstName: 'Oluwaseun', lastName: 'Bakare', phone: '+12025550016', email: 'seun.bakare@gmail.com', preferredContactMethod: PreferredContact.WHATSAPP, firstVisitDate: daysAgo(35), serviceAttended: 'Sunday 10am', howHeardAboutUs: 'Friend/Family', prayerRequest: null, status: GuestStatus.NOT_INTERESTED },
    { firstName: 'Nneka', lastName: 'Obi', phone: '+12405550017', email: 'nneka.obi@gmail.com', preferredContactMethod: PreferredContact.CALL, firstVisitDate: daysAgo(9), serviceAttended: 'Wednesday Bible Study', howHeardAboutUs: 'Invited by Member', prayerRequest: 'Pray for my children\'s education', status: GuestStatus.CONTACT_ATTEMPTED },
    { firstName: 'Dayo', lastName: 'Ogundimu', phone: '+14435550018', email: 'dayo.ogun@yahoo.com', preferredContactMethod: PreferredContact.EMAIL, firstVisitDate: daysAgo(22), serviceAttended: 'Sunday 10am', howHeardAboutUs: 'Friend/Family', prayerRequest: null, status: GuestStatus.INACTIVE },
    { firstName: 'Uchenna', lastName: 'Ekeh', phone: '+16675550019', email: 'uchenna.ekeh@gmail.com', preferredContactMethod: PreferredContact.CALL, firstVisitDate: daysAgo(1), serviceAttended: 'Sunday 10am', howHeardAboutUs: 'Friend/Family', prayerRequest: 'Grateful for finding this church', status: GuestStatus.NEW_GUEST },
    { firstName: 'Folake', lastName: 'Adeyemi', phone: '+13015550020', email: 'folake.adeyemi@gmail.com', preferredContactMethod: PreferredContact.WHATSAPP, firstVisitDate: daysAgo(28), serviceAttended: 'Special Event', howHeardAboutUs: 'Community Event', prayerRequest: 'Peace in my marriage', status: GuestStatus.ATTENDING_REGULARLY },
  ];

  // Create guests and assign to volunteers round-robin
  const createdGuests: any[] = [];
  let volIndex = 0;

  for (const gData of guestsData) {
    const isNew = gData.status === GuestStatus.NEW_GUEST;
    const volunteer = volunteers[volIndex % volunteers.length];

    const guest = await prisma.guest.create({
      data: {
        ...gData,
        assignedVolunteerId: isNew ? null : volunteer.id,
        assignedAt: isNew ? null : new Date(gData.firstVisitDate.getTime() + 12 * 60 * 60 * 1000), // 12h after visit
        becomeSignup: gData.status === GuestStatus.BECOME_SIGNED_UP,
        becomeSignupDate: gData.status === GuestStatus.BECOME_SIGNED_UP ? daysAgo(2) : null,
        becomeCohort: gData.status === GuestStatus.BECOME_SIGNED_UP ? 'Spring 2026' : null,
      },
    });
    createdGuests.push({ ...guest, volunteer });
    if (!isNew) volIndex++;
  }
  console.log(`✅ ${createdGuests.length} guests created`);

  // Create service returns for guests who have returned
  const returnsMap: { guestIndex: number; returns: number }[] = [
    { guestIndex: 2, returns: 2 },   // Ngozi - Contacted
    { guestIndex: 3, returns: 3 },   // Emeka - Meeting Scheduled
    { guestIndex: 4, returns: 4 },   // Amara - Met
    { guestIndex: 5, returns: 5 },   // Tunde - Attending Regularly
    { guestIndex: 6, returns: 7 },   // Funke - Become Signed Up (hit target)
    { guestIndex: 10, returns: 1 },  // Aisha - Contacted
    { guestIndex: 11, returns: 6 },  // Ifeanyi - Attending Regularly
    { guestIndex: 12, returns: 7 },  // Blessing - Become Signed Up
    { guestIndex: 14, returns: 3 },  // Chiamaka - Met
    { guestIndex: 15, returns: 2 },  // Oluwaseun - Not Interested
    { guestIndex: 19, returns: 5 },  // Folake - Attending Regularly
  ];

  const serviceNames = ['Sunday 10am', 'Wednesday Bible Study', 'Friday Prayer Meeting', 'Sunday 10am', 'Sunday 10am', 'Wednesday Bible Study', 'Sunday 10am'];

  for (const rm of returnsMap) {
    const guest = createdGuests[rm.guestIndex];
    const recorder = guest.volunteer || volunteers[0];
    for (let r = 1; r <= rm.returns; r++) {
      await prisma.guestServiceReturn.create({
        data: {
          guestId: guest.id,
          returnNumber: r,
          serviceDate: daysAgo(Math.max(1, (rm.returns - r) * 4 + 1)),
          serviceName: serviceNames[(r - 1) % serviceNames.length],
          recordedByUserId: recorder.id,
        },
      });
    }
    await prisma.guest.update({
      where: { id: guest.id },
      data: { serviceReturnCount: rm.returns },
    });
  }
  console.log('✅ Service returns created');

  // Create follow-up activities
  const activityTypes = [ActivityType.PHONE_CALL, ActivityType.WHATSAPP_MESSAGE, ActivityType.SMS_TEXT, ActivityType.EMAIL, ActivityType.HOME_VISIT, ActivityType.INVITED_SMALL_GROUP];

  for (let i = 0; i < createdGuests.length; i++) {
    const guest = createdGuests[i];
    if (guest.status === 'NEW_GUEST') continue; // New guests have no activities yet

    const volunteer = guest.volunteer || volunteers[0];
    const numActivities = Math.min(3, Math.floor(Math.random() * 4) + 1);

    for (let a = 0; a < numActivities; a++) {
      const actType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const outcomes = ['Left voicemail', 'Spoke briefly, will call back', 'Had great conversation', 'Sent message, awaiting reply', 'Met in person, very positive', 'Invited to small group'];
      await prisma.followUpActivity.create({
        data: {
          guestId: guest.id,
          performedByUserId: volunteer.id,
          activityType: actType,
          activityDateTime: daysAgo(Math.floor(Math.random() * 20) + 1),
          outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
          notes: a === 0 ? `First contact with ${guest.firstName}` : null,
          nextFollowUpDate: a === numActivities - 1 && !['BECOME_SIGNED_UP', 'NOT_INTERESTED', 'INACTIVE'].includes(guest.status)
            ? daysAgo(-Math.floor(Math.random() * 7)) // Some in future, some overdue
            : null,
        },
      });
    }
  }
  console.log('✅ Follow-up activities created');

  // Ensure notification settings exist
  const settingsDefaults = [
    { key: 'notify_emails', value: 'churchadmin@gracelifecenter.com,pastor@gracelifecenter.com' },
    { key: 'notify_whatsapp', value: '+12023526018' },
    { key: 'notify_on_new_guest', value: 'true' },
    { key: 'notify_on_assignment', value: 'true' },
  ];
  for (const s of settingsDefaults) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('✅ Notification settings verified');

  console.log('\n🎉 Re-seed completed!');
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ${createdGuests.length} guests created`);
  console.log(`  Assigned to ${volunteers.length} active volunteers`);
  console.log(`  ${deactivatedUsers.length} old sample users removed`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main()
  .catch((e) => {
    console.error('Reseed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
