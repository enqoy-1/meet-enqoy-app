const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignAdminRole() {
  // Get the first user (assuming it's you)
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    include: { roles: true }
  });

  if (!user) {
    console.log('No users found');
    return;
  }

  console.log(`User: ${user.email}`);
  console.log(`Current roles:`, user.roles);

  // Check if user already has admin role
  const hasAdminRole = user.roles.some(r => r.role === 'admin' || r.role === 'super_admin');

  if (hasAdminRole) {
    console.log('User already has admin role!');
  } else {
    // Assign admin role
    await prisma.userRole.create({
      data: {
        userId: user.id,
        role: 'admin'
      }
    });
    console.log('✅ Admin role assigned successfully!');
  }

  await prisma.$disconnect();
}

assignAdminRole().catch(console.error);
