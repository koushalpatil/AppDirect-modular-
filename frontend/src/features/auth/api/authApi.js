import httpClient from '../../../services/httpClient';

export const authApi = {
  login: (data) => httpClient.post('/auth/login', data),
  signup: (data) => httpClient.post('/auth/signup', data),
  getMe: () => httpClient.get('/auth/me'),
};
