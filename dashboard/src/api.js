import axios from 'axios';

const api = axios.create({
  baseURL: 'http://31.129.111.73/api/v1',
  // baseURL: 'http://localhost:8001/api/v1/',
});

// Intercepteur de requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken'); // Changé pour adminToken
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur de réponse
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/refresh-token')
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const res = await api.post('/users/refresh-token', {
          refresh_token: refreshToken,
        });

        const newAccessToken = res.data.access_token;
        localStorage.setItem('adminToken', newAccessToken); // Changé pour adminToken

        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
