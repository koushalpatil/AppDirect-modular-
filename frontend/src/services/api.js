import api from './httpClient';

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  getMe: () => api.get('/auth/me'),
};

// Products (Admin)
export const productAPI = {
  create: (data) => api.post('/products', data),
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getLogs: (id) => api.get(`/products/${id}/logs`),
  // Public
  getPublished: (params) => api.get('/products/public', { params }),
  getPublicOne: (id) => api.get(`/products/public/${id}`),
  getPublicContactForm: (id) => api.get(`/products/public/${id}/contact-form`),
  getByAttribute: (params) => api.get('/products/public/by-attribute', { params }),
  search: (params) => api.get('/products/public/search', { params }),
  getFacets: (params) => api.get('/products/public/facets', { params }),
};

// Catalog (Admin)
export const catalogAPI = {
  create: (data) => api.post('/catalog', data),
  getAll: () => api.get('/catalog'),
  getOne: (id) => api.get(`/catalog/${id}`),
  update: (id, data) => api.put(`/catalog/${id}`, data),
  delete: (id) => api.delete(`/catalog/${id}`),
  getPublic: () => api.get('/catalog/public'),
};

// Config (Admin)
export const configAPI = {
  getContact: () => api.get('/config/contact'),
  updateContact: (data) => api.put('/config/contact', data),
  getHomepage: () => api.get('/config/homepage'),
  updateHomepage: (data) => api.put('/config/homepage', data),
  // Public
  getPublicHomepage: () => api.get('/config/public/homepage'),
  getPublicContactForm: () => api.get('/config/public/contact-form'),
  submitPublicContactForm: (data) => api.post('/config/public/contact-form/submit', data),
  // Footer
  getFooter: () => api.get('/config/footer'),
  updateFooter: (data) => api.put('/config/footer', data),
  getPublicFooter: () => api.get('/config/public/footer'),
  getUserApps: () => api.get('/config/my-apps'),
};

// Upload
export const uploadAPI = {
  single: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  multiple: (files) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
