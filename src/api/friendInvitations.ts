import { apiClient } from './client';

export const friendInvitationsApi = {
  sendInvitation: async (data: { eventId: string; friendEmail: string; friendName?: string }) => {
    const response = await apiClient.post('/friend-invitations/send', data);
    return response.data;
  },

  getInvitationByToken: async (token: string) => {
    const response = await apiClient.get(`/friend-invitations/token/${token}`);
    return response.data;
  },

  acceptInvitation: async (token: string) => {
    const response = await apiClient.post(`/friend-invitations/accept/${token}`);
    return response.data;
  },

  bookForFriend: async (data: { eventId: string; friendData: { name: string; email: string; phone?: string } }) => {
    const response = await apiClient.post('/friend-invitations/book-for-friend', data);
    return response.data;
  },

  getMyInvitations: async () => {
    const response = await apiClient.get('/friend-invitations/my');
    return response.data;
  },
};
