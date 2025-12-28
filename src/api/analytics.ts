import { apiClient } from './client';

export const analyticsApi = {
  getOverview: async () => {
    const response = await apiClient.get('/analytics/overview');
    return response.data;
  },

  getEnhanced: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    const response = await apiClient.get(`/analytics/enhanced${query ? `?${query}` : ''}`);
    return response.data;
  },

  getBookingStats: async () => {
    const response = await apiClient.get('/analytics/bookings');
    return response.data;
  },

  getEventStats: async () => {
    const response = await apiClient.get('/analytics/events');
    return response.data;
  },

  getUserGrowth: async () => {
    const response = await apiClient.get('/analytics/user-growth');
    return response.data;
  },

  getRecentActivity: async () => {
    const response = await apiClient.get('/analytics/recent-activity');
    return response.data;
  },
};
