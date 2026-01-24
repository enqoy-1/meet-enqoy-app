import { apiClient } from './client';

export const assessmentsApi = {
  getQuestions: async (countryId?: string) => {
    const params = countryId ? { countryId } : {};
    const response = await apiClient.get('/assessments/questions', { params });
    return response.data;
  },

  getMy: async () => {
    const response = await apiClient.get('/assessments/my');
    return response.data;
  },

  saveProgress: async (answers: any) => {
    const response = await apiClient.post('/assessments/save-progress', { answers });
    return response.data;
  },

  submit: async (answers: any) => {
    const response = await apiClient.post('/assessments/submit', { answers });
    return response.data;
  },

  updateAnswer: async (questionKey: string, value: any) => {
    const response = await apiClient.patch('/assessments/answer', {
      questionKey,
      value,
    });
    return response.data;
  },

  // Admin endpoints
  getAllResponses: async () => {
    const response = await apiClient.get('/assessments/responses');
    return response.data;
  },

  createQuestion: async (data: any) => {
    const response = await apiClient.post('/assessments/questions', data);
    return response.data;
  },

  updateQuestion: async (id: string, data: any) => {
    const response = await apiClient.patch(`/assessments/questions/${id}`, data);
    return response.data;
  },

  deleteQuestion: async (id: string) => {
    const response = await apiClient.delete(`/assessments/questions/${id}`);
    return response.data;
  },

  reorderQuestions: async (orders: { id: string; order: number }[]) => {
    const response = await apiClient.put('/assessments/questions/reorder', orders);
    return response.data;
  },
};
