import { apiClient } from './client';

export const pairingApi = {
  getEventGuests: async (eventId: string) => {
    const response = await apiClient.get(`/pairing/events/${eventId}/guests`);
    return response.data;
  },

  importBookingsAsGuests: async (eventId: string) => {
    const response = await apiClient.post(`/pairing/events/${eventId}/import-bookings`);
    return response.data;
  },

  getEventPairs: async (eventId: string) => {
    const response = await apiClient.get(`/pairing/events/${eventId}/pairs`);
    return response.data;
  },

  getEventRestaurants: async (eventId: string) => {
    const response = await apiClient.get(`/pairing/events/${eventId}/restaurants`);
    return response.data;
  },

  getConstraints: async (eventId: string) => {
    const response = await apiClient.get(`/pairing/events/${eventId}/constraints`);
    return response.data;
  },

  createGuest: async (data: any) => {
    const response = await apiClient.post('/pairing/guests', data);
    return response.data;
  },

  createPair: async (data: { guest1Id: string; guest2Id: string; score?: number }) => {
    const response = await apiClient.post('/pairing/pairs', data);
    return response.data;
  },

  createAssignment: async (data: { guestId: string; restaurantId?: string; tableId?: string | null; seatNumber?: number | null; groupName?: string }) => {
    const response = await apiClient.post('/pairing/assignments', data);
    return response.data;
  },

  createRestaurant: async (data: any) => {
    const response = await apiClient.post('/pairing/restaurants', data);
    return response.data;
  },

  createTable: async (data: any) => {
    const response = await apiClient.post('/pairing/tables', data);
    return response.data;
  },

  deleteTable: async (tableId: string) => {
    const response = await apiClient.delete(`/pairing/tables/${tableId}`);
    return response.data;
  },

  // Algorithm endpoints
  categorizeParticipant: async (eventId: string, userId: string) => {
    const response = await apiClient.get(`/pairing/events/${eventId}/categorize/${userId}`);
    return response.data;
  },

  categorizeAllParticipants: async (eventId: string) => {
    const response = await apiClient.get(`/pairing/events/${eventId}/categorize-all`);
    return response.data;
  },

  generateGroups: async (
    eventId: string,
    groupSize: number = 6,
    useAI: boolean = true,
    allowConstraintRelaxation: boolean = true,
  ) => {
    const response = await apiClient.post(`/pairing/events/${eventId}/generate-groups`, {
      groupSize,
      useAI,
      allowConstraintRelaxation,
    });
    return response.data;
  },

  // Gemini-enhanced endpoints
  categorizeParticipantWithAI: async (eventId: string, userId: string) => {
    const response = await apiClient.get(`/pairing/events/${eventId}/categorize/${userId}/ai`);
    return response.data;
  },

  analyzeGroup: async (eventId: string, participantIds: string[]) => {
    const response = await apiClient.post(`/pairing/events/${eventId}/analyze-group`, { participantIds });
    return response.data;
  },

  suggestPairings: async (eventId: string, userId: string) => {
    const response = await apiClient.get(`/pairing/events/${eventId}/suggest-pairings/${userId}`);
    return response.data;
  },

  // Constraint management
  createConstraint: async (data: { guest1Id: string; guest2Id: string; type: 'must_pair' | 'avoid_pair'; reason?: string }) => {
    const response = await apiClient.post('/pairing/constraints', data);
    return response.data;
  },

  deleteConstraint: async (id: string) => {
    const response = await apiClient.delete(`/pairing/constraints/${id}`);
    return response.data;
  },

  // Assignment management
  deleteAssignment: async (id: string) => {
    const response = await apiClient.delete(`/pairing/assignments/${id}`);
    return response.data;
  },

  updateAssignment: async (id: string, data: { restaurantId?: string; tableId?: string | null; seatNumber?: number | null; status?: string }) => {
    const response = await apiClient.post(`/pairing/assignments/${id}`, data);
    return response.data;
  },

  getEventAssignments: async (eventId: string) => {
    const response = await apiClient.get(`/pairing/events/${eventId}/assignments`);
    return response.data;
  },

  // Restaurant management
  updateRestaurant: async (id: string, data: { name?: string; address?: string; capacity?: number; contactInfo?: string }) => {
    const response = await apiClient.post(`/pairing/restaurants/${id}`, data);
    return response.data;
  },

  // Audit log
  createAuditLog: async (data: { action: string; entityType: string; entityId: string; details?: any }) => {
    const response = await apiClient.post('/pairing/audit-log', data);
    return response.data;
  },

  // Fill missing personality data for guests without assessments
  fillMissingPersonality: async (eventId: string) => {
    const response = await apiClient.post(`/pairing/events/${eventId}/fill-missing-personality`);
    return response.data;
  },

  // Delete all guests for an event
  deleteAllGuests: async (eventId: string) => {
    const response = await apiClient.delete(`/pairing/events/${eventId}/guests`);
    return response.data;
  },

  // Link guests to users by email
  linkGuestsToUsers: async (eventId: string) => {
    const response = await apiClient.post(`/pairing/events/${eventId}/link-guests-to-users`);
    return response.data;
  },

  // Create user accounts from guests
  createUsersFromGuests: async (eventId: string) => {
    const response = await apiClient.post(`/pairing/events/${eventId}/create-users-from-guests`);
    return response.data;
  },

  // Get current user's restaurant assignment for an event
  getMyAssignment: async (eventId: string) => {
    const response = await apiClient.get(`/user-pairing/events/${eventId}/my-assignment`);
    return response.data;
  },

  // Publish/unpublish pairing
  publishPairing: async (eventId: string) => {
    const response = await apiClient.post(`/pairing/events/${eventId}/publish-pairing`);
    return response.data;
  },

  unpublishPairing: async (eventId: string) => {
    const response = await apiClient.post(`/pairing/events/${eventId}/unpublish-pairing`);
    return response.data;
  },

  updatePairing: async (eventId: string, changedAssignments?: { guestId: string; oldRestaurantId: string; newRestaurantId: string }[]) => {
    const response = await apiClient.post(`/pairing/events/${eventId}/update-pairing`, { changedAssignments });
    return response.data;
  },

  getPairingStatus: async (eventId: string) => {
    const response = await apiClient.get(`/pairing/events/${eventId}/pairing-status`);
    return response.data;
  },

  // Clear all assignments for an event
  clearAllAssignments: async (eventId: string) => {
    const response = await apiClient.delete(`/pairing/events/${eventId}/clear-assignments`);
    return response.data;
  },

  // Check if user has pairing updates
  hasPairingUpdates: async () => {
    const response = await apiClient.get('/user-pairing/has-pairing-updates');
    return response.data;
  },

  // Mark pairing notification as seen
  markNotificationSeen: async (eventId: string) => {
    const response = await apiClient.post(`/user-pairing/events/${eventId}/mark-notification-seen`);
    return response.data;
  },

  // Get users who haven't booked this event
  getNonAttendees: async (eventId: string) => {
    const response = await apiClient.get(`/pairing/events/${eventId}/non-attendees`);
    return response.data;
  },
};

