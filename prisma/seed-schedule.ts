import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const THEMES: Record<number, string> = {
  1:  'THE LAW OF THE HARVEST — Unpacking the mystery / principle of Harvest',
  2:  'SOWING IN TEARS, REAPING WITH JOY — God turns tears into testimony (When Zion travails)',
  3:  'THE GREAT HARVEST OF SOULS — What shall we give in exchange for souls?',
  4:  'THE GREAT HARVEST OF CHRISTLIKENESS — The Spirit forms Christ in Us before fruit flows through us',
  5:  'FAITH IN THE LORD OF THE HARVEST — Reigning with Christ in every season',
  6:  'STEPPING INTO YOUR SEASON OF HARVEST — Recognizing our opportunities for harvest',
  7:  'LABORERS TOGETHER IN GOD\'S FIELD — Faithful co-workers with God',
  8:  'GOING INTO OUR MISSION FIELD — Connecting with the CRM Vision & Mission',
  9:  'THE SHEAVES OF HARVEST — Our Family Relationships',
  10: 'THAT THE FRUIT OF THE HARVEST MAY LAST — The perseverance of the great harvest',
  11: 'THE FINAL HARVEST — Living with the end in view',
  12: 'THE CELEBRATION OF HARVEST — The joy of gathering in the harvest',
}

const scheduleData = [
  // ── JANUARY ────────────────────────────────────────────────────────
  {
    date: new Date('2026-01-04T00:00:00.000Z'),
    monthTheme: THEMES[1],
    topic: 'New Seeds, New Beginnings: Sow Today, Change Tomorrow (Galatians 6:7–9; Genesis 8:22; Ecclesiastes 11:6)',
    speakerName: 'Okezie Ofoegbu',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-01-11T00:00:00.000Z'),
    monthTheme: THEMES[1],
    topic: 'The Harvest of Souls Starts with Compassion: Seeing People the Way Jesus Sees (Matt 9:36–38; Luke 15:1-10; Luke 19:1-10)',
    speakerName: 'Okezie Ofoegbu',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-01-18T00:00:00.000Z'),
    monthTheme: THEMES[1],
    topic: 'The Day Righteousness Will Shine: The Harvest that Heals the World (Matthew 13:24-30, 36-43)',
    speakerName: 'Peter Ezekwenna',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-01-25T00:00:00.000Z'),
    monthTheme: THEMES[1],
    topic: 'Teach Us to Pray: Prayer That Moves the Lord of the Harvest (Matthew 9:35–38; Luke 11:1-4)',
    speakerName: 'Okezie Ofoegbu',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },

  // ── FEBRUARY ───────────────────────────────────────────────────────
  {
    date: new Date('2026-02-01T00:00:00.000Z'),
    monthTheme: THEMES[2],
    topic: 'Sowing in Tears, Reaping in Joy: Compassion That Opens Heaven (Matt. 9:36; Psalm 56:9; Psalm 126:5–6)',
    speakerName: 'Felix Chima',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-02-08T00:00:00.000Z'),
    monthTheme: THEMES[2],
    topic: 'Break Up the Fallow Ground: Make Your Heart Ready for God\'s Seed (Hosea 10:12)',
    speakerName: 'Felix Oghanrandukun',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-02-15T00:00:00.000Z'),
    monthTheme: THEMES[2],
    topic: 'The Hidden Harvest of Faithfulness: God Sees What\'s Done in Secret (Luke 12:42–48; Isaiah 50:10; Matthew 6:4)',
    speakerName: 'Dominic Onwukwe',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-02-22T00:00:00.000Z'),
    monthTheme: THEMES[2],
    topic: 'Go Up to the Mountains: Reaping More Than We Sow (Haggai 1:7–9)',
    speakerName: 'Okezie Ofoegbu',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },

  // ── MARCH ──────────────────────────────────────────────────────────
  {
    date: new Date('2026-03-01T00:00:00.000Z'),
    monthTheme: THEMES[3],
    topic: 'Seminar Sunday: Your Personal Soul‑Winning Plan — Practical & Workable (Prov. 11:30)',
    speakerName: 'TBD',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-03-08T00:00:00.000Z'),
    monthTheme: THEMES[3],
    topic: 'The Andrew Invitation: Bringing Loved Ones to Jesus (John 1:41–46)',
    speakerName: 'Chinelo Phillips',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-03-15T00:00:00.000Z'),
    monthTheme: THEMES[3],
    topic: 'Marketplace Apostles: Taking the Gospel Beyond the Building (Col. 3:23; Acts 17:17; Amos 5:12–15)',
    speakerName: 'Joshua Shodunke',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-03-22T00:00:00.000Z'),
    monthTheme: THEMES[3],
    topic: 'Young Adults Sunday: Alive for a Purpose',
    speakerName: 'Young Adults',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-03-29T00:00:00.000Z'),
    monthTheme: THEMES[3],
    topic: 'Holy Love, Holy Life: Holiness That Makes the Gospel Beautiful (Hebrews 12:14; Isaiah 1:16–17; 1 Peter 1:15–16; Psalm 24:3–6)',
    speakerName: 'Okezie Ofoegbu',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },

  // ── APRIL ──────────────────────────────────────────────────────────
  {
    date: new Date('2026-04-05T00:00:00.000Z'),
    monthTheme: THEMES[4],
    topic: 'EASTER SUNDAY SERVICE: THE RESURRECTED JESUS — THE FIRSTFRUIT OF THE GREAT HARVEST',
    speakerName: 'TBD',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-04-12T00:00:00.000Z'),
    monthTheme: THEMES[4],
    topic: 'Grace Trains Us: How Grace Re‑Seeds Your Life (Titus 2:11–12; Romans 6:1–4; Hebrews 12:10–11)',
    speakerName: 'Peter Ezekwenna',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-04-19T00:00:00.000Z'),
    monthTheme: THEMES[4],
    topic: 'The Slow Work of God: The Long Walk into Christlikeness (Galatians 4:9; Colossians 2:6–7; James 5:7–8)',
    speakerName: 'Okezie Ofoegbu',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-04-26T00:00:00.000Z'),
    monthTheme: THEMES[4],
    topic: 'Small Steps, Big Change: Becoming Who God Made You to Be (Romans 8:29; Luke 16:10; Psalm 24:3–6)',
    speakerName: 'Dominic Onwukwe',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },

  // ── MAY ────────────────────────────────────────────────────────────
  {
    date: new Date('2026-05-03T00:00:00.000Z'),
    monthTheme: THEMES[5],
    topic: 'Making Room for the Spirit: Presence That Produces Fruit (Romans 5:17; Luke 10:41–42)',
    speakerName: 'Kemi Asahaiah',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-05-10T00:00:00.000Z'),
    monthTheme: THEMES[5],
    topic: 'Women & Mothers Day: Honoring the Women of Faith',
    speakerName: 'TBD',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-05-17T00:00:00.000Z'),
    monthTheme: THEMES[5],
    topic: 'Even Now, I Know: Faith When It Feels Too Late (Romans 8:28; John 11:22; Mark 4:26–29)',
    speakerName: 'Okezie Ofoegbu',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-05-24T00:00:00.000Z'),
    monthTheme: THEMES[5],
    topic: 'PENTECOST SUNDAY: And You Shall Receive Power (Acts 1:8)',
    speakerName: 'TBD',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-05-31T00:00:00.000Z'),
    monthTheme: THEMES[5],
    topic: 'Seminar Sunday: Experiencing Harvest in Business & Finances',
    speakerName: 'TBD',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },

  // ── JUNE ───────────────────────────────────────────────────────────
  {
    date: new Date('2026-06-07T00:00:00.000Z'),
    monthTheme: THEMES[6],
    topic: 'This Is Your Harvest Season: Discerning Divine Times & Seasons (Ecclesiastes 3:1; Amos 9:13; 1 Chron 12:32)',
    speakerName: 'Dominic Onwukwe',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-06-14T00:00:00.000Z'),
    monthTheme: THEMES[6],
    topic: "Men & Father's Day: Fathers Who Leave a Legacy",
    speakerName: 'TBD',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-06-21T00:00:00.000Z'),
    monthTheme: THEMES[6],
    topic: "Young Adults Sunday: Don't Miss Your Moment (Redeeming the Time)",
    speakerName: 'Young Adults',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-06-28T00:00:00.000Z'),
    monthTheme: THEMES[6],
    topic: 'Worship Sunday: Reaping Through Praise / Church Picnic',
    speakerName: 'TBD',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },

  // ── JULY ───────────────────────────────────────────────────────────
  {
    date: new Date('2026-07-05T00:00:00.000Z'),
    monthTheme: THEMES[7],
    topic: 'Here I Am—Send Me: The Heart That Sees Harvest (Isaiah 6:8)',
    speakerName: 'Felix Chima',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-07-12T00:00:00.000Z'),
    monthTheme: THEMES[7],
    topic: 'Paul Plants, Apollos Waters: Partners in God\'s Harvest (1 Corinthians 3:16)',
    speakerName: 'Josephine Oghanrandukun',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-07-19T00:00:00.000Z'),
    monthTheme: THEMES[7],
    topic: 'Hands That Carry Fire: The Word God Confirms with Power (Mark 16:20; 1 Corinthians 2:4–5)',
    speakerName: 'Joshua Shodunke',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-07-26T00:00:00.000Z'),
    monthTheme: THEMES[7],
    topic: 'Keep Showing Up: Consistency That Produces a Harvest (Isaiah 58:10–11; Galatians 6:9; 1 Corinthians 15:58)',
    speakerName: 'Peter Ezekwenna',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },

  // ── AUGUST ─────────────────────────────────────────────────────────
  {
    date: new Date('2026-08-02T00:00:00.000Z'),
    monthTheme: THEMES[8],
    topic: 'NATIONAL CONFERENCE',
    speakerName: 'TBD',
    serviceCoordinatorName: null,
    propheticPrayerName: null,
    worshipLeaderName: null,
    notes: 'National Conference weekend',
  },
  {
    date: new Date('2026-08-09T00:00:00.000Z'),
    monthTheme: THEMES[8],
    topic: 'The Fields Are Ready: Move with What God Is Doing (John 4:35)',
    speakerName: 'Felix Oghanrandukun',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-08-16T00:00:00.000Z'),
    monthTheme: THEMES[8],
    topic: 'Plowing Your Field: Stewarding Your God‑Given Assignment (Luke 13:6–9; Ephesians 4:11–16; Matthew 25:14–30)',
    speakerName: 'Kemi Asahiah',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-08-23T00:00:00.000Z'),
    monthTheme: THEMES[8],
    topic: 'Preach the Word: The Urgency of Now (John 9:4; 2 Timothy 4:1–5; 1 Peter 3:15)',
    speakerName: 'Felix Chima',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-08-30T00:00:00.000Z'),
    monthTheme: THEMES[8],
    topic: 'Seminar Sunday: FLOPA — Our Charismatic Vision & Mission',
    speakerName: 'TBD',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },

  // ── SEPTEMBER ──────────────────────────────────────────────────────
  {
    date: new Date('2026-09-06T00:00:00.000Z'),
    monthTheme: THEMES[9],
    topic: 'The "Right Person" Myth: Become the Right Person To Find the Right Person (1 Corinthians 13; Romans 12:1–4; Matthew 7:12)',
    speakerName: 'Okezie Ofoegbu',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-09-13T00:00:00.000Z'),
    monthTheme: THEMES[9],
    topic: 'Passing Faith Forward: Raising Disciples at Home (Proverbs 22:6; Psalm 78:4–7; Deuteronomy 6:6–7; Ephesians 6:4)',
    speakerName: 'Rita Chima',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-09-20T00:00:00.000Z'),
    monthTheme: THEMES[9],
    topic: 'Young Adults Sunday: Love, Dating & Wisdom',
    speakerName: 'Young Adults',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-09-27T00:00:00.000Z'),
    monthTheme: THEMES[9],
    topic: "When Dreams Don't Come True: Healing After Broken Relationships (1 Corinthians 7:10–14; Psalm 147:3; Psalm 34:18)",
    speakerName: 'Okezie Ofoegbu',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },

  // ── OCTOBER ────────────────────────────────────────────────────────
  {
    date: new Date('2026-10-04T00:00:00.000Z'),
    monthTheme: THEMES[10],
    topic: 'Abiding in Him: The Secret of Lasting Fruit (John 15:1–8, 16; 1 Timothy 4:7–8)',
    speakerName: 'Peter Ezekwenna',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-10-11T00:00:00.000Z'),
    monthTheme: THEMES[10],
    topic: 'The Finger of God: Deliverance from Strong Enemies (Luke 11:20; 2 Samuel 22:18)',
    speakerName: 'Okezie Ofoegbu',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-10-18T00:00:00.000Z'),
    monthTheme: THEMES[10],
    topic: 'Disciples Who Make Disciples: Multiplication That Preserves the Harvest (2 Timothy 2:2; Matthew 28:19-20)',
    speakerName: 'Felix Oghanrandukun',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-10-25T00:00:00.000Z'),
    monthTheme: THEMES[10],
    topic: 'What Will Remain After the Fire: The Building That Lasts (1 Corinthians 3:13–15)',
    speakerName: 'Dominic Onwukwe',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },

  // ── NOVEMBER ───────────────────────────────────────────────────────
  {
    date: new Date('2026-11-01T00:00:00.000Z'),
    monthTheme: THEMES[11],
    topic: 'The Final Harvest: Gathering All Things in Christ (Ephesians 1:9–10; Colossians 1:15–20)',
    speakerName: 'Okezie Ofoegbu',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-11-08T00:00:00.000Z'),
    monthTheme: THEMES[11],
    topic: 'What Will It Profit?: Living with Eternity in View (Ecclesiastes 12:13–14; Matthew 6:19–21; Mark 8:35–37)',
    speakerName: 'Peter Ezekwenna',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-11-15T00:00:00.000Z'),
    monthTheme: THEMES[11],
    topic: 'The Practice of Readiness: Living Prepared for His Coming (Matthew 25:1–13; Romans 14:12)',
    speakerName: 'Felix Chima',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-11-22T00:00:00.000Z'),
    monthTheme: THEMES[11],
    topic: 'Behold, I Make All Things New: Restoration Is Coming (Revelation 21:1–4; Isaiah 65:17–19; 1 Peter 3:13)',
    speakerName: 'Okezie Ofoegbu',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-11-29T00:00:00.000Z'),
    monthTheme: THEMES[11],
    topic: "Seminar Sunday: As In the Days of Noah — Understanding Jesus' Teaching on The Last Days",
    speakerName: 'TBD',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },

  // ── DECEMBER ───────────────────────────────────────────────────────
  {
    date: new Date('2026-12-06T00:00:00.000Z'),
    monthTheme: THEMES[12],
    topic: 'See What the Lord Has Done: Joyful Redemption (Psalm 126:1–3)',
    speakerName: 'Okezie Ofoegbu',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-12-13T00:00:00.000Z'),
    monthTheme: THEMES[12],
    topic: 'The Path of the Just: Your Best Is Yet to Come (Prov. 4:18; Isaiah 43:18–19; Proverbs 4:18)',
    speakerName: 'Felix Chima',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-12-20T00:00:00.000Z'),
    monthTheme: THEMES[12],
    topic: 'Young Adults Sunday: Christmas Carol Service',
    speakerName: 'Young Adults',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
  {
    date: new Date('2026-12-27T00:00:00.000Z'),
    monthTheme: THEMES[12],
    topic: 'The Joy of the Lord: Strength for the Season Ahead (Nehemiah 8:10)',
    speakerName: 'Felix Chima',
    serviceCoordinatorName: 'Coordination Team',
    propheticPrayerName: 'Prayer Team',
    worshipLeaderName: null,
  },
]

async function main() {
  console.log('🌱 Seeding 2026 Service Schedule...')

  // Wipe existing 2026 data only
  const deleted = await prisma.serviceSchedule.deleteMany({
    where: {
      date: {
        gte: new Date('2026-01-01'),
        lte: new Date('2026-12-31'),
      },
    },
  })
  console.log(`   Cleared ${deleted.count} existing 2026 records`)

  let count = 0
  for (const item of scheduleData) {
    await prisma.serviceSchedule.create({ data: item })
    count++
  }

  console.log(`✅ Seeded ${count} service schedules for 2026`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
