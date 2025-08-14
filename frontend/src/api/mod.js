import client from './client';

// Core moderation
export const fetchPendingListings = () => client.get('/mod/listings/pending').then(r => r.data);
export const approveListing = (id) => client.post(`/mod/listings/${id}/approve`).then(r => r.data);
export const rejectListing = (id, reason) => client.post(`/mod/listings/${id}/reject`, { reason }).then(r => r.data);

export const fetchReports = () => client.get('/mod/reports').then(r => r.data);
export const resolveReport = (id, action = 'none') => client.post(`/mod/reports/${id}/resolve`, { action }).then(r => r.data);

export const blockUser = (userId, block) => client.post(`/mod/users/${userId}/block`, { block }).then(r => r.data);

// Added features
export const fetchStats = () => client.get('/mod/stats').then(r => r.data);
export const listUsers = (params = {}) => client.get('/mod/users', { params }).then(r => r.data);
export const setUserRole = (userId, role) => client.patch(`/mod/users/${userId}/role`, { role }).then(r => r.data);
export const fetchLogs = (params = {}) => client.get('/mod/logs', { params }).then(r => r.data);
export const bulkApprove = (ids) => client.post('/mod/listings/bulk-approve', { ids }).then(r => r.data);
export const bulkReject = (ids, reason) => client.post('/mod/listings/bulk-reject', { ids, reason }).then(r => r.data);
export const getHealth = () => client.get('/mod/health').then(r => r.data);