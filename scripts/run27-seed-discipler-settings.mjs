// Run 27 — seed the discipleship-team alert address for the /discipler page.
// CREATE-ONLY (Run 22 pattern): if the setting already exists — including a
// deliberately blanked one — re-running never clobbers it. The address is
// editable any time in Settings -> 🌱 Discipleship Tracks.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const KEY = 'discipler_team_email';
const DEFAULT_VALUE = 'pastor@gracelifecenter.com';

async function main() {
  const existing = await prisma.appSetting.findUnique({ where: { key: KEY } });
  if (existing) {
    console.log(`= ${KEY} already set ("${existing.value}") — left untouched`);
    return;
  }
  await prisma.appSetting.create({ data: { key: KEY, value: DEFAULT_VALUE } });
  console.log(`+ ${KEY} = ${DEFAULT_VALUE}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
