import axios from 'axios';

// Get the API URL from environment variables, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

console.log('Using API URL:', API_URL);

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // You can add auth token here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    // Check if this is the bike-models endpoint
    if (response.config.url.includes('/bike-models')) {
      console.log('INTERCEPTING BIKE MODELS RESPONSE');
      
      // Handle array responses (GET /bike-models)
      if (Array.isArray(response.data)) {
        response.data = response.data.map(model => {
          // Force any COLA5 or X01 model to have is_ebicycle=true
          if ((model.model_name || '').toUpperCase().includes('COLA5') || 
              (model.model_name || '').toUpperCase().includes('X01')) {
            console.log(`⚠️ EMERGENCY API OVERRIDE: Forcing is_ebicycle=true for ${model.model_name}`);
            return { ...model, is_ebicycle: true };
          }
          return model;
        });
      } 
      // Handle single object responses (GET /bike-models/:id)
      else if (response.data && response.data.model_name) {
        if ((response.data.model_name || '').toUpperCase().includes('COLA5') || 
            (response.data.model_name || '').toUpperCase().includes('X01')) {
          console.log(`⚠️ EMERGENCY API OVERRIDE: Forcing is_ebicycle=true for ${response.data.model_name}`);
          response.data = { ...response.data, is_ebicycle: true };
        }
      }
    }
    
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api; 