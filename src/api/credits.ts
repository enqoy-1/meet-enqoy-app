import { apiClient } from './client';

export interface CreditTransaction {
    id: string;
    type: 'earned' | 'used' | 'expired' | 'admin_grant' | 'admin_revoke';
    amount: number;
    balance: number;
    description: string;
    sourceEventId?: string;
    usedForEventId?: string;
    createdAt: string;
    sourceBooking?: {
        event: {
            id: string;
            title: string;
            startTime: string;
        };
    };
    usedForBooking?: {
        event: {
            id: string;
            title: string;
            startTime: string;
        };
    };
}

export interface CreditsData {
    balance: number;
    transactions: CreditTransaction[];
}

export const creditsApi = {
    getMyCredits: async (): Promise<CreditsData> => {
        const response = await apiClient.get('/credits/my');
        return response.data;
    },

    canUseCredit: async (eventId: string): Promise<{ canUse: boolean }> => {
        const response = await apiClient.get(`/credits/can-use/${eventId}`);
        return response.data;
    },
};
