import { apiClient } from './client';

export const usersApi = {
  getAll: async (filters?: {
    startDate?: string;
    endDate?: string;
    assessment?: string;
    gender?: string;
    city?: string;
    hasBookings?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.assessment) params.append('assessment', filters.assessment);
    if (filters?.gender) params.append('gender', filters.gender);
    if (filters?.city) params.append('city', filters.city);
    if (filters?.hasBookings) params.append('hasBookings', filters.hasBookings);
    const query = params.toString();
    const response = await apiClient.get(`/users${query ? `?${query}` : ''}`);
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await apiClient.patch('/users/me', data);
    return response.data;
  },

  getMyCategory: async () => {
    const response = await apiClient.get('/users/me/category');
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },
};
