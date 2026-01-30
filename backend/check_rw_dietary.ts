import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const rwanda = await prisma.country.findUnique({ where: { code: 'RW' } });
    if (!rwanda) {
        console.log("Rwanda not found");
        return;
    }
    const questions = await prisma.assessmentQuestion.findMany({
        where: {
            countryId: rwanda.id,
            key: { contains: 'dietary' }
        }
    });
    console.log(JSON.stringify(questions, null, 2));
}
main();
