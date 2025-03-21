import axios from 'axios';

class ApiClient {
  constructor() {
    // Get the base URL from environment or use a relative path
    let baseURL = import.meta.env.VITE_API_URL || '/api';
    
    // Remove trailing slash if present
    baseURL = baseURL.replace(/\/$/, '');
    
    // Store if the baseURL already includes /api
    this.baseURLHasApiPrefix = baseURL.endsWith('/api');
    
    console.log('Using API URL:', baseURL);
    console.log('Base URL has /api prefix:', this.baseURLHasApiPrefix);
    
    this.baseURL = baseURL;
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  getFullUrl(url) {
    // Ensure url starts with a slash
    const urlWithSlash = url.startsWith('/') ? url : `/${url}`;
    
    // If URL starts with /api/ and baseURL already ends with /api, remove the duplicate prefix
    if (this.baseURLHasApiPrefix && urlWithSlash.startsWith('/api/')) {
      return `${this.baseURL}${urlWithSlash.substring(4)}`;
    }
    
    // Regular path joining with baseURL
    return `${this.baseURL}${urlWithSlash}`;
  }
  
  getHeaders() {
    return {
      'Content-Type': 'application/json'
    };
  }

  async get(url, config = {}) {
    // Remove any /api prefix from URL if baseURL already has it
    const processedUrl = this.baseURLHasApiPrefix && url.startsWith('/api/') 
      ? url.substring(4) 
      : url;
    
    // Special handling for PDF endpoints
    if (processedUrl.includes('/pdf')) {
      console.log('PDF request detected:', processedUrl);
      
      try {
        // Use fetch API for PDF requests
        const response = await fetch(this.getFullUrl(processedUrl), {
          method: 'GET',
          headers: this.getHeaders(),
          ...config
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`PDF request failed with status ${response.status}:`, errorText);
          
          try {
            // Try to parse as JSON if possible
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || errorJson.details || `Server returned status ${response.status}`);
          } catch (parseError) {
            // If not JSON, use the raw text or status
            throw new Error(`PDF request failed with status ${response.status}: ${errorText.substring(0, 100)}`);
          }
        }
        
        // Return the blob for preview/download
        return await response.blob();
      } catch (error) {
        console.error('Error fetching PDF:', error);
        throw error;
      }
    }

    // Regular API request
    try {
      const response = await this.axiosInstance.get(processedUrl, config);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async post(url, data, config = {}) {
    // Remove any /api prefix from URL if baseURL already has it
    const processedUrl = this.baseURLHasApiPrefix && url.startsWith('/api/') 
      ? url.substring(4) 
      : url;
    
    try {
      const response = await this.axiosInstance.post(processedUrl, data, config);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async put(url, data, config = {}) {
    // Remove any /api prefix from URL if baseURL already has it
    const processedUrl = this.baseURLHasApiPrefix && url.startsWith('/api/') 
      ? url.substring(4) 
      : url;
    
    try {
      const response = await this.axiosInstance.put(processedUrl, data, config);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }
  
  async patch(url, data, config = {}) {
    // Remove any /api prefix from URL if baseURL already has it
    const processedUrl = this.baseURLHasApiPrefix && url.startsWith('/api/') 
      ? url.substring(4) 
      : url;
    
    try {
      const response = await this.axiosInstance.patch(processedUrl, data, config);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async delete(url, config = {}) {
    // Remove any /api prefix from URL if baseURL already has it
    const processedUrl = this.baseURLHasApiPrefix && url.startsWith('/api/') 
      ? url.substring(4) 
      : url;
    
    try {
      const response = await this.axiosInstance.delete(processedUrl, config);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  _handleError(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', error.response.status, error.response.data);
      if (error.response.data && error.response.data.error) {
        error.message = error.response.data.error;
      } else if (error.response.data && error.response.data.message) {
        error.message = error.response.data.message;
      } else {
        error.message = `Server error: ${error.response.status}`;
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Error: No response received');
      error.message = 'No response from server';
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Error:', error.message);
    }
  }
}

const apiClient = new ApiClient();

export default apiClient; 