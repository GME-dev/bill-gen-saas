import axios from 'axios';

class ApiClient {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || '/api';
    
    console.log('Using API URL:', this.baseURL);
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  getFullUrl(url) {
    // Replace any double slashes except after http: or https:
    return `${this.baseURL}${url}`.replace(/([^:])\/\//g, '$1/');
  }
  
  getHeaders() {
    return {
      'Content-Type': 'application/json'
    };
  }

  async get(url, config = {}) {
    // Special handling for PDF endpoints
    if (url.includes('/pdf')) {
      console.log('PDF request detected:', url);
      
      try {
        // Use fetch API for PDF requests
        const response = await fetch(this.getFullUrl(url), {
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
      const response = await this.axiosInstance.get(url, config);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async post(url, data, config = {}) {
    try {
      const response = await this.axiosInstance.post(url, data, config);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async put(url, data, config = {}) {
    try {
      const response = await this.axiosInstance.put(url, data, config);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }
  
  async patch(url, data, config = {}) {
    try {
      const response = await this.axiosInstance.patch(url, data, config);
      return response.data;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async delete(url, config = {}) {
    try {
      const response = await this.axiosInstance.delete(url, config);
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