const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdmin() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@enqoy.com' },
    include: { roles: true, profile: true }
  });

  console.log('Admin user:', JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}

checkAdmin();
