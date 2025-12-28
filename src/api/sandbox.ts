import { apiClient } from './client';

export const sandboxApi = {
    // Time management
    getTimeState: async () => {
        const response = await apiClient.get('/sandbox/time');
        return response.data;
    },

    freezeTime: async (datetime: Date) => {
        const response = await apiClient.post('/sandbox/time/freeze', { datetime: datetime.toISOString() });
        return response.data;
    },

    resetTime: async () => {
        const response = await apiClient.post('/sandbox/time/reset');
        return response.data;
    },

    getSandboxTime: async () => {
        const response = await apiClient.get('/sandbox/current-time');
        return new Date(response.data);
    },

    // Data seeding
    seedData: async (params: { userCount?: number; eventCount?: number; eventDays?: number }) => {
        const response = await apiClient.post('/sandbox/seed', params);
        return response.data;
    },

    resetSandboxData: async () => {
        const response = await apiClient.delete('/sandbox/reset');
        return response.data;
    },

    // Data fetching
    getSandboxUsers: async () => {
        const response = await apiClient.get('/sandbox/users');
        return response.data;
    },

    getSandboxEvents: async () => {
        const response = await apiClient.get('/sandbox/events');
        return response.data;
    },

    getSandboxNotifications: async (limit?: number) => {
        const response = await apiClient.get('/sandbox/notifications', { params: { limit } });
        return response.data;
    },
};
