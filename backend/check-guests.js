const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Get the Lunch event ID
  const lunchEvent = await prisma.event.findFirst({
    where: { title: 'Lunch' },
  });

  if (!lunchEvent) {
    console.log('Lunch event not found');
    return;
  }

  console.log('Lunch event ID:', lunchEvent.id);

  // Get guests for this event
  const guests = await prisma.pairingGuest.findMany({
    where: { eventId: lunchEvent.id },
  });

  console.log(`\nFound ${guests.length} guests for Lunch event:`);
  guests.forEach((g) => {
    console.log(`- ${g.name} (${g.email || 'no email'}) - userId: ${g.userId}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
