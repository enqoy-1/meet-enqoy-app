const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateLegacyUsers() {
    console.log('🔄 Updating legacy users to have LEGACY_NO_PASSWORD...\n');

    // Find all users with bcrypt passwords (except admin)
    const users = await prisma.user.findMany({
        where: {
            password: {
                startsWith: '$2b$10$'
            },
            email: {
                not: 'admin@enqoy.com'  // Don't update admin
            }
        },
        include: {
            profile: true
        }
    });

    console.log(`Found ${users.length} users with bcrypt passwords (excluding admin)\n`);

    if (users.length === 0) {
        console.log('No users to update.');
        return;
    }

    // Show users that will be updated
    console.log('Users to update:');
    users.forEach(u => {
        console.log(`  - ${u.email} (${u.profile?.firstName} ${u.profile?.lastName})`);
    });
    console.log('');

    // Update all of them to LEGACY_NO_PASSWORD
    const result = await prisma.user.updateMany({
        where: {
            password: {
                startsWith: '$2b$10$'
            },
            email: {
                not: 'admin@enqoy.com'
            }
        },
        data: {
            password: 'LEGACY_NO_PASSWORD'
        }
    });

    console.log(`✅ Updated ${result.count} users to LEGACY_NO_PASSWORD`);
    console.log('\nThese users can now:');
    console.log('  1. Try to login → Will see "Welcome back" message');
    console.log('  2. Go to Sign Up tab → Create a password');
    console.log('  3. Login with their new password');
}

updateLegacyUsers()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error('Error:', e);
        prisma.$disconnect();
        process.exit(1);
    });
