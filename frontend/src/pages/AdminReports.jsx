import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Pagination,
  Stack,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { Report, Visibility, Edit, CheckCircle } from '@mui/icons-material';
import axios from 'axios';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, byStatus: {} });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', reason: '', reportType: '' });
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionDialog, setActionDialog] = useState(false);
  const [actionForm, setActionForm] = useState({
    status: '',
    adminAction: '',
    adminNotes: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filters]);

  const fetchReports = async () => {
    try {
      setLoading(true);
  const params = { page: pagination.page, limit: 10 };
  if (filters.status) params.status = filters.status;
  if (filters.reason) params.reason = filters.reason;
  if (filters.reportType) params.reportType = filters.reportType;
  const response = await axios.get('/api/listings/reports', { params });
      setReports(response.data.reports);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
  const response = await axios.get('/api/listings/reports/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  const handleAction = async () => {
    if (!selectedReport || !actionForm.status) return;

    try {
      setActionLoading(true);
      await axios.put(
        `/api/listings/reports/${selectedReport._id}`,
        actionForm
      );
      setActionDialog(false);
      setSelectedReport(null);
      setActionForm({ status: '', adminAction: '', adminNotes: '' });
      fetchReports();
      fetchStats();
    } catch (err) {
      setError('Failed to update report');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'under_review': return 'info';
      case 'valid': return 'success';
      case 'invalid': return 'error';
      default: return 'default';
    }
  };

  const getReasonLabel = (reason) => {
    const labels = {
      misleading: 'Misleading',
      spammy: 'Spam',
      offensive: 'Offensive',
      inappropriate: 'Inappropriate',
      fraudulent: 'Fraudulent',
      duplicate: 'Duplicate',
      other: 'Other'
    };
    return labels[reason] || reason;
  };

  const getActionLabel = (action) => {
    const labels = {
      none: 'No Action',
      listing_removed: 'Listing Removed',
      listing_hidden: 'Listing Hidden',
      user_warned: 'User Warned',
      user_banned: 'User Banned',
      dismissed: 'Dismissed'
    };
    return labels[action] || action;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Report sx={{ mr: 2 }} />
        Reports Management
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Reports
              </Typography>
              <Typography variant="h4">
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
  </Grid>
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Review
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.pending}
              </Typography>
            </CardContent>
          </Card>
  </Grid>
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Valid Reports
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.byStatus?.valid || 0}
              </Typography>
            </CardContent>
          </Card>
  </Grid>
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Invalid Reports
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats.byStatus?.invalid || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Report Type</InputLabel>
            <Select
              value={filters.reportType}
              label="Report Type"
              onChange={(e) => setFilters(prev => ({ ...prev, reportType: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="listing">Listing</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="under_review">Under Review</MenuItem>
              <MenuItem value="valid">Valid</MenuItem>
              <MenuItem value="invalid">Invalid</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Reason</InputLabel>
            <Select
              value={filters.reason}
              label="Reason"
              onChange={(e) => setFilters(prev => ({ ...prev, reason: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="misleading">Misleading</MenuItem>
              <MenuItem value="spammy">Spam</MenuItem>
              <MenuItem value="offensive">Offensive</MenuItem>
              <MenuItem value="inappropriate">Inappropriate</MenuItem>
              <MenuItem value="fraudulent">Fraudulent</MenuItem>
              <MenuItem value="duplicate">Duplicate</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <Button variant="outlined" onClick={() => setFilters({ status: '', reason: '', reportType: '' })}>
            Clear Filters
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Reports Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Target</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Reporter</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  No reports found
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report._id}>
                  <TableCell>
                    {report.reportType === 'user' ? (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          User: {report.userName || report.userId || 'Unknown User'}
                        </Typography>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {report.listingId?.title || report.listingTitle || 'Unknown Listing'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {report.listingId?.district || ''}{report.listingId?.area ? `, ${report.listingId.area}` : ''}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getReasonLabel(report.reason)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={report.status.replace('_', ' ')}
                      size="small"
                      color={getStatusColor(report.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {report.reporterId || 'Anonymous'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => setSelectedReport(report)}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Edit />}
                        onClick={() => {
                          setSelectedReport(report);
                          setActionDialog(true);
                        }}
                      >
                        Action
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pagination.pages}
            page={pagination.page}
            onChange={(e, page) => setPagination(prev => ({ ...prev, page }))}
            color="primary"
          />
        </Box>
      )}

      {/* Report Details Dialog */}
      <Dialog open={!!selectedReport && !actionDialog} onClose={() => setSelectedReport(null)} maxWidth="md" fullWidth>
        <DialogTitle>Report Details</DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {selectedReport.reportType === 'user'
                  ? `User: ${selectedReport.userName || selectedReport.userId || 'Unknown User'}`
                  : (selectedReport.listingId?.title || selectedReport.listingTitle || 'Unknown Listing')}
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2">Reason:</Typography>
                  <Typography>{getReasonLabel(selectedReport.reason)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2">Status:</Typography>
                  <Chip
                    label={selectedReport.status.replace('_', ' ')}
                    color={getStatusColor(selectedReport.status)}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2">Reporter:</Typography>
                  <Typography>{selectedReport.reporterId || 'Anonymous'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2">Date:</Typography>
                  <Typography>{new Date(selectedReport.createdAt).toLocaleString()}</Typography>
                </Grid>
                {selectedReport.adminAction && selectedReport.adminAction !== 'none' && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2">Admin Action:</Typography>
                    <Typography>{getActionLabel(selectedReport.adminAction)}</Typography>
                  </Grid>
                )}
                {selectedReport.reviewedAt && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2">Reviewed:</Typography>
                    <Typography>{new Date(selectedReport.reviewedAt).toLocaleString()}</Typography>
                  </Grid>
                )}
                {selectedReport.message && (
                  <Grid size={12}>
                    <Typography variant="subtitle2">Message:</Typography>
                    <Typography sx={{ mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                      {selectedReport.message}
                    </Typography>
                  </Grid>
                )}
                {selectedReport.adminNotes && (
                  <Grid size={12}>
                    <Typography variant="subtitle2">Admin Notes:</Typography>
                    <Typography sx={{ mt: 1, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      {selectedReport.adminNotes}
                    </Typography>
                  </Grid>
                )}
                {Array.isArray(selectedReport.proofUrls) && selectedReport.proofUrls.length > 0 && (
                  <Grid size={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Proof Attachments:</Typography>
                    <Grid container spacing={2}>
                      {selectedReport.proofUrls.map((url, idx) => (
                        <Grid key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
                          <Box
                            component="a"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: 'block',
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              overflow: 'hidden',
                              textDecoration: 'none'
                            }}
                          >
                            {/(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/i.test(url) ? (
                              <Box
                                component="img"
                                src={url}
                                alt={`proof-${idx + 1}`}
                                sx={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <Box sx={{ p: 2 }}>
                                <Typography variant="body2" color="primary.main">
                                  Open attachment #{idx + 1}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                                  {url}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedReport(null)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => setActionDialog(true)}
            startIcon={<Edit />}
          >
            Take Action
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialog} onClose={() => !actionLoading && setActionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Take Action on Report</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Status *</InputLabel>
              <Select
                value={actionForm.status}
                label="Status *"
                onChange={(e) => setActionForm(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="under_review">Under Review</MenuItem>
                <MenuItem value="valid">Valid Report</MenuItem>
                <MenuItem value="invalid">Invalid Report</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Action</InputLabel>
              <Select
                value={actionForm.adminAction}
                label="Action"
                onChange={(e) => setActionForm(prev => ({ ...prev, adminAction: e.target.value }))}
              >
                <MenuItem value="none">No Action</MenuItem>
                <MenuItem value="listing_removed">Remove Listing</MenuItem>
                <MenuItem value="listing_hidden">Hide Listing</MenuItem>
                <MenuItem value="user_warned">Warn User</MenuItem>
                <MenuItem value="user_banned">Ban User</MenuItem>
                <MenuItem value="dismissed">Dismiss Report</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Admin Notes"
              placeholder="Internal notes about this report..."
              value={actionForm.adminNotes}
              onChange={(e) => setActionForm(prev => ({ ...prev, adminNotes: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleAction}
            variant="contained"
            disabled={actionLoading || !actionForm.status}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {actionLoading ? 'Processing...' : 'Submit Action'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminReports;
