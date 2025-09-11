// API configuration for different environments
const config = {
  development: {
    API_BASE_URL: 'http://localhost:5000'
  },
  production: {
    API_BASE_URL: '' // Use relative URLs in production (same domain)
  }
};

const environment = process.env.NODE_ENV || 'development';
export const API_BASE_URL = config[environment].API_BASE_URL;

// For convenience, also export the full API URL
export const API_URL = API_BASE_URL + '/api';
