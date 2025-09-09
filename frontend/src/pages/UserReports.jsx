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
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link as MuiLink,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import ReportIcon from '@mui/icons-material/Report';
import axios from 'axios';
import { useAuth } from '../auth';
import { getAuthHeaders } from '../utils/authHeaders';

const UserReports = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    console.log('UserReports useEffect - isLoading:', isLoading, 'user:', user);
    if (!isLoading && user) {
      fetchUserReports();
    } else if (!isLoading && !user) {
      console.log('No user found after loading completed');
      setError('Please log in to view your reports.');
      setLoading(false);
    }
  }, [isLoading, user]);

  const fetchUserReports = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get('/api/listings/my-reports', {
        headers: getAuthHeaders()
      });

      setReports(response.data || []);
    } catch (err) {
      console.error('Fetch reports error:', err);
      const status = err?.response?.status;
      const errorData = err?.response?.data;

      if (status === 401) {
        // Don't nuke tokens or force logout here; just show a helpful message.
        setError('We could not verify your session for this request. Please refresh or log in again.');
      } else {
        setError(`Failed to fetch your reports. Server returned status ${status || 'unknown'}. ${errorData?.error || ''}`);
      }
    } finally {
      setLoading(false);
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
      // Listing reasons
      misleading: 'Misleading Information',
      spammy: 'Spam or Advertising',
      offensive: 'Offensive Content',
      inappropriate: 'Inappropriate Content',
      fraudulent: 'Fraudulent Listing',
      duplicate: 'Duplicate Listing',
      // User reasons
      harassment: 'Harassment or Threats',
      spam_account: 'Spam Account',
      fake_account: 'Fake Account',
      inappropriate_behavior: 'Inappropriate Behavior',
      scam_attempt: 'Scam Attempt',
      // General
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
      user_suspended: 'User Suspended',
      dismissed: 'Dismissed'
    };
    return labels[action] || action;
  };

  // Check authentication
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3, maxWidth: '600px', mx: 'auto', textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          You must be logged in to view your reports.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/login')}>
          Login to Continue
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} to="/" underline="hover" color="inherit">
          Home
        </MuiLink>
        <Typography color="text.primary">My Reports</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ReportIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />

      {/* Details Dialog */}
      <Dialog open={!!selectedReport} onClose={() => setSelectedReport(null)} maxWidth="md" fullWidth>
        <DialogTitle>Report Details</DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {selectedReport.reportType === 'listing'
                  ? (selectedReport.listingId?.title || selectedReport.listingTitle || 'Unknown Listing')
                  : (selectedReport.userName || `User ${String(selectedReport.userId || '').substring(0, 8)}...`)}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Reason:</Typography>
                  <Typography>{getReasonLabel(selectedReport.reason)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Status:</Typography>
                  <Chip label={selectedReport.status.replace('_',' ')} color={getStatusColor(selectedReport.status)} size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Submitted:</Typography>
                  <Typography>{new Date(selectedReport.createdAt).toLocaleString()}</Typography>
                </Grid>
                {selectedReport.reviewedAt && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Reviewed:</Typography>
                    <Typography>{new Date(selectedReport.reviewedAt).toLocaleString()}</Typography>
                  </Grid>
                )}

                {selectedReport.message && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Your Message:</Typography>
                    <Typography sx={{ mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                      {selectedReport.message}
                    </Typography>
                  </Grid>
                )}

                {(selectedReport.adminAction && selectedReport.adminAction !== 'none') || selectedReport.adminNotes ? (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Admin Response:</Typography>
                    <Box sx={{ mt: 1, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      {selectedReport.adminAction && selectedReport.adminAction !== 'none' && (
                        <Typography sx={{ mb: 1 }}>Action: {getActionLabel(selectedReport.adminAction)}</Typography>
                      )}
                      {selectedReport.adminNotes && (
                        <Typography>Notes: {selectedReport.adminNotes}</Typography>
                      )}
                    </Box>
                  </Grid>
                ) : null}

                {Array.isArray(selectedReport.proofUrls) && selectedReport.proofUrls.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Your Attachments:</Typography>
                    <Grid container spacing={2}>
                      {selectedReport.proofUrls.map((url, idx) => (
                        <Grid key={idx} item xs={12} sm={6} md={4}>
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
                              <Box component="img" src={url} alt={`attachment-${idx+1}`} sx={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <Box sx={{ p: 2 }}>
                                <Typography variant="body2" color="primary.main">Open attachment #{idx+1}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>{url}</Typography>
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
        </DialogActions>
      </Dialog>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          My Reports
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <Button size="small" variant="outlined" onClick={() => navigate('/login')}>Login</Button>
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Here you can view all the reports you've submitted for both listings and users. Our moderation team reviews each report carefully and takes appropriate action when necessary.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          If you have any questions about a report, please contact our support team.
        </Typography>
        <Button
          variant="contained"
          startIcon={<ReportIcon />}
          onClick={() => navigate('/report-form')}
          sx={{
            backgroundColor: '#ef4444',
            '&:hover': {
              backgroundColor: '#dc2626'
            }
          }}
        >
          Submit New Report
        </Button>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Admin Action</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    You haven't submitted any reports yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report._id}>
                  <TableCell>
                    <Chip
                      label={report.reportType === 'listing' ? 'Listing' : 'User'}
                      size="small"
                      color={report.reportType === 'listing' ? 'primary' : 'secondary'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {report.reportType === 'listing' ? (
                      <>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {report.listingId?.title || 'Unknown Listing'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {report.listingId?._id || report.listingId}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {report.reportedUser?.name || `User ${report.userId?.substring(0, 8)}...`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {report.userId?.substring(0, 8)}...
                        </Typography>
                      </>
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
                      {new Date(report.createdAt).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(report.createdAt).toLocaleTimeString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {report.adminAction && report.adminAction !== 'none' ? (
                      <Chip
                        label={getActionLabel(report.adminAction)}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Pending
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" onClick={() => setSelectedReport(report)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default UserReports;
