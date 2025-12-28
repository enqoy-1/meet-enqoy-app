import { apiClient } from './client';

export const venuesApi = {
  getAll: async () => {
    const response = await apiClient.get('/venues');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/venues/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/venues', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/venues/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/venues/${id}`);
    return response.data;
  },
};
