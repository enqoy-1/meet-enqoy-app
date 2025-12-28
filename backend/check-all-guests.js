const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const guests = await prisma.pairingGuest.findMany();

  console.log('Total guests:', guests.length);
  guests.forEach((g) => {
    console.log(`- Event: ${g.eventId?.slice(0, 10) || 'none'}... | User: ${g.userId?.slice(0, 10) || 'none'}... | Name: ${g.name} | Email: ${g.email}`);
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
