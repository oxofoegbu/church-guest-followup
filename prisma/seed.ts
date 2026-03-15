import { PrismaClient, GuestStatus, PreferredContact, ActivityType, NotificationChannel, NotificationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.notificationLog.deleteMany();
  await prisma.followUpActivity.deleteMany();
  await prisma.guestServiceReturn.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 12);

  // Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Pastor David Adeyemi',
      email: 'admin@church.org',
      phone: '+2348012345678',
      password: passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  const leader = await prisma.user.create({
    data: {
      name: 'Deaconess Grace Okonkwo',
      email: 'grace@church.org',
      phone: '+2348023456789',
      password: passwordHash,
      role: "LEADER",
      active: true,
    },
  });

  const volunteer1 = await prisma.user.create({
    data: {
      name: 'Brother James Nwosu',
      email: 'james@church.org',
      phone: '+2348034567890',
      password: passwordHash,
      role: "VOLUNTEER",
      active: true,
    },
  });

  const volunteer2 = await prisma.user.create({
    data: {
      name: 'Sister Faith Adekunle',
      email: 'faith@church.org',
      phone: '+2348045678901',
      password: passwordHash,
      role: "VOLUNTEER",
      active: true,
    },
  });

  const volunteer3 = await prisma.user.create({
    data: {
      name: 'Brother Samuel Eze',
      email: 'samuel@church.org',
      phone: '+2348056789012',
      password: passwordHash,
      role: "VOLUNTEER",
      active: true,
    },
  });

  console.log('✅ Users created');

  // Create Guests
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  const guest1 = await prisma.guest.create({
    data: {
      firstName: 'Chioma',
      lastName: 'Obi',
      phone: '+2349012345678',
      email: 'chioma.obi@gmail.com',
      preferredContactMethod: PreferredContact.WHATSAPP,
      firstVisitDate: daysAgo(21),
      serviceAttended: 'Sunday 9am',
      howHeardAboutUs: 'Friend invitation',
      status: GuestStatus.ATTENDING_REGULARLY,
      assignedVolunteerId: volunteer1.id,
      assignedAt: daysAgo(20),
      serviceReturnCount: 5,
    },
  });

  const guest2 = await prisma.guest.create({
    data: {
      firstName: 'Emeka',
      lastName: 'Chukwu',
      phone: '+2349023456789',
      email: 'emeka.c@yahoo.com',
      preferredContactMethod: PreferredContact.CALL,
      firstVisitDate: daysAgo(14),
      serviceAttended: 'Sunday 11am',
      howHeardAboutUs: 'Social media',
      prayerRequest: 'Praying for a new job opportunity',
      status: GuestStatus.CONTACTED,
      assignedVolunteerId: volunteer1.id,
      assignedAt: daysAgo(13),
      serviceReturnCount: 2,
    },
  });

  const guest3 = await prisma.guest.create({
    data: {
      firstName: 'Amara',
      lastName: 'Igwe',
      phone: '+2349034567890',
      email: 'amara.igwe@outlook.com',
      preferredContactMethod: PreferredContact.EMAIL,
      firstVisitDate: daysAgo(7),
      serviceAttended: 'Wednesday Midweek',
      status: GuestStatus.ASSIGNED,
      assignedVolunteerId: volunteer2.id,
      assignedAt: daysAgo(6),
      serviceReturnCount: 0,
    },
  });

  const guest4 = await prisma.guest.create({
    data: {
      firstName: 'Tunde',
      lastName: 'Bakare',
      phone: '+2349045678901',
      preferredContactMethod: PreferredContact.TEXT,
      firstVisitDate: daysAgo(3),
      serviceAttended: 'Sunday 9am',
      howHeardAboutUs: 'Drove past the church',
      status: GuestStatus.NEW_GUEST,
      serviceReturnCount: 0,
    },
  });

  const guest5 = await prisma.guest.create({
    data: {
      firstName: 'Blessing',
      lastName: 'Adeyinka',
      phone: '+2349056789012',
      email: 'blessing.a@gmail.com',
      preferredContactMethod: PreferredContact.WHATSAPP,
      firstVisitDate: daysAgo(30),
      serviceAttended: 'Sunday 11am',
      status: GuestStatus.BECOME_SIGNED_UP,
      assignedVolunteerId: volunteer2.id,
      assignedAt: daysAgo(29),
      becomeSignup: true,
      becomeSignupDate: daysAgo(5),
      becomeCohort: 'Cohort 2025-Q1',
      serviceReturnCount: 7,
    },
  });

  const guest6 = await prisma.guest.create({
    data: {
      firstName: 'Kelechi',
      lastName: 'Nnamdi',
      phone: '+2349067890123',
      preferredContactMethod: PreferredContact.CALL,
      firstVisitDate: daysAgo(45),
      serviceAttended: 'Sunday 9am',
      status: GuestStatus.NOT_INTERESTED,
      assignedVolunteerId: volunteer3.id,
      assignedAt: daysAgo(44),
      serviceReturnCount: 1,
    },
  });

  const guest7 = await prisma.guest.create({
    data: {
      firstName: 'Folake',
      lastName: 'Ojo',
      phone: '+2349078901234',
      email: 'folake.ojo@hotmail.com',
      preferredContactMethod: PreferredContact.WHATSAPP,
      firstVisitDate: daysAgo(10),
      serviceAttended: 'Sunday 11am',
      howHeardAboutUs: 'Neighbour',
      prayerRequest: 'Family unity',
      status: GuestStatus.MEETING_SCHEDULED,
      assignedVolunteerId: volunteer3.id,
      assignedAt: daysAgo(9),
      serviceReturnCount: 3,
    },
  });

  const guest8 = await prisma.guest.create({
    data: {
      firstName: 'Uche',
      lastName: 'Okoro',
      phone: '+2349089012345',
      preferredContactMethod: PreferredContact.TEXT,
      firstVisitDate: daysAgo(1),
      serviceAttended: 'Sunday 9am',
      status: GuestStatus.NEW_GUEST,
      serviceReturnCount: 0,
    },
  });

  console.log('✅ Guests created');

  // Create Service Returns
  const returnData = [
    // Guest 1: 5 returns
    { guestId: guest1.id, returnNumber: 1, serviceDate: daysAgo(17), serviceName: 'Sunday 9am', recordedByUserId: volunteer1.id },
    { guestId: guest1.id, returnNumber: 2, serviceDate: daysAgo(14), serviceName: 'Wednesday Midweek', recordedByUserId: volunteer1.id },
    { guestId: guest1.id, returnNumber: 3, serviceDate: daysAgo(10), serviceName: 'Sunday 9am', recordedByUserId: volunteer1.id },
    { guestId: guest1.id, returnNumber: 4, serviceDate: daysAgo(7), serviceName: 'Sunday 9am', recordedByUserId: volunteer1.id },
    { guestId: guest1.id, returnNumber: 5, serviceDate: daysAgo(3), serviceName: 'Sunday 9am', recordedByUserId: volunteer1.id },
    // Guest 2: 2 returns
    { guestId: guest2.id, returnNumber: 1, serviceDate: daysAgo(10), serviceName: 'Sunday 11am', recordedByUserId: volunteer1.id },
    { guestId: guest2.id, returnNumber: 2, serviceDate: daysAgo(3), serviceName: 'Sunday 11am', recordedByUserId: volunteer1.id },
    // Guest 5: 7 returns (completed target)
    { guestId: guest5.id, returnNumber: 1, serviceDate: daysAgo(27), serviceName: 'Sunday 11am', recordedByUserId: volunteer2.id },
    { guestId: guest5.id, returnNumber: 2, serviceDate: daysAgo(24), serviceName: 'Wednesday Midweek', recordedByUserId: volunteer2.id },
    { guestId: guest5.id, returnNumber: 3, serviceDate: daysAgo(20), serviceName: 'Sunday 11am', recordedByUserId: volunteer2.id },
    { guestId: guest5.id, returnNumber: 4, serviceDate: daysAgo(17), serviceName: 'Sunday 11am', recordedByUserId: volunteer2.id },
    { guestId: guest5.id, returnNumber: 5, serviceDate: daysAgo(13), serviceName: 'Sunday 11am', recordedByUserId: volunteer2.id },
    { guestId: guest5.id, returnNumber: 6, serviceDate: daysAgo(10), serviceName: 'Wednesday Midweek', recordedByUserId: volunteer2.id },
    { guestId: guest5.id, returnNumber: 7, serviceDate: daysAgo(6), serviceName: 'Sunday 11am', recordedByUserId: volunteer2.id },
    // Guest 6: 1 return
    { guestId: guest6.id, returnNumber: 1, serviceDate: daysAgo(38), serviceName: 'Sunday 9am', recordedByUserId: volunteer3.id },
    // Guest 7: 3 returns
    { guestId: guest7.id, returnNumber: 1, serviceDate: daysAgo(7), serviceName: 'Sunday 11am', recordedByUserId: volunteer3.id },
    { guestId: guest7.id, returnNumber: 2, serviceDate: daysAgo(5), serviceName: 'Wednesday Midweek', recordedByUserId: volunteer3.id },
    { guestId: guest7.id, returnNumber: 3, serviceDate: daysAgo(3), serviceName: 'Sunday 11am', recordedByUserId: volunteer3.id },
  ];

  for (const ret of returnData) {
    await prisma.guestServiceReturn.create({ data: ret });
  }
  console.log('✅ Service returns created');

  // Create Follow-Up Activities
  const activities = [
    { guestId: guest1.id, performedByUserId: volunteer1.id, activityType: ActivityType.PHONE_CALL, activityDateTime: daysAgo(19), outcome: 'Connected', notes: 'Welcomed her, she was very warm. Invited her back next Sunday.', nextFollowUpDate: daysAgo(15) },
    { guestId: guest1.id, performedByUserId: volunteer1.id, activityType: ActivityType.WHATSAPP_MESSAGE, activityDateTime: daysAgo(15), outcome: 'Replied', notes: 'Sent midweek service details. She responded positively.' },
    { guestId: guest1.id, performedByUserId: volunteer1.id, activityType: ActivityType.INVITED_SMALL_GROUP, activityDateTime: daysAgo(8), outcome: 'Interested', notes: 'Invited to womens fellowship. She will attend this Friday.' },
    { guestId: guest2.id, performedByUserId: volunteer1.id, activityType: ActivityType.PHONE_CALL, activityDateTime: daysAgo(12), outcome: 'Voicemail', notes: 'Left voicemail. Will try again tomorrow.', nextFollowUpDate: daysAgo(11) },
    { guestId: guest2.id, performedByUserId: volunteer1.id, activityType: ActivityType.PHONE_CALL, activityDateTime: daysAgo(11), outcome: 'Connected', notes: 'Spoke with Emeka. He is looking for a church home. Prayed with him about job search.' },
    { guestId: guest3.id, performedByUserId: volunteer2.id, activityType: ActivityType.EMAIL, activityDateTime: daysAgo(5), outcome: 'Sent', notes: 'Sent welcome email with service schedule and small group info.', nextFollowUpDate: daysAgo(2) },
    { guestId: guest5.id, performedByUserId: volunteer2.id, activityType: ActivityType.PHONE_CALL, activityDateTime: daysAgo(28), outcome: 'Connected', notes: 'Warm welcome call. Very enthusiastic about the church.' },
    { guestId: guest5.id, performedByUserId: volunteer2.id, activityType: ActivityType.LUNCH_MEETING_PASTOR, activityDateTime: daysAgo(15), outcome: 'Met', notes: 'Lunch with Pastor David. Blessing is interested in membership. Pastor will follow up on Become class.' },
    { guestId: guest5.id, performedByUserId: volunteer2.id, activityType: ActivityType.ATTENDED_NEXT_SERVICE, activityDateTime: daysAgo(6), outcome: 'Attended', notes: 'Completed 7th return visit. Ready for Become enrollment.' },
    { guestId: guest6.id, performedByUserId: volunteer3.id, activityType: ActivityType.PHONE_CALL, activityDateTime: daysAgo(42), outcome: 'Connected', notes: 'Spoke briefly. He said he is exploring other churches.' },
    { guestId: guest6.id, performedByUserId: volunteer3.id, activityType: ActivityType.WHATSAPP_MESSAGE, activityDateTime: daysAgo(35), outcome: 'No reply', notes: 'Sent follow-up message. No response.' },
    { guestId: guest7.id, performedByUserId: volunteer3.id, activityType: ActivityType.PHONE_CALL, activityDateTime: daysAgo(8), outcome: 'Connected', notes: 'Folake is enjoying the services. Scheduled lunch with Pastor for next week.', nextFollowUpDate: daysAgo(1) },
    { guestId: guest7.id, performedByUserId: volunteer3.id, activityType: ActivityType.HOME_VISIT, activityDateTime: daysAgo(4), outcome: 'Met', notes: 'Visited Folake at home. Met her family. They are interested in family service.' },
  ];

  for (const act of activities) {
    await prisma.followUpActivity.create({ data: act });
  }
  console.log('✅ Activities created');

  // Create Notification Logs
  const notifications = [
    { guestId: guest1.id, toUserId: volunteer1.id, channel: NotificationChannel.EMAIL, status: NotificationStatus.SENT, payloadSnapshot: JSON.stringify({ guest: 'Chioma Obi', volunteer: 'Brother James' }), createdAt: daysAgo(20) },
    { guestId: guest1.id, toUserId: volunteer1.id, channel: NotificationChannel.WHATSAPP, status: NotificationStatus.SENT, payloadSnapshot: JSON.stringify({ guest: 'Chioma Obi', volunteer: 'Brother James' }), createdAt: daysAgo(20) },
    { guestId: guest3.id, toUserId: volunteer2.id, channel: NotificationChannel.EMAIL, status: NotificationStatus.SENT, createdAt: daysAgo(6) },
    { guestId: guest3.id, toUserId: volunteer2.id, channel: NotificationChannel.WHATSAPP, status: NotificationStatus.FAILED, errorMessage: 'Volunteer phone not registered on WhatsApp sandbox', createdAt: daysAgo(6) },
    { guestId: guest5.id, toUserId: volunteer2.id, channel: NotificationChannel.EMAIL, status: NotificationStatus.SENT, createdAt: daysAgo(29) },
    { guestId: guest5.id, toUserId: volunteer2.id, channel: NotificationChannel.WHATSAPP, status: NotificationStatus.SENT, createdAt: daysAgo(29) },
  ];

  for (const notif of notifications) {
    await prisma.notificationLog.create({ data: notif });
  }
  console.log('✅ Notifications created');

  // Create default notification settings
  const settings = [
    { key: 'notify_emails', value: 'churchadmin@gracelifecenter.com,pastor@gracelifecenter.com' },
    { key: 'notify_whatsapp', value: '+12023526018' },
    { key: 'notify_on_new_guest', value: 'true' },
    { key: 'notify_on_assignment', value: 'true' },
  ];

  for (const setting of settings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log('✅ Notification settings created');

  console.log('\n🎉 Seed completed!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Login credentials (all accounts):');
  console.log('  Password: password123');
  console.log('');
  console.log('  Admin:     admin@church.org');
  console.log('  Leader:    grace@church.org');
  console.log('  Volunteer: james@church.org');
  console.log('  Volunteer: faith@church.org');
  console.log('  Volunteer: samuel@church.org');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
