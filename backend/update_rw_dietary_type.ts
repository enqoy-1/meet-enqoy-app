import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const rwanda = await prisma.country.findUnique({ where: { code: 'RW' } });

    // Find the dietary question
    const question = await prisma.assessmentQuestion.findFirst({
        where: {
            countryId: rwanda?.id,
            key: { contains: 'dietary' }
        }
    });

    if (!question) {
        console.log("Question not found");
        return;
    }

    // Update type to checkbox
    await prisma.assessmentQuestion.update({
        where: { id: question.id },
        data: { type: 'checkbox' }
    });

    console.log("Updated dietary question type to checkbox");
}
main();
