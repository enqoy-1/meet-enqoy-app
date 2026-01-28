import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create countries
  const ethiopia = await prisma.country.upsert({
    where: { code: 'ET' },
    update: {
      phoneCode: '+251',
      mainCity: 'Addis Ababa',
    },
    create: {
      name: 'Ethiopia',
      code: 'ET',
      isActive: true,
      currency: 'Birr',
      phoneCode: '+251',
      mainCity: 'Addis Ababa',
    },
  });

  const rwanda = await prisma.country.upsert({
    where: { code: 'RW' },
    update: {
      phoneCode: '+250',
      mainCity: 'Kigali',
    },
    create: {
      name: 'Rwanda',
      code: 'RW',
      isActive: false,
      currency: 'RWF',
      phoneCode: '+250',
      mainCity: 'Kigali',
    },
  });
  console.log('✅ Created countries: Ethiopia (active), Rwanda (coming soon)');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@enqoy.com' },
    update: {},
    create: {
      email: 'admin@enqoy.com',
      password: adminPassword,
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'User',
          assessmentCompleted: true,
          countryId: ethiopia.id,
        },
      },
      roles: {
        create: {
          role: 'admin',
        },
      },
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create test users
  const testUsers = [];
  for (let i = 1; i <= 5; i++) {
    const password = await bcrypt.hash('password123', 10);
    const user = await prisma.user.upsert({
      where: { email: `user${i}@test.com` },
      update: {},
      create: {
        email: `user${i}@test.com`,
        password,
        profile: {
          create: {
            firstName: `Test`,
            lastName: `User${i}`,
            age: 25 + i,
            gender: i % 2 === 0 ? 'male' : 'female',
            city: 'San Francisco',
            assessmentCompleted: true,
            countryId: ethiopia.id,
          },
        },
        roles: {
          create: {
            role: 'user',
          },
        },
      },
    });
    testUsers.push(user);
  }
  console.log(`✅ Created ${testUsers.length} test users`);

  // Create venues
  const venue1 = await prisma.venue.upsert({
    where: { id: 'venue-1' },
    update: {},
    create: {
      id: 'venue-1',
      name: 'The Garden Restaurant',
      address: '123 Main St, San Francisco, CA',
      city: 'San Francisco',
      capacity: 50,
      googleMapsUrl: 'https://maps.google.com',
    },
  });

  const venue2 = await prisma.venue.upsert({
    where: { id: 'venue-2' },
    update: {},
    create: {
      id: 'venue-2',
      name: 'Rooftop Lounge',
      address: '456 Market St, San Francisco, CA',
      city: 'San Francisco',
      capacity: 30,
      googleMapsUrl: 'https://maps.google.com',
    },
  });
  console.log('✅ Created venues');

  // Create events
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const event1 = await prisma.event.create({
    data: {
      title: 'Summer Dinner Party',
      description: 'Join us for an evening of great food and conversation',
      eventType: 'dinner',
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000),
      price: '45.00',
      capacity: 20,
      isVisible: true,
      venueId: venue1.id,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: 'Networking Lunch',
      description: 'Connect with professionals over lunch',
      eventType: 'lunch',
      startTime: nextWeek,
      endTime: new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000),
      price: '35.00',
      capacity: 15,
      isVisible: true,
      venueId: venue2.id,
    },
  });
  console.log('✅ Created events');

  // Note: Assessment questions are seeded by the AssessmentsService.onModuleInit()
  // with country-specific prefixes (et_*, rw_*). Don't duplicate them here.
  console.log('ℹ️ Assessment questions are seeded by AssessmentsService on startup');

  // Create icebreaker questions
  const icebreakers = [
    'If you could have dinner with anyone, living or dead, who would it be?',
    'What is your favorite travel destination?',
    'What is one thing on your bucket list?',
    'If you could have any superpower, what would it be?',
    'What is your favorite book or movie?',
    'What is something most people don\'t know about you?',
    'If you could live in any era, which would you choose?',
    'What is your go-to karaoke song?',
    'What is the best advice you\'ve ever received?',
    'If you could master any skill instantly, what would it be?',
  ];

  for (const question of icebreakers) {
    await prisma.icebreakerQuestion.create({
      data: {
        question,
        isActive: true,
      },
    });
  }
  console.log(`✅ Created ${icebreakers.length} icebreaker questions`);

  // Create an announcement
  await prisma.announcement.create({
    data: {
      title: 'Welcome to Enqoy!',
      message: 'We\'re excited to have you join our community. Check out our upcoming events!',
      isActive: true,
      priority: 1,
    },
  });
  console.log('✅ Created announcement');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
