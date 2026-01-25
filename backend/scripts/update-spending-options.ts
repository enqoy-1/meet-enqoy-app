import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Updating spending question options...');

    // Get countries
    const ethiopia = await prisma.country.findUnique({ where: { code: 'ET' } });
    const rwanda = await prisma.country.findUnique({ where: { code: 'RW' } });

    if (!ethiopia || !rwanda) {
      console.error('Countries not found');
      return;
    }

    // Ethiopia spending options (ETB)
    const ethiopiaOptions = [
      { value: '500-1000', label: '500 - 1,000 ETB', scores: {} },
      { value: '1000-1500', label: '1,000 - 1,500 ETB', scores: {} },
      { value: '1500+', label: 'More than 1,500 ETB', scores: {} },
    ];

    // Rwanda spending options (RWF)
    const rwandaOptions = [
      { value: '5000-10000', label: '5,000 - 10,000 RWF', scores: {} },
      { value: '10000-20000', label: '10,000 - 20,000 RWF', scores: {} },
      { value: '20000+', label: 'More than 20,000 RWF', scores: {} },
    ];

    // Update Ethiopia spending question
    const etSpending = await prisma.assessmentQuestion.findFirst({
      where: {
        countryId: ethiopia.id,
        key: { contains: 'spending' }
      }
    });

    if (etSpending) {
      await prisma.assessmentQuestion.update({
        where: { id: etSpending.id },
        data: {
          label: 'How much do you usually spend on yourself when out with friends?',
          type: 'radio',
          options: ethiopiaOptions as any,
        }
      });
      console.log(`✅ Updated Ethiopia spending question (${etSpending.key})`);
    } else {
      console.log('⚠️ Ethiopia spending question not found');
    }

    // Update Rwanda spending question
    const rwSpending = await prisma.assessmentQuestion.findFirst({
      where: {
        countryId: rwanda.id,
        key: { contains: 'spending' }
      }
    });

    if (rwSpending) {
      await prisma.assessmentQuestion.update({
        where: { id: rwSpending.id },
        data: {
          label: 'How much do you usually spend on yourself when out with friends?',
          type: 'radio',
          options: rwandaOptions as any,
        }
      });
      console.log(`✅ Updated Rwanda spending question (${rwSpending.key})`);
    } else {
      console.log('⚠️ Rwanda spending question not found');
    }

    console.log('🎉 Done!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
