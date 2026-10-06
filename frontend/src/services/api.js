import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Pre-configured Axios instance for DoctAir API requests
 */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send and receive cross-origin httpOnly session cookies
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Response interceptor to unwrap data and normalize errors consistently
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    // Pass through cancellation and abort errors untouched
    if (axios.isCancel(error) || error.name === 'CanceledError' || error.name === 'AbortError') {
      return Promise.reject(error);
    }

    let data = error.response?.data;

    // Handle stream response error bodies if readable
    if (data && typeof data.getReader === 'function') {
      try {
        const reader = data.getReader();
        const decoder = new TextDecoder('utf-8');
        let text = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
        }
        data = JSON.parse(text);
      } catch {
        data = { success: false, message: 'Stream request failed' };
      }
    }

    const message = data?.message || error.message || 'An unexpected error occurred';
    const customError = new Error(message);
    customError.status = error.response?.status;
    customError.data = data || { success: false, message };
    customError.errors = data?.errors || [];
    return Promise.reject(customError);
  }
);

/**
 * Standard HTTP helper methods matching previous API contracts
 */
export const apiGet = (path, config = {}) => apiClient.get(path, config);
export const apiPost = (path, body, config = {}) => apiClient.post(path, body, config);
export const apiPut = (path, body, config = {}) => apiClient.put(path, body, config);
export const apiDelete = (path, config = {}) => apiClient.delete(path, config);

export default apiClient;
