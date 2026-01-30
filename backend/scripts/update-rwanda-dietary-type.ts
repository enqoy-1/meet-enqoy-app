import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Finding Rwanda...");
    const rwanda = await prisma.country.findUnique({ where: { code: 'RW' } });

    if (!rwanda) {
        console.log("Rwanda country not found in DB.");
        return;
    }

    console.log("Finding Dietary Preferences question...");
    // Find the dietary question
    const question = await prisma.assessmentQuestion.findFirst({
        where: {
            countryId: rwanda.id,
            key: { contains: 'dietary' }
        }
    });

    if (!question) {
        console.log("Dietary question not found.");
        return;
    }

    console.log(`Found question: ${question.label} (Current Type: ${question.type})`);

    // Update type to checkbox
    await prisma.assessmentQuestion.update({
        where: { id: question.id },
        data: { type: 'checkbox' }
    });

    console.log("Successfully updated question type to 'checkbox'.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
