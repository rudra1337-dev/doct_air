const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return {
    'Content-Type': 'application/json',
    ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
  };
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const apiGet = (path) =>
  fetch(`${BASE_URL}${path}`, { headers: getHeaders() }).then(handleResponse);

export const apiPost = (path, body) =>
  fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiPut = (path, body) =>
  fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  }).then(handleResponse);

export const apiDelete = (path) =>
  fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse);
