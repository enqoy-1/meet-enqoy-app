/**
 * Data Factories for Sandbox Testing
 * Generate realistic fake data for testing
 */

import { supabase } from "@/integrations/supabase/client";

// Faker-like data generation
const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
const domains = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com"];

const getRandomItem = <T,>(array: T[]): T => array[Math.floor(Math.random() * array.length)];

const generateEmail = (firstName: string, lastName: string): string => {
  const domain = getRandomItem(domains);
  const randomNum = Math.floor(Math.random() * 999);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@${domain}`;
};

const generatePhone = (): string => {
  const prefix = "+251";
  const number = Math.floor(900000000 + Math.random() * 100000000);
  return `${prefix}${number}`;
};

/**
 * Create sandbox users
 */
export async function createSandboxUsers(count: number = 10) {
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = getRandomItem(firstNames);
    const lastName = getRandomItem(lastNames);
    const email = generateEmail(firstName, lastName);
    const age = Math.floor(Math.random() * (45 - 25 + 1)) + 25;
    const genders: ("male" | "female" | "non_binary" | "prefer_not_to_say")[] = ["male", "female"];
    const gender = getRandomItem(genders);

    // Create auth user first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: "sandbox123",
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
      },
    });

    if (authError || !authData.user) {
      console.error(`Failed to create auth user ${email}:`, authError);
      continue;
    }

    // Update profile with sandbox flag
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        is_sandbox: true,
        phone: generatePhone(),
        age,
        gender,
        assessment_completed: Math.random() > 0.3, // 70% completed
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error(`Failed to update profile for ${email}:`, profileError);
      continue;
    }

    users.push({
      id: authData.user.id,
      email,
      full_name: `${firstName} ${lastName}`,
      age,
      gender,
    });
  }

  return users;
}

/**
 * Create sandbox events
 */
export async function createSandboxEvents(count: number = 3, daysFromNow: number = 7) {
  const events = [];
  const eventTitles = [
    "Casual Dinner Networking",
    "Professional Lunch Meetup",
    "Weekend Brunch Social",
    "Evening Cocktails & Conversation",
    "Coffee & Connections",
    "Wine Tasting Experience",
  ];
  const eventTypes: ("dinner" | "lunch" | "mixer")[] = ["dinner", "lunch", "mixer"];

  for (let i = 0; i < count; i++) {
    const title = getRandomItem(eventTitles);
    const type = getRandomItem(eventTypes);
    const daysOffset = Math.floor(Math.random() * daysFromNow);
    const hours = type === "lunch" ? 14 : type === "dinner" ? 19 : 18;
    const dateTime = new Date();
    dateTime.setDate(dateTime.getDate() + daysOffset);
    dateTime.setHours(hours, 0, 0, 0);

    const price = type === "lunch" ? 500 : type === "dinner" ? 1200 : 800;

    const { data, error } = await supabase
      .from("events")
      .insert([{
        title,
        type,
        date_time: dateTime.toISOString(),
        price,
        is_visible: true,
        is_sandbox: true,
        description: `Join us for a delightful ${type} experience where you'll meet new people and enjoy great conversation.`,
      }])
      .select()
      .single();

    if (error || !data) {
      console.error(`Failed to create event ${title}:`, error);
      continue;
    }

    events.push(data);
  }

  return events;
}

/**
 * Create sandbox bookings
 */
export async function createSandboxBookings(userIds: string[], eventIds: string[]) {
  const bookings = [];

  for (const eventId of eventIds) {
    // Book 30-70% of users for each event
    const bookingPercentage = Math.random() * 0.4 + 0.3;
    const usersToBook = Math.floor(userIds.length * bookingPercentage);
    const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5).slice(0, usersToBook);

    for (const userId of shuffledUsers) {
      const { data: event } = await supabase
        .from("events")
        .select("price")
        .eq("id", eventId)
        .single();

      const { data, error } = await supabase
        .from("bookings")
        .insert({
          user_id: userId,
          event_id: eventId,
          status: "confirmed",
          amount_paid: event?.price || 0,
          is_sandbox: true,
          payment_reference: `SANDBOX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        })
        .select()
        .single();

      if (error || !data) {
        console.error(`Failed to create booking for user ${userId}:`, error);
        continue;
      }

      bookings.push(data);
    }
  }

  return bookings;
}

/**
 * Reset all sandbox data
 */
export async function resetSandboxData() {
  try {
    // Delete sandbox bookings
    await supabase.from("bookings").delete().eq("is_sandbox", true);

    // Delete sandbox events
    await supabase.from("events").delete().eq("is_sandbox", true);

    // Delete sandbox notifications
    await supabase.from("sandbox_notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Get sandbox user IDs
    const { data: sandboxProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_sandbox", true);

    // Delete sandbox users from auth (this will cascade to profiles)
    if (sandboxProfiles) {
      for (const profile of sandboxProfiles) {
        await supabase.auth.admin.deleteUser(profile.id);
      }
    }

    // Reset sandbox time
    await supabase
      .from("sandbox_time_state")
      .update({
        is_frozen: false,
        frozen_time: null,
        updated_at: new Date().toISOString(),
      })
      .limit(1);

    return { success: true };
  } catch (error: any) {
    console.error("Failed to reset sandbox data:", error);
    return { success: false, error: error.message };
  }
}
