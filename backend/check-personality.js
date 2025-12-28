const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const eventId = 'cmjo0z1o30003jiug3fmc0sj0';

  const guests = await prisma.pairingGuest.findMany({
    where: { eventId },
    select: { id: true, name: true, personality: true, age: true, gender: true }
  });

  console.log(`Total guests for event: ${guests.length}`);
  const withPersonality = guests.filter(g => g.personality);
  console.log(`Guests with personality data: ${withPersonality.length}`);
  const withoutPersonality = guests.filter(g => !g.personality);
  console.log(`Guests without personality data: ${withoutPersonality.length}`);

  if (withPersonality.length > 0) {
    console.log('\nSample guest with personality:');
    console.log('Name:', withPersonality[0].name);
    console.log('Age:', withPersonality[0].age);
    console.log('Gender:', withPersonality[0].gender);
    console.log('Personality:', JSON.stringify(withPersonality[0].personality, null, 2));
  }

  if (withoutPersonality.length > 0) {
    console.log('\nSample guest WITHOUT personality:');
    console.log('Name:', withoutPersonality[0].name);
    console.log('Age:', withoutPersonality[0].age);
    console.log('Gender:', withoutPersonality[0].gender);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
