import { apiClient } from './client';

export interface OutsideCityInterest {
  id: string;
  userId: string;
  city: string;
  createdAt: string;
}

export const outsideCityInterestsApi = {
  create: async (city: string) => {
    const response = await apiClient.post('/outside-city-interests', { city });
    return response.data;
  },

  getMy: async () => {
    const response = await apiClient.get('/outside-city-interests/my');
    return response.data;
  },

  getAll: async () => {
    const response = await apiClient.get('/outside-city-interests');
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/outside-city-interests/${id}`);
    return response.data;
  },
};
