import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const rwanda = await prisma.country.findUnique({ where: { code: 'RW' } });
    const questions = await prisma.assessmentQuestion.findFirst({
        where: {
            countryId: rwanda?.id,
            key: { contains: 'dietary' }
        }
    });
    console.log("Type:", questions?.type);
}
main();
