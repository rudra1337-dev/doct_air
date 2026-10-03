import { apiGet, apiPost } from './api';

export const authService = {
  /**
   * Register a new user
   * @param {{ name: string, email: string, password: string, confirmPassword?: string }} data
   * @returns {Promise<{ success: boolean, message: string, user: Object }>}
   */
  register: (data) => apiPost('/auth/register', data),

  /**
   * Authenticate user credentials
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<{ success: boolean, message: string, user: Object }>}
   */
  login: (credentials) => apiPost('/auth/login', credentials),

  /**
   * Terminate user session and clear auth cookie
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  logout: () => apiPost('/auth/logout'),

  /**
   * Fetch currently authenticated user session
   * @returns {Promise<{ success: boolean, user: Object }>}
   */
  getMe: () => apiGet('/auth/me'),
};

// Aliases for compatibility
export const loginUser = authService.login;
export const registerUser = authService.register;
export const logoutUser = authService.logout;
export const getCurrentUser = authService.getMe;

export default authService;
