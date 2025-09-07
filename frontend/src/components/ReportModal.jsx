import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { ReportProblem } from '@mui/icons-material';
import axios from 'axios';

const ReportModal = ({ open, onClose, listingId, listingTitle }) => {
  const [formData, setFormData] = useState({
    reason: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const reasons = [
    { value: 'misleading', label: 'Misleading Information' },
    { value: 'spammy', label: 'Spam or Advertising' },
    { value: 'offensive', label: 'Offensive Content' },
    { value: 'inappropriate', label: 'Inappropriate Content' },
    { value: 'fraudulent', label: 'Fraudulent Listing' },
    { value: 'duplicate', label: 'Duplicate Listing' },
    { value: 'other', label: 'Other' }
  ];

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.reason) {
      setError('Please select a reason for reporting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('/api/listings/reports', {
        reportType: 'listing',
        listingId,
        listingTitle,
        reason: formData.reason,
        message: formData.message
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({ reason: '', message: '' });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setFormData({ reason: '', message: '' });
      setError('');
      setSuccess(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ReportProblem color="error" />
        Report Listing
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            You are reporting: <strong>{listingTitle}</strong>
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Report submitted successfully! Thank you for helping keep our platform safe.
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Reason for Report *</InputLabel>
            <Select
              value={formData.reason}
              label="Reason for Report *"
              onChange={handleChange('reason')}
              required
            >
              {reasons.map((reason) => (
                <MenuItem key={reason.value} value={reason.value}>
                  {reason.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Additional Details (Optional)"
            placeholder="Please provide any additional information that might help us understand the issue..."
            value={formData.message}
            onChange={handleChange('message')}
            helperText="Maximum 500 characters"
            inputProps={{ maxLength: 500 }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Your report will be reviewed by our moderation team. We take all reports seriously and will take appropriate action if needed.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="error"
          disabled={loading || !formData.reason}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportModal;
