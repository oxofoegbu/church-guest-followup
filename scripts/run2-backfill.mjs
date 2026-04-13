// Run 2 backfill: seed default GLC template if missing; backfill orderCustomized.
// Usage: node scripts/run2-backfill.mjs
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const GLC_DEFAULT_ITEMS = [
  { id: 'sec-1', type: 'section', title: 'PRE-SERVICE' },
  { id: 'itm-1', type: 'item', time: '08:45', title: 'Prayer & soundcheck', durationMin: 15 },
  { id: 'sec-2', type: 'section', title: 'WORSHIP' },
  { id: 'itm-2', type: 'item', time: '09:00', title: 'Opening worship', durationMin: 25 },
  { id: 'itm-3', type: 'item', time: '09:25', title: 'Welcome & announcements', durationMin: 5 },
  { id: 'sec-3', type: 'section', title: 'WORD' },
  { id: 'itm-4', type: 'item', time: '09:30', title: 'Scripture reading', durationMin: 5 },
  { id: 'itm-5', type: 'item', time: '09:35', title: 'Sermon', durationMin: 40 },
  { id: 'sec-4', type: 'section', title: 'RESPONSE' },
  { id: 'itm-6', type: 'item', time: '10:15', title: 'Altar call & prayer', durationMin: 15 },
  { id: 'itm-7', type: 'item', time: '10:30', title: 'Closing worship & benediction', durationMin: 10 },
];

async function main() {
  const existing = await prisma.orderOfServiceTemplate.findFirst({ where: { isDefault: true } });
  if (!existing) {
    await prisma.orderOfServiceTemplate.create({
      data: { name: 'GLC Default', items: GLC_DEFAULT_ITEMS, isDefault: true },
    });
    console.log('✓ Seeded GLC Default template');
  } else {
    console.log('✓ Default template already exists:', existing.name);
  }

  // Backfill: any ServiceSchedule with non-null orderOfService gets orderCustomized=true
  // (safe default; admins can re-apply template to reset flag)
  const customized = await prisma.serviceSchedule.updateMany({
    where: { orderOfService: { not: null }, orderCustomized: false },
    data: { orderCustomized: true },
  });
  console.log(`✓ Marked ${customized.count} existing schedules with OoS as customized`);

  const total = await prisma.serviceSchedule.count();
  const custCount = await prisma.serviceSchedule.count({ where: { orderCustomized: true } });
  console.log(`Summary: ${custCount}/${total} schedules flagged customized`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
