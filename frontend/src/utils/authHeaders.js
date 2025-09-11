// Utility to get auth headers for API requests
export const getAuthHeaders = () => {
  const authToken = localStorage.getItem('authToken');
  const adminToken = localStorage.getItem('adminToken');
  
  // Prefer auth token over admin token
  const token = authToken || adminToken;
  
  if (!token) return {};
  
  return {
    Authorization: `Bearer ${token}`,
    ...(adminToken && !authToken ? { 'admin-token': 'superadmin-token' } : {})
  };
};

// Check if we have a valid token (not expired)
export const hasValidToken = () => {
  const authToken = localStorage.getItem('authToken');
  const authExpiry = localStorage.getItem('authTokenExpiry');
  const adminToken = localStorage.getItem('adminToken');
  const adminExpiry = localStorage.getItem('adminTokenExpiry');
  
  const now = Date.now();
  
  if (authToken && authExpiry && parseInt(authExpiry, 10) > now) {
    return true;
  }
  
  if (adminToken && adminExpiry && parseInt(adminExpiry, 10) > now) {
    return true;
  }
  
  return false;
};
