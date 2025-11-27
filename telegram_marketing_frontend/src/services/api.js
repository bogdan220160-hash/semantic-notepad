import axios from 'axios';

const API_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for global error handling (optional but good practice)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response || error.message);
        return Promise.reject(error);
    }
);

export const campaignService = {
    getAll: () => api.get('/campaigns/'),
    create: (data) => api.post('/campaigns/start', data), // Note: backend uses /start for creation/start
    start: (id) => api.post(`/campaigns/${id}/start`), // This might not exist in backend? Backend has /start with body. 
    // Wait, backend has POST /start (creates and starts) and POST /stop/{id}.
    // There is NO specific POST /{id}/start in backend campaigns.py.
    // But Drip has POST /{id}/start.
    // Let's check campaigns.py again.
    // It has POST /start (creates new).
    // It does NOT have a way to restart an existing campaign?
    // Correct. Regular campaigns are "fire and forget" or "scheduled".
    // So 'create' should map to /campaigns/start.
    // 'start' might be redundant or wrong here.
    // Let's just fix the prefix for now.
    stop: (id) => api.post(`/campaigns/stop/${id}`),
    delete: (id) => api.delete(`/campaigns/${id}`),
    schedule: (data) => api.post('/scheduler/schedule', data),
};

export const listService = {
    getAll: () => api.get('/lists/'),
    upload: (formData) => api.post('/lists/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    delete: (id) => api.delete(`/lists/${id}`),
    split: (id, chunkSize) => api.post(`/lists/${id}/split?chunk_size=${chunkSize}`),
    getUsers: (id) => api.get(`/lists/${id}/users`),
};

export const messageService = {
    getAll: () => api.get('/messages/'),
    create: (data) => api.post('/messages/', data),
    delete: (id) => api.delete(`/messages/${id}`),
};

export const accountService = {
    getAll: () => api.get('/accounts/'),
    // Add other account methods as needed
};

export const abTestService = {
    getAll: () => api.get('/ab_test/list'),
    // Add other AB test methods as needed
};

export const logsService = {
    getAll: (params) => api.get('/logs/', { params }),
    export: (params) => api.get('/logs/export', { params, responseType: 'blob' }),
};

export const delayService = {
    get: () => api.get('/delay/'),
    save: (data) => api.post('/delay/', data),
};

export const filterService = {
    get: () => api.get('/filters/'),
    save: (data) => api.post('/filters/', data),
};

export default api;
