/**
 * Time Travel Utility for QA Testing
 * 
 * Supports time travel modes:
 * - T-48h: 48 hours before event
 * - T-24h: 24 hours before event
 * - T-0: Event start time
 * - T+2h: 2 hours after event start
 */

export type TimeTravelMode = 'T-48h' | 'T-24h' | 'T-0' | 'T+2h' | null;

/**
 * Get the current time with optional time travel offset
 * @param eventDateTime - Optional event date/time for relative time travel
 * @returns Current Date object (or offset date if time travel is active)
 */
export function getCurrentTime(eventDateTime?: string | Date): Date {
    const timeTravelMode = getTimeTravelMode();

    if (!timeTravelMode || !eventDateTime) {
        return new Date();
    }

    const eventDate = typeof eventDateTime === 'string' ? new Date(eventDateTime) : eventDateTime;
    const now = new Date();

    switch (timeTravelMode) {
        case 'T-48h':
            // Return a time that is 48 hours before the event
            return new Date(eventDate.getTime() - 48 * 60 * 60 * 1000);
        case 'T-24h':
            // Return a time that is 24 hours before the event
            return new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
        case 'T-0':
            // Return the event start time
            return eventDate;
        case 'T+2h':
            // Return a time that is 2 hours after the event
            return new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
        default:
            return now;
    }
}

/**
 * Get the active time travel mode from localStorage or URL params
 */
export function getTimeTravelMode(): TimeTravelMode {
    // Check URL params first
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlMode = urlParams.get('QA_TIME_TRAVEL') as TimeTravelMode;
        if (urlMode) return urlMode;

        // Check localStorage
        const storageMode = localStorage.getItem('QA_TIME_TRAVEL') as TimeTravelMode;
        return storageMode;
    }

    return null;
}

/**
 * Set the time travel mode
 */
export function setTimeTravelMode(mode: TimeTravelMode) {
    if (typeof window !== 'undefined') {
        if (mode) {
            localStorage.setItem('QA_TIME_TRAVEL', mode);
        } else {
            localStorage.removeItem('QA_TIME_TRAVEL');
        }
    }
}

/**
 * Check if time travel is active
 */
export function isTimeTravelActive(): boolean {
    return getTimeTravelMode() !== null;
}
