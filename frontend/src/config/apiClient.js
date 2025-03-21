import axios from 'axios';

// Get API URL from environment variable
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Log the API URL to help with debugging
console.log('Using API URL:', apiUrl);

// Remove trailing slash if present to avoid path issues
const baseURL = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

// Create the axios client instance
const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to modify request paths if needed
apiClient.interceptors.request.use(
  (config) => {
    // Check if the URL already contains /api to avoid duplication
    if (config.url.startsWith('/api/')) {
      // If the baseURL already ends with /api, remove it from the request URL
      if (baseURL.endsWith('/api')) {
        config.url = config.url.replace('/api/', '/');
      }
    }
    
    console.log('API Request:', config.method, config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle errors here
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient; 