import { apiClient } from './client';

export interface PaymentInfo {
    telebirr: { number: string; name: string };
    cbe: { number: string; name: string };
}

export interface SubmitPaymentData {
    bookingId: string;
    amount: number;
    paymentMethod: 'telebirr' | 'cbe';
    transactionId?: string;
    screenshotUrl?: string;
}

export const paymentsApi = {
    getInfo: async (): Promise<PaymentInfo> => {
        const response = await apiClient.get('/payments/info');
        return response.data;
    },

    submit: async (data: SubmitPaymentData) => {
        const response = await apiClient.post('/payments', data);
        return response.data;
    },

    getByBooking: async (bookingId: string) => {
        const response = await apiClient.get(`/payments/booking/${bookingId}`);
        return response.data;
    },

    // Admin endpoints
    getPending: async () => {
        const response = await apiClient.get('/payments/pending');
        return response.data;
    },

    approve: async (paymentId: string) => {
        const response = await apiClient.patch(`/payments/${paymentId}/approve`);
        return response.data;
    },

    reject: async (paymentId: string, reason?: string) => {
        const response = await apiClient.patch(`/payments/${paymentId}/reject`, {
            rejectionReason: reason,
        });
        return response.data;
    },
};
