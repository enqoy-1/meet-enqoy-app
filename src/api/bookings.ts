import { apiClient } from './client';

interface CreateBookingData {
  eventId: string;
  twoEvents?: boolean;
  useCredit?: boolean;
  bringFriend?: boolean;
  friendName?: string;
  friendEmail?: string;
  friendPhone?: string;
  payForFriend?: boolean;
}

export const bookingsApi = {
  create: async (data: CreateBookingData) => {
    const response = await apiClient.post('/bookings', data);
    return response.data;
  },

  getAll: async (filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    paymentStatus?: string;
    eventType?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
    if (filters?.eventType) params.append('eventType', filters.eventType);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString();
    const response = await apiClient.get(`/bookings${query ? `?${query}` : ''}`);
    return response.data;
  },

  getMy: async () => {
    const response = await apiClient.get('/bookings/my');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/bookings/${id}`);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/bookings/${id}`, data);
    return response.data;
  },

  cancel: async (id: string) => {
    const response = await apiClient.patch(`/bookings/${id}/cancel`, {});
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/bookings/${id}`);
    return response.data;
  },

  // Admin: Confirm a single booking
  confirm: async (id: string) => {
    const response = await apiClient.patch(`/bookings/${id}/confirm`, {});
    return response.data;
  },

  // Admin: Confirm all pending bookings for an event
  confirmEventBookings: async (eventId: string) => {
    const response = await apiClient.post(`/bookings/confirm-event/${eventId}`, {});
    return response.data;
  },
};
