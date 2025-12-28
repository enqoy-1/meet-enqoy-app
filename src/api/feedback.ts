import { apiClient } from './client';

export const feedbackApi = {
  create: async (data: any) => {
    const response = await apiClient.post('/feedback', data);
    return response.data;
  },

  getMy: async () => {
    const response = await apiClient.get('/feedback/my');
    return response.data;
  },

  // Admin endpoints
  getAll: async () => {
    const response = await apiClient.get('/feedback');
    return response.data;
  },

  getByEvent: async (eventId: string) => {
    const response = await apiClient.get(`/feedback/event/${eventId}`);
    return response.data;
  },
};
