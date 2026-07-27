export function getAuthToken() {
  return localStorage.getItem('authToken') || '';
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export function hasAuthSession() {
  return !!localStorage.getItem('authToken');
}

export function getBearerAuthHeader() {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`
  };
}
