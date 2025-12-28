/**
 * Sandbox Clock Utility
 * Provides time simulation capabilities for testing
 */

import { sandboxApi } from "@/api";

export interface TimeState {
  isFrozen: boolean;
  frozenTime: string | null;
}

class SandboxClock {
  private cachedTimeState: TimeState | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds

  /**
   * Get the current time - either real or simulated
   */
  async now(): Promise<Date> {
    const timeState = await this.getTimeState();

    if (timeState.isFrozen && timeState.frozenTime) {
      return new Date(timeState.frozenTime);
    }

    return new Date();
  }

  /**
   * Get the time state from the API with caching
   */
  private async getTimeState(): Promise<TimeState> {
    const now = Date.now();

    // Return cached value if still valid
    if (this.cachedTimeState && now < this.cacheExpiry) {
      return this.cachedTimeState;
    }

    try {
      // Fetch fresh state from API
      const data = await sandboxApi.getTimeState();

      // Cache the result
      this.cachedTimeState = {
        isFrozen: data.isFrozen,
        frozenTime: data.frozenTime,
      };
      this.cacheExpiry = now + this.CACHE_DURATION;

      return this.cachedTimeState;
    } catch (error) {
      // Default to real time if query fails
      return { isFrozen: false, frozenTime: null };
    }
  }

  /**
   * Freeze time at a specific datetime
   */
  async freezeTime(datetime: Date): Promise<void> {
    await sandboxApi.freezeTime(datetime);

    // Invalidate cache
    this.cachedTimeState = null;
  }

  /**
   * Advance time by a certain number of minutes
   */
  async advanceTime(minutes: number): Promise<void> {
    const currentTime = await this.now();
    const newTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    await this.freezeTime(newTime);
  }

  /**
   * Reset to real time
   */
  async resetTime(): Promise<void> {
    await sandboxApi.resetTime();

    // Invalidate cache
    this.cachedTimeState = null;
  }

  /**
   * Get time relative to an event
   */
  async getTimeUntilEvent(eventDateTime: Date): Promise<number> {
    const now = await this.now();
    return eventDateTime.getTime() - now.getTime();
  }

  /**
   * Check if we're within a reminder window
   */
  async isWithinReminderWindow(
    eventDateTime: Date,
    hoursBeforeEvent: number,
    windowMinutes: number = 60
  ): Promise<boolean> {
    const now = await this.now();
    const reminderTime = new Date(eventDateTime.getTime() - hoursBeforeEvent * 60 * 60 * 1000);
    const windowEnd = new Date(reminderTime.getTime() + windowMinutes * 60 * 1000);

    return now >= reminderTime && now <= windowEnd;
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cachedTimeState = null;
    this.cacheExpiry = 0;
  }
}

// Export a singleton instance
export const sandboxClock = new SandboxClock();

// Export helper functions for convenience
export const freezeTime = (datetime: Date) => sandboxClock.freezeTime(datetime);
export const advanceTime = (minutes: number) => sandboxClock.advanceTime(minutes);
export const resetTime = () => sandboxClock.resetTime();
export const getSandboxTime = () => sandboxClock.now();
