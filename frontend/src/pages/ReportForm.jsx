import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Breadcrumbs,
  Link,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  CircularProgress,
  Card,
  CardMedia,
  IconButton,
  Grid
} from '@mui/material';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import ReportIcon from '@mui/icons-material/Report';
import PersonIcon from '@mui/icons-material/Person';
import HomeIcon from '@mui/icons-material/Home';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import VideoFile from '@mui/icons-material/VideoFile';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { useAuth } from '../auth';

const ReportForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useAuth();

  // Get pre-filled data from URL params
  const prefilledType = searchParams.get('type') || 'listing';
  const prefilledId = searchParams.get('id') || '';
  const prefilledOwner = searchParams.get('owner') || '';
  const prefilledTitle = searchParams.get('title') || '';

  const [reportType, setReportType] = useState(prefilledType);
  const [targetTitle, setTargetTitle] = useState(prefilledTitle);
  const [targetName, setTargetName] = useState('');
  const [targetId, setTargetId] = useState(prefilledId);
  const [targetOwner, setTargetOwner] = useState(prefilledOwner);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [proofFiles, setProofFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleTypeChange = (event) => {
    setReportType(event.target.value);
  setTargetTitle('');
  setTargetName('');
  setTargetId('');
  setTargetOwner('');
    setReason(''); // Clear reason when type changes
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (reportType === 'listing' && !targetTitle.trim()) {
      setError('Please enter the listing title');
      return;
    }

    if (reportType === 'user' && !targetName.trim()) {
      setError('Please enter the user name');
      return;
    }

    if (!reason) {
      setError('Please select a reason for the report');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const formData = new FormData();
      formData.append('reportType', reportType);
      formData.append('reason', reason);
      formData.append('message', message.trim());

      if (reportType === 'listing') {
        formData.append('listingTitle', targetTitle.trim());
        if (targetId) formData.append('listingId', targetId);
        if (targetOwner) formData.append('userId', targetOwner);
      } else {
        formData.append('userName', targetName.trim());
        if (targetOwner) formData.append('userId', targetOwner);
      }

      // Add proof files
      proofFiles.forEach((file, index) => {
        formData.append('proof', file);
      });

      await axios.post('/api/listings/reports', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(true);

      // Redirect to reports page after 2 seconds
      setTimeout(() => {
        navigate('/reports');
      }, 2000);

    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to submit report';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setError('Some files were rejected. Only images and videos under 10MB are allowed.');
    }

    setProofFiles(prev => [...prev, ...validFiles]);
    event.target.value = ''; // Reset input
  };

  const removeFile = (index) => {
    setProofFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getReasonOptions = () => {
    if (reportType === 'listing') {
      return [
        { value: 'misleading', label: 'Misleading Information' },
        { value: 'spammy', label: 'Spam or Advertising' },
        { value: 'offensive', label: 'Offensive Content' },
        { value: 'inappropriate', label: 'Inappropriate Content' },
        { value: 'fraudulent', label: 'Fraudulent Listing' },
        { value: 'duplicate', label: 'Duplicate Listing' },
        { value: 'other', label: 'Other' }
      ];
    } else {
      return [
        { value: 'harassment', label: 'Harassment or Threats' },
        { value: 'spam_account', label: 'Spam Account' },
        { value: 'fake_account', label: 'Fake Account' },
        { value: 'inappropriate_behavior', label: 'Inappropriate Behavior' },
        { value: 'scam_attempt', label: 'Scam Attempt' },
        { value: 'other', label: 'Other' }
      ];
    }
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
          You must be logged in to submit a report.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/login')}>
          Login to Continue
        </Button>
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ p: 3, maxWidth: '600px', mx: 'auto', textAlign: 'center' }}>
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <ReportIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2, color: 'success.main' }}>
            Report Submitted Successfully!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Thank you for helping us maintain a safe community. Our moderation team will review your report and take appropriate action.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You will be redirected to your reports page shortly...
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link component={RouterLink} to="/" underline="hover" color="inherit">
          Home
        </Link>
        <Typography color="text.primary">Submit Report</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ReportIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Submit a Report
        </Typography>
      </Box>

      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Help us maintain a safe and trustworthy community by reporting inappropriate content or behavior.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* Report Type Selection */}
          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
              What would you like to report?
            </FormLabel>
            <RadioGroup
              row
              value={reportType}
              onChange={handleTypeChange}
            >
              <FormControlLabel
                value="listing"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <HomeIcon sx={{ mr: 1 }} />
                    Listing
                  </Box>
                }
              />
              <FormControlLabel
                value="user"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1 }} />
                    User
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {/* Target Title/Name and IDs */}
          {reportType === 'listing' ? (
            <TextField
              fullWidth
              label="Listing Title"
              value={targetTitle}
              onChange={(e) => setTargetTitle(e.target.value)}
              placeholder="Enter the title of the listing you want to report"
              sx={{ mb: 3 }}
              required
            />
          ) : (
            <TextField
              fullWidth
              label="User Name"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder="Enter the name of the user you want to report"
              sx={{ mb: 3 }}
              required
            />
          )}

          {/* Hidden ID fields for traceability (prefilled via URL when coming from listing details) */}
          {reportType === 'listing' && (
            <Box sx={{ display: 'none' }}>
              <input type="hidden" name="listingId" value={targetId} readOnly />
              <input type="hidden" name="userId" value={targetOwner} readOnly />
            </Box>
          )}

          {/* Reason Selection */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Reason for Report</InputLabel>
            <Select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              label="Reason for Report"
              required
            >
              {getReasonOptions().map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Additional Message */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Additional Details (Optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Please provide any additional context or details about this report..."
            sx={{ mb: 3 }}
          />

          {/* Proof Upload Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Add Proof (Optional)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload images or videos as evidence for your report (max 10MB each)
            </Typography>

            <input
              accept="image/*,video/*"
              style={{ display: 'none' }}
              id="proof-upload"
              multiple
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="proof-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<PhotoCamera />}
                sx={{ mb: 2 }}
              >
                Upload Files
              </Button>
            </label>

            {proofFiles.length > 0 && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {proofFiles.map((file, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{ position: 'relative' }}>
                      {file.type.startsWith('image/') ? (
                        <CardMedia
                          component="img"
                          height="140"
                          image={URL.createObjectURL(file)}
                          alt={`Proof ${index + 1}`}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 140,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'grey.100'
                          }}
                        >
                          <VideoFile sx={{ fontSize: 48, color: 'grey.500' }} />
                        </Box>
                      )}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          borderRadius: '50%'
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => removeFile(index)}
                          sx={{ color: 'white' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          bottom: 8,
                          left: 8,
                          color: 'white',
                          bgcolor: 'rgba(0,0,0,0.6)',
                          px: 1,
                          borderRadius: 1
                        }}
                      >
                        {file.name}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          {/* Submit Button */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{
                backgroundColor: '#ef4444',
                '&:hover': {
                  backgroundColor: '#dc2626'
                },
                minWidth: 120
              }}
            >
              {submitting ? <CircularProgress size={24} /> : 'Submit Report'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/')}
              disabled={submitting}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default ReportForm;
