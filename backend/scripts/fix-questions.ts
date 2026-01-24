import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Checking assessment questions...');
        const questions = await prisma.assessmentQuestion.findMany();
        console.log(`Found ${questions.length} total questions.`);

        const ethiopia = await prisma.country.findUnique({ where: { code: 'ET' } });
        if (!ethiopia) {
            console.error('Ethiopia not found! Run the app to seed countries first.');
            return;
        }

        const orphaned = questions.filter(q => !q.countryId);
        console.log(`Found ${orphaned.length} questions without countryId.`);

        if (orphaned.length > 0) {
            console.log(`Assigning ${orphaned.length} questions to Ethiopia (${ethiopia.id})...`);
            await prisma.assessmentQuestion.updateMany({
                where: {
                    countryId: null
                },
                data: {
                    countryId: ethiopia.id
                }
            });
            console.log('Fixed orphaned questions.');
        } else if (questions.length === 0) {
            console.log('No questions found. Seeding should happen on backend restart.');
            // Optionally we could force seed here, but restarting is cleaner to use the service logic
        } else {
            console.log('All questions have assigned countries. Data looks good.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
