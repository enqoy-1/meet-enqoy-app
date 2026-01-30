import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Locating Rwanda...");
    const rwanda = await prisma.country.findUnique({ where: { code: 'RW' } });

    if (!rwanda) {
        console.log("Rwanda not found.");
        return;
    }

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

    console.log(`Found question: ${question.label}`);

    // Define the correct, clean options
    const correctOptions = [
        { label: "None", value: "none" },
        { label: "Vegan", value: "vegan" },
        { label: "Gluten-free", value: "gluten_free" },
        { label: "Other", value: "other" }
    ];

    // Update type to checkbox AND reset options
    await prisma.assessmentQuestion.update({
        where: { id: question.id },
        data: {
            type: 'checkbox',
            options: correctOptions
        }
    });

    console.log("Successfully reset options and type for Rwanda Dietary question.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
