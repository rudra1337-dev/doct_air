const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = (customHeaders = {}) => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  ...customHeaders,
});

const handleResponse = async (res) => {
  let data;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: res.statusText || 'An unexpected error occurred' };
  }

  if (!res.ok) {
    const error = new Error(data.message || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = data;
    error.errors = data.errors || [];
    throw error;
  }

  return data;
};

export const apiGet = (path, options = {}) =>
  fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: getHeaders(options.headers),
    credentials: 'include', // Send & receive httpOnly session cookies cross-origin
    ...options,
  }).then(handleResponse);

export const apiPost = (path, body, options = {}) =>
  fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: getHeaders(options.headers),
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // Send & receive httpOnly session cookies cross-origin
    ...options,
  }).then(handleResponse);

export const apiPut = (path, body, options = {}) =>
  fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: getHeaders(options.headers),
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    ...options,
  }).then(handleResponse);

export const apiDelete = (path, options = {}) =>
  fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: getHeaders(options.headers),
    credentials: 'include',
    ...options,
  }).then(handleResponse);
