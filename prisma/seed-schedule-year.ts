import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.scheduleYear.upsert({
    where: { year: 2026 },
    update: {},
    create: {
      year: 2026,
      label: '2026 Sunday Schedule',
      theme: 'Bringing In The Harvest — Matt. 9:35–38 · John 4:35–37 · Psalm 126:6',
      archived: false,
    },
  })
  console.log('✅ Seeded ScheduleYear 2026')
}

main().catch(console.error).finally(() => prisma.$disconnect())
