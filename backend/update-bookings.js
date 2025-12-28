const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.booking.updateMany({
    where: {
      status: 'pending',
    },
    data: {
      status: 'confirmed',
    },
  });

  console.log(`Updated ${result.count} bookings from pending to confirmed`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
