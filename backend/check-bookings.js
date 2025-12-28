const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    include: {
      user: {
        select: {
          email: true,
        },
      },
      event: {
        select: {
          title: true,
        },
      },
    },
  });

  console.log('Total bookings:', bookings.length);
  console.log('\nBookings by status:');
  bookings.forEach((b) => {
    console.log(`- ${b.user.email} | ${b.event.title} | Status: ${b.status}`);
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
