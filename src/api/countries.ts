import { apiClient } from './client';

export interface Country {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  currency?: string;
  phoneCode?: string;
  mainCity?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCountryDto {
  name: string;
  code: string;
  isActive?: boolean;
  currency?: string;
  phoneCode?: string;
  mainCity?: string;
}

export interface UpdateCountryDto {
  name?: string;
  code?: string;
  isActive?: boolean;
  currency?: string;
  phoneCode?: string;
  mainCity?: string;
}

export const countriesApi = {
  getAll: async (): Promise<Country[]> => {
    const response = await apiClient.get('/countries');
    return response.data;
  },

  getActive: async (): Promise<Country[]> => {
    const response = await apiClient.get('/countries/active');
    return response.data;
  },

  getById: async (id: string): Promise<Country> => {
    const response = await apiClient.get(`/countries/${id}`);
    return response.data;
  },

  create: async (data: CreateCountryDto): Promise<Country> => {
    const response = await apiClient.post('/countries', data);
    return response.data;
  },

  update: async (id: string, data: UpdateCountryDto): Promise<Country> => {
    const response = await apiClient.patch(`/countries/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    const response = await apiClient.delete(`/countries/${id}`);
    return response.data;
  },
};
