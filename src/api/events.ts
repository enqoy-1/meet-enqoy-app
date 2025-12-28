import { apiClient } from './client';

export const eventsApi = {
  getAll: async (includeHidden: boolean = false) => {
    const response = await apiClient.get('/events', {
      params: includeHidden ? { includeHidden: 'true' } : {},
    });
    return response.data;
  },

  getAllForAdmin: async () => {
    // Admin endpoint that always includes hidden events
    const response = await apiClient.get('/events/admin/all');
    return response.data;
  },

  getUpcoming: async () => {
    const response = await apiClient.get('/events/upcoming');
    return response.data;
  },

  getPast: async () => {
    const response = await apiClient.get('/events/past');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/events', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/events/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/events/${id}`);
    return response.data;
  },
};
