const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const eventId = 'cmk6yao14000212t5mnbwmip2';

    // Get all venues
    const venues = await prisma.venue.findMany();
    console.log(`Found ${venues.length} venues in the system.`);

    // Get restaurants for the event
    const restaurants = await prisma.pairingRestaurant.findMany({
        where: { eventId },
    });
    console.log(`Found ${restaurants.length} restaurants for the event.`);

    for (const restaurant of restaurants) {
        if (!restaurant.googleMapsUrl) {
            // Find matching venue by name
            const venue = venues.find(v => v.name.toLowerCase() === restaurant.name.toLowerCase());

            if (venue && venue.googleMapsUrl) {
                console.log(`Updating restaurant "${restaurant.name}" with URL from venue: ${venue.googleMapsUrl}`);

                await prisma.pairingRestaurant.update({
                    where: { id: restaurant.id },
                    data: { googleMapsUrl: venue.googleMapsUrl },
                });
            } else {
                console.log(`No matching venue or URL found for restaurant "${restaurant.name}"`);
                // Fallback: If name is generic like "Test Restaurant", maybe we can find ANY venue? No, unsafe.
            }
        } else {
            console.log(`Restaurant "${restaurant.name}" already has a URL.`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
