import { apiPost } from './api';

export const loginUser    = (credentials) => apiPost('/auth/login', credentials);
export const registerUser = (userData)    => apiPost('/auth/register', userData);
