import { apiClient } from './client';

export interface WelcomeBannerSettings {
    title: string;
    subtitle: string;
    backgroundImage?: string;
    buttonText: string;
    buttonLink: string;
}

export const settingsApi = {
    getWelcomeBanner: async (): Promise<WelcomeBannerSettings> => {
        const response = await apiClient.get('/settings/welcome-banner');
        return response.data;
    },

    updateWelcomeBanner: async (data: Partial<WelcomeBannerSettings>) => {
        const response = await apiClient.patch('/settings/welcome-banner', data);
        return response.data;
    },
};
