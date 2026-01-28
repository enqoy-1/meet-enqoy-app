import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up duplicate/orphan assessment questions...');

  // These keys from old seed.ts don't match the actual Assessment.tsx flow
  // They should be deleted because no answers are ever saved for them
  const orphanKeys = [
    // Without prefix (from old seed.ts)
    'age',
    'gender',
    'relationship',
    'children',
    'city',
    'personality',
    'humor',
    'spending',
    'diet',
    'hobbies',
    'phone',
    // With country prefix - these don't match Assessment.tsx answer keys
    'et_personality',
    'rw_personality',
    'et_humor',
    'rw_humor',
    'et_diet',
    'rw_diet',
    'et_age',
    'rw_age',
    'et_relationship',
    'rw_relationship',
    'et_children',
    'rw_children',
    'et_city',
    'rw_city',
    'et_hobbies',
    'rw_hobbies',
    // Fun section questions - not asked in Assessment.tsx
    'et_nickName',
    'rw_nickName',
    'et_neverGuess',
    'rw_neverGuess',
    'et_funFact',
    'rw_funFact',
    'nickName',
    'neverGuess',
    'funFact',
  ];

  const deleted = await prisma.assessmentQuestion.deleteMany({
    where: {
      key: {
        in: orphanKeys,
      },
    },
  });

  console.log(`Deleted ${deleted.count} orphan questions`);
  console.log('Cleanup complete!');
}

main()
  .catch((e) => {
    console.error('Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
