/**
 * Sandbox Clock Utility
 * Provides time simulation capabilities for testing
 */

import { supabase } from "@/integrations/supabase/client";

export interface TimeState {
  is_frozen: boolean;
  frozen_time: string | null;
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
    
    if (timeState.is_frozen && timeState.frozen_time) {
      return new Date(timeState.frozen_time);
    }
    
    return new Date();
  }

  /**
   * Get the time state from the database with caching
   */
  private async getTimeState(): Promise<TimeState> {
    const now = Date.now();
    
    // Return cached value if still valid
    if (this.cachedTimeState && now < this.cacheExpiry) {
      return this.cachedTimeState;
    }

    // Fetch fresh state
    const { data, error } = await supabase
      .from("sandbox_time_state")
      .select("is_frozen, frozen_time")
      .single();

    if (error || !data) {
      // Default to real time if query fails
      return { is_frozen: false, frozen_time: null };
    }

    // Cache the result
    this.cachedTimeState = data;
    this.cacheExpiry = now + this.CACHE_DURATION;

    return data;
  }

  /**
   * Freeze time at a specific datetime
   */
  async freezeTime(datetime: Date): Promise<void> {
    const { error } = await supabase
      .from("sandbox_time_state")
      .update({
        is_frozen: true,
        frozen_time: datetime.toISOString(),
        updated_at: new Date().toISOString()
      })
      .limit(1);

    if (error) {
      throw new Error(`Failed to freeze time: ${error.message}`);
    }

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
    const { error } = await supabase
      .from("sandbox_time_state")
      .update({
        is_frozen: false,
        frozen_time: null,
        updated_at: new Date().toISOString()
      })
      .limit(1);

    if (error) {
      throw new Error(`Failed to reset time: ${error.message}`);
    }

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
