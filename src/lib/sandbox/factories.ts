/**
 * Data Factories for Sandbox Testing
 * Generate realistic fake data for testing via API
 */

import { sandboxApi } from "@/api";

/**
 * Create sandbox users via API
 */
export async function createSandboxUsers(count: number = 10) {
  const result = await sandboxApi.seedData({ userCount: count, eventCount: 0, eventDays: 0 });
  // Re-fetch the users to return them
  const users = await sandboxApi.getSandboxUsers();
  return users.slice(0, count);
}

/**
 * Create sandbox events via API
 */
export async function createSandboxEvents(count: number = 3, daysFromNow: number = 7) {
  const result = await sandboxApi.seedData({ userCount: 0, eventCount: count, eventDays: daysFromNow });
  // Re-fetch the events to return them
  const events = await sandboxApi.getSandboxEvents();
  return events.slice(0, count);
}

/**
 * Create sandbox bookings via API
 * Note: The API creates bookings as part of the seed process when both users and events exist
 */
export async function createSandboxBookings(userIds: string[], eventIds: string[]) {
  // The API handles booking creation internally when seeding
  // This function is kept for backwards compatibility
  // Re-fetch events to get booking counts
  const events = await sandboxApi.getSandboxEvents();
  const bookings = events.flatMap((e: any) => e.bookings || []);
  return bookings;
}

/**
 * Reset all sandbox data via API
 */
export async function resetSandboxData() {
  return sandboxApi.resetSandboxData();
}
