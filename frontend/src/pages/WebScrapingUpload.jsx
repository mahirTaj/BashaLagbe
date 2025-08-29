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
  Snackbar,
  IconButton
} from '@mui/material';
import {
  CloudUpload,
  FileUpload,
  Assessment,
  CheckCircle,
  Visibility,
  Close
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import adminAPI from '../services/adminAPI';

const WebScrapingUpload = () => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [filesMeta, setFilesMeta] = useState([]); // [{file, progress, result, preview, loadingPreview, directSubmitting, directSubmitted}]
  const [activePreview, setActivePreview] = useState(null); // index of file meta for preview dialog
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [submittingAll, setSubmittingAll] = useState(false);

  // When uploadResult arrives, fetch real validation data for preview
  const fetchPreviewFor = async (idx) => {
    const meta = filesMeta[idx];
    if (!meta?.result?.validationId) return;
    setFilesMeta(m=> m.map((f,i)=> i===idx? { ...f, loadingPreview:true }: f));
    try {
      const results = await adminAPI.getValidationResults(meta.result.validationId);
      const valid = (results.validData || []).slice(0, 20).map(r => ({ ...r, __status: 'valid' }));
      const invalid = (results.invalidData || []).slice(0, 20).map(r => ({ ...r, __status: 'invalid' }));
      setFilesMeta(m=> m.map((f,i)=> i===idx? { ...f, preview:[...valid,...invalid], loadingPreview:false }: f));
    } catch (e) {
      console.error(e);
      setFilesMeta(m=> m.map((f,i)=> i===idx? { ...f, loadingPreview:false }: f));
    }
  };

  const handleFileUpload = async (e) => {
    const fileList = Array.from(e.target.files || []);
    if (!fileList.length) return;
    const newEntries = fileList.filter(f => f.name.endsWith('.csv')).map(f => ({ file:f, progress:0, result:null, preview:[], loadingPreview:false, directSubmitting:false, directSubmitted:false }));
    setFilesMeta(prev => [...prev, ...newEntries]);
    setUploading(true);
    for (let i = 0; i < newEntries.length; i++) {
      const globalIndex = filesMeta.length + i;
      // simulate progress
      let p = 0; const interval = setInterval(()=> {
        p += 10; if (p>=90) { clearInterval(interval); p=90; }
        setFilesMeta(m=> m.map((f,idx)=> idx===globalIndex? { ...f, progress:p }: f));
      }, 150);
      try {
        const result = await adminAPI.uploadScrapedData(newEntries[i].file);
        clearInterval(interval);
        setFilesMeta(m=> m.map((f,idx)=> idx===globalIndex? { ...f, progress:100, result }: f));
        setSuccessMessage(`Uploaded ${newEntries[i].file.name}`);
      } catch(err) {
        clearInterval(interval);
        setFilesMeta(m=> m.map((f,idx)=> idx===globalIndex? { ...f, error: err.message || 'Upload failed' }: f));
        setError(err.message || 'Upload failed');
      }
    }
    setUploading(false);
  };

  const openPreview = (idx) => {
    setActivePreview(idx);
    const meta = filesMeta[idx];
    if (!meta.preview || meta.preview.length === 0) fetchPreviewFor(idx);
  };

  const handleValidateData = (idx) => {
    const meta = filesMeta[idx];
    if (meta?.result?.validationId) navigate(`/admin-panel/data-validation?validationId=${meta.result.validationId}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid':
      case 'success':
        return 'success';
      case 'invalid':
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleDirectSubmit = async (idx) => {
    const meta = filesMeta[idx];
    if (!meta?.result?.validationId) return;
    setFilesMeta(m=> m.map((f,i)=> i===idx? { ...f, directSubmitting:true }: f));
    try {
      const resp = await adminAPI.submitValidatedData(meta.result.validationId);
      setFilesMeta(m=> m.map((f,i)=> i===idx? { ...f, directSubmitting:false, directSubmitted:true }: f));
      setSuccessMessage(`Inserted ${resp.inserted} records from ${meta.file.name}`);
    } catch (e) {
      setError(e.message || 'Direct submit failed');
      setFilesMeta(m=> m.map((f,i)=> i===idx? { ...f, directSubmitting:false }: f));
    }
  };

  const handleSubmitAll = async () => {
    const ready = filesMeta.filter(f => f.result && f.result.invalidRecords===0 && f.result.validRecords>0 && !f.directSubmitted);
    if (!ready.length) return;
    setSubmittingAll(true);
    for (let fileMeta of ready) {
      const idx = filesMeta.indexOf(fileMeta);
      await handleDirectSubmit(idx); // sequential to avoid server overload
    }
    setSubmittingAll(false);
  };

  const handleDeleteFile = (index) => {
    setFilesMeta(current => current.filter((_, i) => i !== index));
    // Close preview if it was showing this file
    if (activePreview === index) {
      setActivePreview(null);
    } else if (activePreview !== null && activePreview > index) {
      setActivePreview(activePreview - 1);
    }
  };

  const allReadyForSubmit = filesMeta.length>0 && filesMeta.every(f=> f.result && f.result.invalidRecords===0 && f.result.validRecords>0 && (f.directSubmitted || !f.directSubmitting));

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
        <Grid item xs={12} md={5}>
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
                
                <input multiple accept=".csv" style={{ display:'none' }} id="csv-upload" type="file" onChange={handleFileUpload} />
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

                {filesMeta.length===0 && <Typography variant="body2" mt={2} color="text.secondary">Select one or more CSV files.</Typography>}
                {filesMeta.length>0 && (
                  <Box mt={2} sx={{ maxHeight:260, overflow:'auto', textAlign:'left' }}>
                    {filesMeta.map((f,i)=>(
                      <Box key={i} sx={{ mb:1, p:1, border:'1px solid #e0e0e0', borderRadius:1, position: 'relative' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography variant="body2" fontWeight={600} sx={{ flex: 1, pr: 1 }}>{f.file.name}</Typography>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteFile(i)}
                            sx={{ 
                              color: 'text.secondary',
                              '&:hover': { color: 'error.main', bgcolor: 'error.light' },
                              ml: 1
                            }}
                            title="Remove file"
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </Box>
                        <LinearProgress variant="determinate" value={f.progress} sx={{ height:6, borderRadius:3, mt:0.5 }} />
                        {f.error && <Typography variant="caption" color="error.main">{f.error}</Typography>}
                        {f.result && (
                          <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mt:1 }}>
                            <Chip size="small" label={`Total ${f.result.totalRecords}`} />
                            <Chip size="small" color="success" label={`Valid ${f.result.validRecords}`} />
                            <Chip size="small" color={f.result.invalidRecords? 'warning':'success'} label={`Invalid ${f.result.invalidRecords}`} />
                            <Button size="small" variant="outlined" onClick={()=>openPreview(i)}>Preview</Button>
                            <Button size="small" variant="contained" onClick={()=>handleValidateData(i)} sx={{ background:'linear-gradient(135deg,#667eea,#764ba2)' }}>Validate</Button>
                            {f.result.invalidRecords===0 && f.result.validRecords>0 && !f.directSubmitted && (
                              <Button size="small" color="success" variant="contained" disabled={f.directSubmitting} onClick={()=>handleDirectSubmit(i)}>{f.directSubmitting? 'Submitting...':'Submit'}</Button>
                            )}
                            {f.directSubmitted && <Chip size="small" color="success" label="Submitted" />}
                          </Box>
                        )}
                      </Box>
                    ))}
                    
                    {/* Clear All Button */}
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<Close />}
                        onClick={() => setFilesMeta([])}
                        sx={{ borderRadius: 2 }}
                      >
                        Clear All Files
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Section */}
        <Grid item xs={12} md={7}>
          <Card elevation={3} sx={{ height:'100%', display:'flex', flexDirection:'column' }}>
            <CardContent sx={{ flexGrow:1, display:'flex', flexDirection:'column' }}>
              <Box sx={{ display:'flex', alignItems:'center', mb:2 }}>
                <Assessment sx={{ color:'primary.main', mr:1 }} />
                <Typography variant="h6" fontWeight={600}>Uploaded Files Summary</Typography>
              </Box>
              {filesMeta.filter(f=>f.result).length===0 && (
                <Box sx={{ textAlign:'center', color:'text.secondary', mt:4 }}>
                  <Typography variant="body2">No processed files yet. Upload CSV files to see their status.</Typography>
                </Box>
              )}
              {filesMeta.filter(f=>f.result).length>0 && (
                <Grid container spacing={2}>
                  {filesMeta.filter(f=>f.result).map((f,i)=>(
                    <Grid item xs={12} sm={6} md={4} key={i}>
                      <Paper sx={{ p:1.5, height:'100%', display:'flex', flexDirection:'column' }} variant="outlined">
                        <Typography variant="subtitle2" noWrap title={f.file.name}>{f.file.name}</Typography>
                        <Box sx={{ display:'flex', gap:0.5, flexWrap:'wrap', mt:1 }}>
                          <Chip size="small" label={`Total ${f.result.totalRecords}`} />
                          <Chip size="small" color="success" label={`Valid ${f.result.validRecords}`} />
                          <Chip size="small" color={f.result.invalidRecords? 'warning':'success'} label={`Invalid ${f.result.invalidRecords}`} />
                        </Box>
                        <Box sx={{ display:'flex', gap:0.5, mt:1, flexWrap:'wrap' }}>
                          <Button size="small" onClick={()=>openPreview(i)}>Preview</Button>
                          <Button size="small" onClick={()=>handleValidateData(i)}>Validate</Button>
                          {f.result.invalidRecords===0 && f.result.validRecords>0 && !f.directSubmitted && (
                            <Button size="small" color="success" disabled={f.directSubmitting} onClick={()=>handleDirectSubmit(i)}>{f.directSubmitting? '...' : 'Submit'}</Button>
                          )}
                          {f.directSubmitted && <Chip size="small" color="success" label="Submitted" />}
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
              {allReadyForSubmit && filesMeta.some(f=> !f.directSubmitted) && (
                <Box sx={{ mt:3 }}>
                  <Button variant="contained" color="success" disabled={submittingAll} onClick={handleSubmitAll} sx={{ background:'linear-gradient(135deg,#2ecc71,#27ae60)' }}>
                    {submittingAll? 'Submitting All...' : 'Submit All Files'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
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
              'title','property_type','area','district','location','rent','rent_category','bedrooms','rooms','bathrooms','seats','rent_per_room','available_from','url','scraped_at'
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
      <Dialog open={activePreview!==null} onClose={()=> setActivePreview(null)} maxWidth="lg" fullWidth>
        <DialogTitle>Preview: {activePreview!==null && filesMeta[activePreview]?.file.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ overflow:'auto' }}>
            {activePreview!==null && filesMeta[activePreview]?.loadingPreview && <Typography sx={{ p:2 }} variant="body2">Loading preview...</Typography>}
            {activePreview!==null && !filesMeta[activePreview]?.loadingPreview && (filesMeta[activePreview]?.preview||[]).length===0 && <Typography sx={{ p:2 }} variant="body2">No preview rows.</Typography>}
            {activePreview!==null && (filesMeta[activePreview]?.preview||[]).map((row,i)=>{
              const status = row.__status || row.status || 'unknown';
              return (
                <Card key={i} sx={{ mb:1 }}>
                  <CardContent>
                    <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                      <Typography variant="subtitle2" fontWeight={600}>{row.title || '(untitled)'}</Typography>
                      <Chip size="small" label={status} color={getStatusColor(status)} />
                    </Box>
                    <Grid container spacing={1} sx={{ mt:1 }}>
                      {['property_type','area','district','location','rent','rent_category','bedrooms','rooms','bathrooms','seats','rent_per_room','available_from','url','scraped_at'].map(f => (
                        <Grid key={f} item xs={6} sm={4} md={3}>
                          <Typography variant="caption" color="text.secondary">{f}</Typography>
                          <Typography variant="body2" noWrap>{row[f] || '-'}</Typography>
                        </Grid>
                      ))}
                    </Grid>
                    {row.issues?.length>0 && <Typography variant="caption" color="error.main">Issues: {row.issues.join(', ')}</Typography>}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setActivePreview(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WebScrapingUpload;
