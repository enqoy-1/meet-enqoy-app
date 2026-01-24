import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Seeding Rwanda assessment questions...');

        // Get country IDs
        const ethiopia = await prisma.country.findUnique({ where: { code: 'ET' } });
        const rwanda = await prisma.country.findUnique({ where: { code: 'RW' } });

        if (!ethiopia || !rwanda) {
            console.error('Countries not found (ET or RW missing).');
            return;
        }

        // Get existing Ethiopia questions
        const etQuestions = await prisma.assessmentQuestion.findMany({
            where: { countryId: ethiopia.id },
            orderBy: { order: 'asc' }
        });

        console.log(`Found ${etQuestions.length} questions for Ethiopia.`);

        if (etQuestions.length === 0) {
            console.log('No questions found for Ethiopia to clone.');
            return;
        }

        // Check if Rwanda already has questions to avoid duplicates
        const rwCount = await prisma.assessmentQuestion.count({
            where: { countryId: rwanda.id }
        });

        if (rwCount > 0) {
            console.log(`Rwanda already has ${rwCount} questions. Skipping seed to avoid duplicates.`);
            return; // Or allow force overwrite logic if requested
        }

        // Clone questions
        console.log('Cloning questions to Rwanda...');
        let count = 0;

        for (const q of etQuestions) {
            // Create new unique key
            // If key is "phone", make "rw_phone"
            // If key is "et_phone", make "rw_phone"
            let newKey = q.key;
            if (newKey.startsWith('et_')) {
                newKey = newKey.replace('et_', 'rw_');
            } else {
                newKey = `rw_${newKey}`;
            }

            // Ensure key doesn't exist (though it shouldn't if rwanda has 0 questions)
            const existing = await prisma.assessmentQuestion.findFirst({
                where: { key: newKey }
            });

            if (existing) {
                console.warn(`Question with key ${newKey} already exists. Skipping.`);
                continue;
            }

            await prisma.assessmentQuestion.create({
                data: {
                    key: newKey,
                    label: q.label,
                    type: q.type,
                    section: q.section,
                    order: q.order, // Preserve order
                    options: q.options as any,
                    isActive: q.isActive,
                    placeholder: q.placeholder,
                    countryId: rwanda.id
                }
            });
            count++;
        }

        console.log(`Successfully seeded ${count} questions for Rwanda.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
