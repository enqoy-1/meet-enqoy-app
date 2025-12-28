import { apiClient } from './client';

export const snapshotsApi = {
  getByEventAndUser: async (eventId: string) => {
    const response = await apiClient.get(`/snapshots/event/${eventId}/user`);
    return response.data;
  },

  getByEvent: async (eventId: string) => {
    const response = await apiClient.get(`/snapshots/event/${eventId}`);
    return response.data;
  },

  create: async (eventId: string, snapshotData: any) => {
    const response = await apiClient.post(`/snapshots/event/${eventId}`, {
      snapshotData,
    });
    return response.data;
  },
};
