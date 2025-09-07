import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material';
import {
  CloudUpload,
  FileUpload,
  Assessment,
  CheckCircle,
  Visibility
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import adminAPI from '../services/adminAPI';

const WebScrapingUpload = () => {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setUploadedFile(file);
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file to backend
      const result = await adminAPI.uploadScrapedData(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploading(false);
      
      setUploadResult(result);
      setSuccessMessage('File uploaded and processed successfully!');
      
    } catch (error) {
      setUploading(false);
      setUploadProgress(0);
      setError(error.message || 'Upload failed');
      console.error('Upload error:', error);
    }
  };

  const handlePreview = () => {
    if (!uploadResult) return;
    
    // Generate sample preview data based on upload results
    const mockData = [
      {
        title: "3 Bedroom Apartment",
        property_type: "Family",
        area: uploadResult.area || "Unknown Area",
        district: uploadResult.district || "Unknown District",
        rent: 25000,
        rent_category: "Premium (15k-30k)",
        bedrooms: 3,
        bathrooms: 2,
        status: "valid"
      },
      {
        title: "",
        property_type: "Bachelor",
        area: uploadResult.area || "Unknown Area",
        district: uploadResult.district || "Unknown District",
        rent: 8000,
        rent_category: "Mid-range (5k-15k)",
        bedrooms: 1,
        bathrooms: 1,
        status: "missing_title"
      }
    ];
    setPreviewData(mockData);
    setPreviewOpen(true);
  };

  const handleValidateData = () => {
    if (uploadResult && uploadResult.validationId) {
      navigate(`/admin-panel/data-validation?validationId=${uploadResult.validationId}`);
    } else {
      navigate('/admin-panel/data-validation');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid': return 'success';
      case 'missing_title': return 'warning';
      case 'invalid_price': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} mb={3} sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Web Scraping Data Upload
      </Typography>

      {/* Error/Success Messages */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!successMessage} 
        autoHideDuration={4000} 
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <CloudUpload sx={{ fontSize: 80, color: '#667eea', mb: 2 }} />
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Upload Scraped Property Data
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Upload CSV files containing property data scraped from Bikroy, Bproperty, or other platforms
                </Typography>
                
                <input
                  accept=".csv"
                  style={{ display: 'none' }}
                  id="csv-upload"
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label htmlFor="csv-upload">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={<FileUpload />}
                    disabled={uploading}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: 2,
                      px: 4,
                      py: 1.5
                    }}
                  >
                    {uploading ? 'Processing...' : 'Choose CSV File'}
                  </Button>
                </label>

                {uploadedFile && (
                  <Box mt={2}>
                    <Typography variant="body2" color="text.secondary">
                      Selected: {uploadedFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Size: {(uploadedFile.size / 1024).toFixed(1)} KB
                    </Typography>
                  </Box>
                )}

                {uploading && (
                  <Box mt={3}>
                    <LinearProgress 
                      variant="determinate" 
                      value={uploadProgress} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" mt={1}>
                      Processing... {uploadProgress}%
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Results Section */}
        <Grid size={{ xs: 12, md: 6 }}>
          {uploadResult && (
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
                  <Typography variant="h6" fontWeight={600}>
                    Upload Complete
                  </Typography>
                </Box>

                <Box mb={3}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    File: {uploadResult.filename}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Area: {uploadResult.area}, {uploadResult.district}
                  </Typography>
                </Box>

                <Grid container spacing={2} mb={3}>
                  <Grid xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                      <Typography variant="h5" fontWeight={700} color="primary.main">
                        {uploadResult.totalRecords}
                      </Typography>
                      <Typography variant="body2">Total Records</Typography>
                    </Paper>
                  </Grid>
                  <Grid xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e8' }}>
                      <Typography variant="h5" fontWeight={700} color="success.main">
                        {uploadResult.validRecords}
                      </Typography>
                      <Typography variant="body2">Valid Records</Typography>
                    </Paper>
                  </Grid>
                  <Grid xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                      <Typography variant="h5" fontWeight={700} color="warning.main">
                        {uploadResult.invalidRecords}
                      </Typography>
                      <Typography variant="body2">Need Review</Typography>
                    </Paper>
                  </Grid>
                  <Grid xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee' }}>
                      <Typography variant="h5" fontWeight={700} color="error.main">
                        {uploadResult.duplicates}
                      </Typography>
                      <Typography variant="body2">Duplicates</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={handlePreview}
                    size="small"
                  >
                    Preview Data
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Assessment />}
                    onClick={handleValidateData}
                    size="small"
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                  >
                    Validate Data
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {!uploadResult && (
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ textAlign: 'center', p: 3, color: 'text.secondary' }}>
                  <Assessment sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h6" mb={1}>
                    Upload Results
                  </Typography>
                  <Typography variant="body2">
                    Upload a CSV file to see processing results and validation statistics
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Instructions */}
      <Card sx={{ mt: 4 }} elevation={1}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Expected CSV Format
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Your CSV file should contain the following columns:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[
              'title', 'property_type', 'area', 'district', 'location', 'rent',
              'rent_category', 'bedrooms', 'rooms', 'bathrooms', 'available_from', 'url'
            ].map((column) => (
              <Chip
                key={column}
                label={column}
                size="small"
                variant="outlined"
                sx={{ fontFamily: 'monospace' }}
              />
            ))}
          </Box>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Tip:</strong> You can upload any of the CSV files from the massive_property_data folder to test this feature!
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog 
        open={previewOpen} 
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Data Preview</DialogTitle>
        <DialogContent>
          <Box sx={{ overflow: 'auto' }}>
            {previewData.map((row, index) => (
              <Card key={index} sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {row.title || 'No Title'}
                    </Typography>
                    <Chip 
                      label={row.status.replace('_', ' ')}
                      color={getStatusColor(row.status)}
                      size="small"
                    />
                  </Box>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">Type</Typography>
                      <Typography variant="body2">{row.property_type}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">Location</Typography>
                      <Typography variant="body2">{row.area}, {row.district}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">Rent</Typography>
                      <Typography variant="body2">৳{row.rent.toLocaleString()}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">Category</Typography>
                      <Typography variant="body2">{row.rent_category}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WebScrapingUpload;
