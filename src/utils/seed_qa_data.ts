import { supabase } from '@/integrations/supabase/client';

/**
 * Seed QA Data for Testing
 * 
 * Creates:
 * - 12 QA users (personas)
 * - 6 Venues
 * - 10 Events (within 21 days, specific types)
 * - 40 Icebreaker questions
 */

const QA_USERS = [
    { email: 'qa_user_1@enqoy.test', full_name: 'Alex Johnson', gender: 'male', age: 28 },
    { email: 'qa_user_2@enqoy.test', full_name: 'Sarah Williams', gender: 'female', age: 32 },
    { email: 'qa_user_3@enqoy.test', full_name: 'Michael Chen', gender: 'male', age: 25 },
    { email: 'qa_user_4@enqoy.test', full_name: 'Emily Davis', gender: 'female', age: 29 },
    { email: 'qa_user_5@enqoy.test', full_name: 'James Martinez', gender: 'male', age: 35 },
    { email: 'qa_user_6@enqoy.test', full_name: 'Jessica Brown', gender: 'female', age: 27 },
    { email: 'qa_user_7@enqoy.test', full_name: 'David Wilson', gender: 'male', age: 31 },
    { email: 'qa_user_8@enqoy.test', full_name: 'Lisa Anderson', gender: 'female', age: 26 },
    { email: 'qa_user_9@enqoy.test', full_name: 'Robert Taylor', gender: 'male', age: 33 },
    { email: 'qa_user_10@enqoy.test', full_name: 'Maria Garcia', gender: 'female', age: 30 },
    { email: 'qa_user_11@enqoy.test', full_name: 'Christopher Lee', gender: 'male', age: 28 },
    { email: 'qa_user_12@enqoy.test', full_name: 'Amanda White', gender: 'female', age: 34 },
];

const QA_VENUES = [
    { name: 'The Garden Bistro', address: 'Bole Road, Addis Ababa', google_maps_link: 'https://maps.google.com/?q=The+Garden+Bistro+Addis' },
    { name: 'Skyline Lounge', address: 'Kazanchis, Addis Ababa', google_maps_link: 'https://maps.google.com/?q=Skyline+Lounge+Addis' },
    { name: 'Riverside Cafe', address: 'Megenagna, Addis Ababa', google_maps_link: 'https://maps.google.com/?q=Riverside+Cafe+Addis' },
    { name: 'Urban Kitchen', address: 'CMC Road, Addis Ababa', google_maps_link: 'https://maps.google.com/?q=Urban+Kitchen+Addis' },
    { name: 'Sunset Terrace', address: 'Sarbet, Addis Ababa', google_maps_link: 'https://maps.google.com/?q=Sunset+Terrace+Addis' },
    { name: 'The Meeting Place', address: 'Old Airport, Addis Ababa', google_maps_link: 'https://maps.google.com/?q=The+Meeting+Place+Addis' },
];

const QA_ICEBREAKERS = [
    'What\'s the most adventurous thing you\'ve ever done?',
    'If you could have dinner with anyone, dead or alive, who would it be?',
    'What\'s a skill you\'d love to learn?',
    'What\'s your favorite way to spend a weekend?',
    'If you could live anywhere in the world, where would it be?',
    'What\'s the best book you\'ve read recently?',
    'What\'s your go-to karaoke song?',
    'If you could master any instrument, what would it be?',
    'What\'s the most interesting place you\'ve traveled to?',
    'What\'s your favorite childhood memory?',
    'If you could have any superpower, what would it be?',
    'What\'s the best advice you\'ve ever received?',
    'What\'s your favorite type of cuisine?',
    'If you could switch careers, what would you do?',
    'What\'s something you\'re passionate about?',
    'What\'s the most spontaneous thing you\'ve ever done?',
    'If you could time travel, would you go to the past or future?',
    'What\'s your favorite movie of all time?',
    'What\'s a hobby you\'ve always wanted to try?',
    'If you could learn any language instantly, which would it be?',
    'What\'s the best concert you\'ve ever been to?',
    'What\'s your favorite season and why?',
    'If you could have any animal as a pet, what would it be?',
    'What\'s the most memorable meal you\'ve ever had?',
    'What\'s your favorite way to relax?',
    'If you could be famous for something, what would it be?',
    'What\'s the best gift you\'ve ever received?',
    'What\'s your favorite thing about your hometown?',
    'If you could change one thing about the world, what would it be?',
    'What\'s the most challenging thing you\'ve overcome?',
    'What\'s your favorite podcast or YouTube channel?',
    'If you could have dinner at any restaurant, where would it be?',
    'What\'s something that always makes you laugh?',
    'What\'s your favorite way to stay active?',
    'If you could witness any historical event, what would it be?',
    'What\'s the best piece of technology you own?',
    'What\'s your favorite holiday tradition?',
    'If you could start a business, what would it be?',
    'What\'s the most beautiful place you\'ve ever seen?',
    'What\'s one thing you want to accomplish this year?',
];

export async function seedQAData() {
    console.log('🌱 Starting QA data seeding...');

    try {
        // 1. Seed Venues
        console.log('📍 Seeding venues...');
        const { data: venues, error: venuesError } = await supabase
            .from('venues')
            .upsert(QA_VENUES, { onConflict: 'name' })
            .select();

        if (venuesError) throw venuesError;
        console.log(`✅ Created ${venues?.length} venues`);

        // 2. Seed Events (10 events within 21 days)
        console.log('📅 Seeding events...');
        const now = new Date();
        const events: Array<{
            title: string;
            type: 'dinner' | 'lunch' | 'scavenger_hunt' | 'mixer' | 'other';
            days_offset: number;
            price: number;
        }> = [
                { title: 'Thursday Dinner - Week 1', type: 'dinner', days_offset: 2, price: 500 },
                { title: 'Saturday Lunch - Week 1', type: 'lunch', days_offset: 4, price: 400 },
                { title: 'Thursday Dinner - Week 2', type: 'dinner', days_offset: 9, price: 500 },
                { title: 'Saturday Lunch - Week 2', type: 'lunch', days_offset: 11, price: 400 },
                { title: 'Thursday Dinner - Week 3', type: 'dinner', days_offset: 16, price: 500 },
                { title: 'Saturday Lunch - Week 3', type: 'lunch', days_offset: 18, price: 400 },
                { title: 'Special Mixer Event', type: 'mixer', days_offset: 7, price: 600 },
                { title: 'Weekend Brunch', type: 'lunch', days_offset: 5, price: 450 },
                { title: 'Networking Dinner', type: 'dinner', days_offset: 12, price: 550 },
                { title: 'Scavenger Hunt Adventure', type: 'scavenger_hunt', days_offset: 14, price: 350 },
            ];

        const eventsToInsert = events.map((event, index) => {
            const eventDate = new Date(now);
            eventDate.setDate(eventDate.getDate() + event.days_offset);

            // Set time based on type
            if (event.type === 'dinner') {
                eventDate.setHours(19, 0, 0, 0); // 7 PM
            } else {
                eventDate.setHours(14, 0, 0, 0); // 2 PM
            }

            return {
                title: event.title,
                type: event.type,
                description: `QA Test Event - ${event.title}`,
                date_time: eventDate.toISOString(),
                price: event.price,
                venue_id: venues?.[index % venues.length]?.id || null,
                is_visible: true,
            };
        });

        const { data: createdEvents, error: eventsError } = await supabase
            .from('events')
            .insert(eventsToInsert)
            .select();

        if (eventsError) throw eventsError;
        console.log(`✅ Created ${createdEvents?.length} events`);

        // 3. Seed Icebreaker Questions
        console.log('❓ Seeding icebreaker questions...');
        const icebreakerQuestions = QA_ICEBREAKERS.map((question) => ({
            question_text: question,
            is_active: true,
        }));

        const { data: icebreakers, error: icebreakersError } = await supabase
            .from('icebreaker_questions')
            .insert(icebreakerQuestions)
            .select();

        if (icebreakersError) throw icebreakersError;
        console.log(`✅ Created ${icebreakers?.length} icebreaker questions`);

        // 4. Note about users
        console.log('👥 Note: QA users must be created via Supabase Auth');
        console.log('   User emails:', QA_USERS.map(u => u.email).join(', '));

        console.log('🎉 QA data seeding completed successfully!');
        return {
            success: true,
            venues: venues?.length || 0,
            events: createdEvents?.length || 0,
            icebreakers: icebreakers?.length || 0,
        };
    } catch (error) {
        console.error('❌ Error seeding QA data:', error);
        throw error;
    }
}

// Expose to window for easy access in browser console
if (typeof window !== 'undefined') {
    (window as any).seedQAData = seedQAData;
}
