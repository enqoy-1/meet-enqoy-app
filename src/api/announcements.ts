import { apiClient } from './client';

export const announcementsApi = {
  getActive: async () => {
    const response = await apiClient.get('/announcements/active');
    return response.data;
  },

  // Admin endpoints
  getAll: async () => {
    const response = await apiClient.get('/announcements');
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/announcements', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/announcements/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/announcements/${id}`);
    return response.data;
  },
};
