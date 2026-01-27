/**
 * API Configuration
 * 
 * This module provides the API URL configuration for both local and deployed environments.
 * 
 * - Local development: Uses http://localhost:5000
 * - Production/Deployed: Uses the VITE_API_URL from environment variables
 * 
 * Usage:
 * import { getApiUrl } from './config/api';
 * const url = getApiUrl();
 * fetch(`${url}/api/endpoint`);
 */

/**
 * Get the API URL based on the current environment
 * @returns The base URL for API calls
 */
export const getApiUrl = (): string => {
  // For browser environment (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For Node.js environment (SSR or server-side)
  if (typeof process !== 'undefined' && process.env?.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  
  // Fallback for deployed environment (Netlify Functions)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/.netlify/functions/server-cjs';
  }
  
  // Default fallback for local development
  return 'http://localhost:5000';
};

// Export a default instance for convenience
export const API_URL = getApiUrl();
