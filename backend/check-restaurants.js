const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const eventId = 'cmk6yao14000212t5mnbwmip2';

    // Get event to make sure it exists
    const event = await prisma.event.findUnique({
        where: { id: eventId },
    });

    if (!event) {
        console.log('Event not found');
        return;
    }

    console.log(`Event found: ${event.title}`);

    // Get restaurants
    const restaurants = await prisma.pairingRestaurant.findMany({
        where: { eventId },
    });

    console.log(`\nFound ${restaurants.length} restaurants:`);
    restaurants.forEach(r => {
        console.log(`\nRestaurant: ${r.name}`);
        console.log(`Address: ${r.address || 'N/A'}`);
        console.log(`Google Maps URL: '${r.googleMapsUrl}' (Length: ${r.googleMapsUrl ? r.googleMapsUrl.length : 0})`);
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
