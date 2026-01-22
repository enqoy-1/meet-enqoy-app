import { apiClient } from './client';

export const icebreakersApi = {
  getActive: async () => {
    const response = await apiClient.get('/icebreakers/active');
    return response.data;
  },

  // Admin endpoints
  getAll: async () => {
    const response = await apiClient.get('/icebreakers');
    return response.data;
  },

  create: async (question: string, isActive: boolean = false, category: string = "Icebreakers") => {
    const response = await apiClient.post('/icebreakers', { question, isActive, category });
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/icebreakers/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/icebreakers/${id}`);
    return response.data;
  },
};
