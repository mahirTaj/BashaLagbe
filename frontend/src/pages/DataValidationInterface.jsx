import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import adminAPI from '../services/adminAPI';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Tooltip,
  LinearProgress,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import {
  Edit,
  Delete,
  CheckCircle,
  Error,
  Warning,
  Info,
  Visibility,
  Save,
  Cancel,
  CloudUpload,
  FilterList,
  Search,
  Refresh,
  DataUsage
} from '@mui/icons-material';

const DataValidationInterface = () => {
  const [tabValue, setTabValue] = useState(0);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const validationId = queryParams.get('validationId');
  const [validationData, setValidationData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [editDialog, setEditDialog] = useState({ open: false, data: null, index: null });
  const [filterStatus, setFilterStatus] = useState('all');
  // Field-based filters (mirrors MarketSamples page style)
  const [filters, setFilters] = useState({
    title:'', propertyType:'', district:'', area:'', location:'',
    rentMin:'', rentMax:'', bedroomsMin:'', bedroomsMax:'', roomsMin:'', roomsMax:'', bathroomsMin:'', bathroomsMax:'',
    seatsMin:'', seatsMax:'', rentPerRoomMin:'', rentPerRoomMax:'', rentCategory:'', availableFromFrom:'', availableFromTo:'', scrapedFrom:'', scrapedTo:''
  });
  // Selected row IDs (mirrors MarketSamples page)
  const [selected, setSelected] = useState([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({});
  const [validationStats, setValidationStats] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Selection handlers (matches MarketSamples implementation)
  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (filteredData.length === 0) return;
    const pageIds = filteredData.map(r => r.__id);
    const pageAllSelected = pageIds.every(id => selected.includes(id));
    if (pageAllSelected) {
      // unselect only current page ids
      setSelected(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      // add missing ids from this page
      setSelected(prev => [...prev, ...pageIds.filter(id => !prev.includes(id))]);
    }
  };

  // Ensure each record has a stable __id even if legacy data loaded before patch
  useEffect(() => {
    if (!validationData.length) return;
    if (validationData.every(r => r.__id)) return; // already assigned
    let counter = 0;
    const withIds = validationData.map(r => r.__id ? r : { ...r, __id: `g_${counter++}` });
    setValidationData(withIds);
    // Re-map filteredData maintaining filters (simple replace by identity)
    setFilteredData(prev => prev.map(r => {
      const found = withIds.find(n => n === r || (n.title === r.title && n.rent === r.rent));
      return found || r;
    }));
  }, [validationData]);

  // Fetch validation results when validationId changes
  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      if (!validationId) return; // stay empty state
      setIsLoading(true);
      try {
        const results = await adminAPI.getValidationResults(validationId);
        if (ignore) return;
        // Combine valid and invalid for display; tag original valid indices
        let __counter = 0;
        const valid = (results.validData || []).map((r, idx) => ({
          ...r,
          status: 'valid',
          issues: [],
          __validIndex: idx,
          __id: `v_${__counter++}`
        }));
        const invalid = (results.invalidData || []).map(r => ({
          ...r,
          status: 'error',
          issues: r.issues || [],
          __id: `i_${__counter++}`
        }));
        const combined = [...valid, ...invalid];
        
        // Apply our validation rules to all records
        const revalidated = combined.map(record => validateRecord(record));
        
        setValidationData(revalidated);
        setFilteredData(revalidated);
        
        // Recalculate stats based on actual validation results
        const newStats = {
          total: revalidated.length,
          valid: revalidated.filter(r => r.status === 'valid').length,
          warning: revalidated.filter(r => r.status === 'warning').length,
          error: revalidated.filter(r => r.status === 'error').length
        };
        setValidationStats(newStats);
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [validationId]);

  const applyFilters = () => {
    let data = validationData;
    if (filterStatus !== 'all') data = data.filter(r => r.status === filterStatus);
    const f = filters;
    const num = v => (v===''||v==null? undefined : Number(v));
    const rentMin = num(f.rentMin), rentMax = num(f.rentMax);
    const bedroomsMin = num(f.bedroomsMin), bedroomsMax = num(f.bedroomsMax);
    const roomsMin = num(f.roomsMin), roomsMax = num(f.roomsMax);
    const bathsMin = num(f.bathroomsMin), bathsMax = num(f.bathroomsMax);
    const seatsMin = num(f.seatsMin), seatsMax = num(f.seatsMax);
    const rprMin = num(f.rentPerRoomMin), rprMax = num(f.rentPerRoomMax);
    const afFrom = f.availableFromFrom ? new Date(f.availableFromFrom) : null;
    const afTo = f.availableFromTo ? new Date(f.availableFromTo) : null;
    const scFrom = f.scrapedFrom ? new Date(f.scrapedFrom) : null;
    const scTo = f.scrapedTo ? new Date(f.scrapedTo) : null;

    data = data.filter(r => {
      if (f.title && !(r.title||'').toLowerCase().includes(f.title.toLowerCase())) return false;
      if (f.propertyType && (r.property_type||'').toLowerCase() !== f.propertyType.toLowerCase()) return false;
      if (f.district && (r.district||'').toLowerCase() !== f.district.toLowerCase()) return false;
      if (f.area && (r.area||'').toLowerCase() !== f.area.toLowerCase()) return false;
      if (f.location && !(r.location||'').toLowerCase().includes(f.location.toLowerCase())) return false;
      if (f.rentCategory && (r.rent_category||'').toLowerCase() !== f.rentCategory.toLowerCase()) return false;
      if (rentMin!==undefined && (r.rent||0) < rentMin) return false;
      if (rentMax!==undefined && (r.rent||0) > rentMax) return false;
      if (bedroomsMin!==undefined && (r.bedrooms||0) < bedroomsMin) return false;
      if (bedroomsMax!==undefined && (r.bedrooms||0) > bedroomsMax) return false;
      if (roomsMin!==undefined && (r.rooms||0) < roomsMin) return false;
      if (roomsMax!==undefined && (r.rooms||0) > roomsMax) return false;
      if (bathsMin!==undefined && (r.bathrooms||0) < bathsMin) return false;
      if (bathsMax!==undefined && (r.bathrooms||0) > bathsMax) return false;
      if (seatsMin!==undefined && (r.seats||0) < seatsMin) return false;
      if (seatsMax!==undefined && (r.seats||0) > seatsMax) return false;
      if (rprMin!==undefined && (r.rent_per_room||0) < rprMin) return false;
      if (rprMax!==undefined && (r.rent_per_room||0) > rprMax) return false;
      if (afFrom && (!r.available_from || new Date(r.available_from) < afFrom)) return false;
      if (afTo && (!r.available_from || new Date(r.available_from) > afTo)) return false;
      if (scFrom && (!r.scraped_at || new Date(r.scraped_at) < scFrom)) return false;
      if (scTo && (!r.scraped_at || new Date(r.scraped_at) > scTo)) return false;
      return true;
    });
    setFilteredData(data);
  };

  useEffect(()=> { applyFilters(); }, [validationData, filterStatus]);

  // Update statistics whenever validation data changes
  useEffect(() => {
    if (validationData.length > 0) {
      const newStats = {
        total: validationData.length,
        valid: validationData.filter(r => r.status === 'valid').length,
        warning: validationData.filter(r => r.status === 'warning').length,
        error: validationData.filter(r => r.status === 'error').length
      };
      setValidationStats(newStats);
    }
  }, [validationData]);

  const resetFilters = () => {
    const initial = { title:'', propertyType:'', district:'', area:'', location:'', rentMin:'', rentMax:'', bedroomsMin:'', bedroomsMax:'', roomsMin:'', roomsMax:'', bathroomsMin:'', bathroomsMax:'', seatsMin:'', seatsMax:'', rentPerRoomMin:'', rentPerRoomMax:'', rentCategory:'', availableFromFrom:'', availableFromTo:'', scrapedFrom:'', scrapedTo:'' };
    setFilters(initial);
    setFilterStatus('all');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid': return <CheckCircle />;
      case 'warning': return <Warning />;
      case 'error': return <Error />;
      default: return <Info />;
    }
  };

  const handleEdit = (data, index) => {
    // index here must be validationData index
    setEditDialog({ open: true, data: { ...data }, index });
  };

  const handleSaveEdit = () => {
    const updatedData = [...validationData];
    updatedData[editDialog.index] = editDialog.data;
    
    // Re-validate the edited data
    const validated = validateRecord(editDialog.data);
    updatedData[editDialog.index] = validated;
    
    setValidationData(updatedData);
    setEditDialog({ open: false, data: null, index: null });
  };

  const validateRecord = (record) => {
    const issues = [];
    let status = 'valid';

    // CRITICAL ERRORS (prevent database insertion)
    
    // 1. Rent validation - must be positive and reasonable
    if (!record.rent || record.rent <= 0) {
      issues.push('❌ ERROR: Invalid rent value');
      status = 'error';
    } else if (record.rent < 1000 || record.rent > 500000) {
      issues.push('❌ ERROR: Rent amount seems unrealistic (should be 1,000-500,000)');
      status = 'error';
    }

    // 2. Property type validation
    if (!record.property_type || record.property_type.trim() === '') {
      issues.push('❌ ERROR: Missing property type');
      status = 'error';
    }

    // 3. District AND Area validation - both are mandatory
    if (!record.district || record.district.trim() === '') {
      issues.push('❌ ERROR: Missing district (required)');
      status = 'error';
    }
    
    if (!record.area || record.area.trim() === '') {
      issues.push('❌ ERROR: Missing area (required)');
      status = 'error';
    }

    // WARNINGS (non-critical but should be reviewed)

    // 4. Title validation - warning only
    if (!record.title || record.title.trim() === '') {
      issues.push('⚠️ WARNING: Missing property title');
      if (status !== 'error') status = 'warning';
    }

    // 5. URL validation - warning only
    if (!record.url || record.url.trim() === '') {
      issues.push('⚠️ WARNING: Missing source URL');
      if (status !== 'error') status = 'warning';
    } else if (!record.url.startsWith('http')) {
      issues.push('⚠️ WARNING: Invalid URL format');
      if (status !== 'error') status = 'warning';
    }

    // 6. Available from date validation
    if (!record.available_from || record.available_from.trim() === '') {
      issues.push('⚠️ WARNING: Missing available_from date');
      if (status !== 'error') status = 'warning';
    } else {
      // Check if date is in the past
      const availableDate = new Date(record.available_from);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (availableDate < today) {
        issues.push('⚠️ WARNING: Available date is in the past');
        if (status !== 'error') status = 'warning';
      }
    }

    // 7. Rent category validation
    if (!record.rent_category || record.rent_category.trim() === '') {
      issues.push('⚠️ WARNING: Missing rent_category');
      if (status !== 'error') status = 'warning';
    }

    // 8. Bedroom validation
    if (record.bedrooms !== undefined && record.bedrooms !== null) {
      if (record.bedrooms < 0 || record.bedrooms > 10) {
        issues.push('⚠️ WARNING: Unusual number of bedrooms (0-10 expected)');
        if (status !== 'error') status = 'warning';
      }
    }

    // 9. Bathroom validation
    if (record.bathrooms !== undefined && record.bathrooms !== null) {
      if (record.bathrooms < 0 || record.bathrooms > 8) {
        issues.push('⚠️ WARNING: Unusual number of bathrooms (0-8 expected)');
        if (status !== 'error') status = 'warning';
      }
    }

    // 10. Rent per room calculation validation
    if (record.bedrooms && record.rent && record.bedrooms > 0) {
      const expectedRentPerRoom = Math.round(record.rent / record.bedrooms);
      if (record.rent_per_room && Math.abs(record.rent_per_room - expectedRentPerRoom) > 100) {
        issues.push('⚠️ WARNING: Rent per room calculation mismatch (difference > 100)');
        if (status !== 'error') status = 'warning';
      }
    }

    // 11. Area validation
    if (record.area_sqft !== undefined && record.area_sqft !== null) {
      if (record.area_sqft <= 0 || record.area_sqft > 10000) {
        issues.push('⚠️ WARNING: Unusual area size (1-10,000 sqft expected)');
        if (status !== 'error') status = 'warning';
      }
    }

    return { ...record, status, issues };
  };

  const handleDelete = (filteredIndex) => {
    const row = filteredData[filteredIndex];
    if (!row) return;
    const updatedData = validationData.filter(r => r.__id !== row.__id);
    setValidationData(updatedData);
    setSelected(sel => sel.filter(id => id !== row.__id));
  };

  const handleBulkAction = (action) => {
    if (!selected.length) return;
    if (action === 'delete') {
      const updatedData = validationData.filter(r => !selected.includes(r.__id));
      setValidationData(updatedData);
      setSelected([]);
    } else if (action === 'approve') {
      // Re-validate selected records to get proper status based on current validation rules
      const updatedData = validationData.map(r => {
        if (selected.includes(r.__id)) {
          const validated = validateRecord(r);
          // For approve action, we can override to 'valid' if user explicitly approves
          return { ...validated, status: 'valid', issues: [] };
        }
        return r;
      });
      setValidationData(updatedData);
      setSelected([]);
    }
  };

  const openBulkEdit = () => {
    if (selected.length === 0) return;
    setBulkEditData({});
    setBulkEditOpen(true);
  };

  const closeBulkEdit = () => {
    setBulkEditOpen(false);
    setBulkEditData({});
  };

  const saveBulkEdit = () => {
    if (selected.length === 0) return;
    
    // Filter out empty values
    const updateData = Object.fromEntries(
      Object.entries(bulkEditData).filter(([, value]) => value !== '' && value != null)
    );
    
    if (Object.keys(updateData).length === 0) {
      alert('Please provide at least one field to update.');
      return;
    }

    if (!window.confirm(`Update ${selected.length} selected records with these changes?`)) return;
    
    try {
      // Update selected records in validation data
      const updatedData = validationData.map(r => {
        if (selected.includes(r.__id)) {
          const updated = { ...r, ...updateData };
          // Re-validate the updated record
          return validateRecord(updated);
        }
        return r;
      });
      
      setValidationData(updatedData);
      closeBulkEdit();
      setSelected([]);
      alert(`Successfully updated ${selected.length} records.`);
    } catch (e) { 
      console.error(e);
      alert('Bulk update failed: ' + (e.message || 'Unknown error'));
    }
  };

  const handleFinalSubmit = async () => {
    if (!validationId) return;
    setIsLoading(true);
    try {
      // Submit only selected valid rows; if none selected, submit all valid
      const selectedValidRecords = selected.length
        ? validationData.filter(r => selected.includes(r.__id) && r.status === 'valid')
        : validationData.filter(r => r.status === 'valid');
      const recordIds = selectedValidRecords.map(r => r.__validIndex).filter(i => i !== undefined);
      const resp = await adminAPI.submitValidatedData(validationId, recordIds);
      alert(`Inserted ${resp.inserted} samples into analytics dataset.`);
    } catch (e) {
      alert(e.message || 'Submission failed');
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, color, icon }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ color }}>
              {value}
            </Typography>
          </Box>
          <Box sx={{ color, opacity: 0.7 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} mb={3} sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Data Validation Interface
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Records"
            value={validationStats.total || 0}
            color="#2196f3"
            icon={<Info sx={{ fontSize: 40 }} />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Valid Records"
            value={validationStats.valid || 0}
            color="#4caf50"
            icon={<CheckCircle sx={{ fontSize: 40 }} />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Warnings"
            value={validationStats.warning || 0}
            color="#ff9800"
            icon={<Warning sx={{ fontSize: 40 }} />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Errors"
            value={validationStats.error || 0}
            color="#f44336"
            icon={<Error sx={{ fontSize: 40 }} />}
          />
        </Grid>
      </Grid>

      {/* Validation Logic Explanation */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: '#f8f9fa' }}>
        <Typography variant="h6" fontWeight={600} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Info color="primary" />
          Validation Rules & Logic
        </Typography>
        
        <Grid container spacing={3}>
          {/* Error Conditions */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#ffebee', border: '1px solid #ffcdd2' }}>
              <Typography variant="subtitle1" fontWeight={600} color="error" mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Error fontSize="small" />
                🔴 ERRORS (Critical - Must Fix)
              </Typography>
              <Typography variant="body2" component="div" sx={{ lineHeight: 1.6 }}>
                <strong>Records with errors cannot be submitted to database:</strong>
                <br />• <strong>Invalid Rent:</strong> Must be positive and between 1,000-500,000
                <br />• <strong>Missing Property Type:</strong> Required for categorization
                <br />• <strong>Missing District:</strong> District field is mandatory
                <br />• <strong>Missing Area:</strong> Area field is mandatory
              </Typography>
            </Box>
          </Grid>

          {/* Warning Conditions */}
          <Grid item size={{ xs: 12, md: 4 }}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#fff3e0', border: '1px solid #ffcc02' }}>
              <Typography variant="subtitle1" fontWeight={600} color="warning.main" mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning fontSize="small" />
                🟡 WARNINGS (Should Review)
              </Typography>
              <Typography variant="body2" component="div" sx={{ lineHeight: 1.6 }}>
                <strong>Records with warnings can be processed but should be reviewed:</strong>
                <br />• <strong>Missing Title:</strong> Property should have a title
                <br />• <strong>Missing/Invalid URL:</strong> Source URL missing or invalid format
                <br />• <strong>Missing Available Date:</strong> Should specify availability
                <br />• <strong>Past Available Date:</strong> Date shouldn't be in the past
                <br />• <strong>Missing Rent Category:</strong> Helpful for classification
                <br />• <strong>Unusual Bedroom Count:</strong> Outside 0-10 range
                <br />• <strong>Unusual Bathroom Count:</strong> Outside 0-8 range
                <br />• <strong>Rent Calculation Mismatch:</strong> Rent per room doesn't match calculation ({'>'}100 difference)
                <br />• <strong>Unusual Area Size:</strong> Outside 1-10,000 sqft range
              </Typography>
            </Box>
          </Grid>

          {/* Valid Conditions */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#e8f5e8', border: '1px solid #c8e6c9' }}>
              <Typography variant="subtitle1" fontWeight={600} color="success.main" mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle fontSize="small" />
                🟢 VALID (Ready for Database)
              </Typography>
              <Typography variant="body2" component="div" sx={{ lineHeight: 1.6 }}>
                <strong>Records that pass all validation checks:</strong>
                <br />• All required fields present (rent, property type, district, area)
                <br />• Rent amount is realistic (1,000-500,000)
                <br />• All numeric values within expected ranges
                <br />• No critical data quality issues
                <br />• Ready for insertion into analytics database
                <br /><br />
                <strong>Action:</strong> Valid records can be submitted directly or approved in bulk for final database insertion.
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: '#e3f2fd', border: '1px solid #bbdefb' }}>
          <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
            💡 <strong>Tip:</strong> Use the filters above to quickly find records by status. You can edit individual records by clicking the edit button, 
            or use bulk actions to approve/delete multiple records at once. Only valid records will be included in the final submission.
          </Typography>
        </Box>
      </Paper>

      {/* Filters and Actions */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display:'flex', flexWrap:'wrap', gap:1.5, mb:2 }}>
          <TextField label="Title" size="small" value={filters.title} onChange={e=>setFilters(f=>({...f,title:e.target.value}))} />
          <TextField label="Type" size="small" value={filters.propertyType} onChange={e=>setFilters(f=>({...f,propertyType:e.target.value}))} />
          <TextField label="District" size="small" value={filters.district} onChange={e=>setFilters(f=>({...f,district:e.target.value}))} />
          <TextField label="Area" size="small" value={filters.area} onChange={e=>setFilters(f=>({...f,area:e.target.value}))} />
          <TextField label="Location" size="small" value={filters.location} onChange={e=>setFilters(f=>({...f,location:e.target.value}))} />
          <TextField label="Rent Min" type="number" size="small" value={filters.rentMin} onChange={e=>setFilters(f=>({...f,rentMin:e.target.value}))} sx={{ width:100 }} />
            <TextField label="Rent Max" type="number" size="small" value={filters.rentMax} onChange={e=>setFilters(f=>({...f,rentMax:e.target.value}))} sx={{ width:100 }} />
            <TextField label="Beds Min" type="number" size="small" value={filters.bedroomsMin} onChange={e=>setFilters(f=>({...f,bedroomsMin:e.target.value}))} sx={{ width:90 }} />
            <TextField label="Beds Max" type="number" size="small" value={filters.bedroomsMax} onChange={e=>setFilters(f=>({...f,bedroomsMax:e.target.value}))} sx={{ width:90 }} />
            <TextField label="Rooms Min" type="number" size="small" value={filters.roomsMin} onChange={e=>setFilters(f=>({...f,roomsMin:e.target.value}))} sx={{ width:90 }} />
            <TextField label="Rooms Max" type="number" size="small" value={filters.roomsMax} onChange={e=>setFilters(f=>({...f,roomsMax:e.target.value}))} sx={{ width:90 }} />
            <TextField label="Baths Min" type="number" size="small" value={filters.bathroomsMin} onChange={e=>setFilters(f=>({...f,bathroomsMin:e.target.value}))} sx={{ width:90 }} />
            <TextField label="Baths Max" type="number" size="small" value={filters.bathroomsMax} onChange={e=>setFilters(f=>({...f,bathroomsMax:e.target.value}))} sx={{ width:90 }} />
            <TextField label="Seats Min" type="number" size="small" value={filters.seatsMin} onChange={e=>setFilters(f=>({...f,seatsMin:e.target.value}))} sx={{ width:90 }} />
            <TextField label="Seats Max" type="number" size="small" value={filters.seatsMax} onChange={e=>setFilters(f=>({...f,seatsMax:e.target.value}))} sx={{ width:90 }} />
            <TextField label="R/Room Min" type="number" size="small" value={filters.rentPerRoomMin} onChange={e=>setFilters(f=>({...f,rentPerRoomMin:e.target.value}))} sx={{ width:100 }} />
            <TextField label="R/Room Max" type="number" size="small" value={filters.rentPerRoomMax} onChange={e=>setFilters(f=>({...f,rentPerRoomMax:e.target.value}))} sx={{ width:100 }} />
            <TextField label="Rent Cat" size="small" value={filters.rentCategory} onChange={e=>setFilters(f=>({...f,rentCategory:e.target.value}))} sx={{ width:110 }} />
            <TextField label="Avail From" type="date" size="small" InputLabelProps={{ shrink:true }} value={filters.availableFromFrom} onChange={e=>setFilters(f=>({...f,availableFromFrom:e.target.value}))} />
            <TextField label="Avail To" type="date" size="small" InputLabelProps={{ shrink:true }} value={filters.availableFromTo} onChange={e=>setFilters(f=>({...f,availableFromTo:e.target.value}))} />
            <TextField label="Scraped From" type="date" size="small" InputLabelProps={{ shrink:true }} value={filters.scrapedFrom} onChange={e=>setFilters(f=>({...f,scrapedFrom:e.target.value}))} />
            <TextField label="Scraped To" type="date" size="small" InputLabelProps={{ shrink:true }} value={filters.scrapedTo} onChange={e=>setFilters(f=>({...f,scrapedTo:e.target.value}))} />
            <FormControl size="small" sx={{ minWidth:140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} label="Status" onChange={e=>setFilterStatus(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="valid">Valid</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>
            <Button size="small" variant="contained" onClick={applyFilters} sx={{ background:'linear-gradient(135deg,#667eea,#764ba2)' }}>Apply</Button>
            <Button size="small" onClick={resetFilters}>Reset</Button>
        </Box>
        <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' }}>
          <Chip label={`Total: ${validationStats.total || 0}`} size="small" />
          <Chip label={`Selected: ${selected.length}`} size="small" color={selected.length? 'primary':'default'} />
          {selected.length > 0 && (
            <>
              <Button variant="outlined" color="error" size="small" onClick={()=>handleBulkAction('delete')}>Delete Selected ({selected.length})</Button>
              <Button variant="outlined" color="success" size="small" onClick={()=>handleBulkAction('approve')}>Approve Selected</Button>
              <Button variant="outlined" color="primary" size="small" onClick={openBulkEdit}>Edit Selected</Button>
              <Button size="small" onClick={()=>setSelected([])}>Clear Selection</Button>
            </>
          )}
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleFinalSubmit}
            disabled={isLoading || validationStats.valid === 0}
            sx={{ background:'linear-gradient(135deg,#667eea,#764ba2)' }}
          >
            Submit to Database ({validationStats.valid} records)
          </Button>
        </Box>
      </Paper>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Data Table */}
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell 
                padding="checkbox"
                onClick={() => toggleSelectAll()}
                sx={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <Checkbox
                  size="small"
                  indeterminate={filteredData.some(r=>selected.includes(r.__id)) && !filteredData.every(r=>selected.includes(r.__id))}
                  checked={filteredData.length>0 && filteredData.every(r=>selected.includes(r.__id))}
                  onChange={() => {}} // Handled by TableCell onClick
                  inputProps={{ 'aria-label': 'select all rows' }}
                />
              </TableCell>
              <TableCell><Typography fontWeight={600}>Status</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Title</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Type</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Area</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>District</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Location</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Rent</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Rent Cat</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Bedrooms</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Rooms</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Baths</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Seats</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Rent/Room</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Available From</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Scraped At</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>URL</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Issues</Typography></TableCell>
              <TableCell><Typography fontWeight={600}>Actions</Typography></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={19} sx={{ textAlign: 'center', py: 8 }}>
                  <Box sx={{ color: 'text.secondary' }}>
                    <DataUsage sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" mb={1}>
                      No Data to Validate
                    </Typography>
                    <Typography variant="body2" mb={3}>
                      Upload CSV files from the Web Scraping page to see validation data here
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<CloudUpload />}
                      onClick={() => window.location.href = '/admin-panel/web-scraping'}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      }}
                    >
                      Upload Data
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, index) => {
                const realIndex = validationData.indexOf(row);
                return (
                  <TableRow key={row.__id || index} hover>
                  <TableCell 
                    padding="checkbox" 
                    onClick={() => toggleSelect(row.__id)}
                    sx={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <Checkbox
                      size="small"
                      checked={selected.includes(row.__id)}
                      onChange={() => {}} // Handled by TableCell onClick
                      inputProps={{ 'aria-label': 'select row' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(row.status)}
                      label={row.status}
                      color={getStatusColor(row.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{row.title || 'No Title'}</TableCell>
                  <TableCell>{row.property_type}</TableCell>
                  <TableCell>{row.area}</TableCell>
                  <TableCell>{row.district}</TableCell>
                  <TableCell>{row.location}</TableCell>
                  <TableCell>{row.rent}</TableCell>
                  <TableCell>{row.rent_category}</TableCell>
                  <TableCell>{row.bedrooms}</TableCell>
                  <TableCell>{row.rooms}</TableCell>
                  <TableCell>{row.bathrooms}</TableCell>
                  <TableCell>{row.seats}</TableCell>
                  <TableCell>{row.rent_per_room}</TableCell>
                  <TableCell>{row.available_from}</TableCell>
                  <TableCell>{row.scraped_at}</TableCell>
                  <TableCell>{row.url && <a href={row.url} target="_blank" rel="noreferrer">link</a>}</TableCell>
                  <TableCell>
                    {row.issues.length > 0 ? (
                      <Tooltip title={row.issues.join(', ')}>
                        <Chip
                          label={`${row.issues.length} issue${row.issues.length > 1 ? 's' : ''}`}
                          color="warning"
                          size="small"
                        />
                      </Tooltip>
                    ) : (
                      <Chip label="No issues" color="success" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleEdit(row, realIndex)} color="primary"><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => handleDelete(index)} color="error"><Delete fontSize="small" /></IconButton>
                    </Box>
                  </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialog.open} 
        onClose={() => setEditDialog({ open: false, data: null, index: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Property Record</DialogTitle>
        <DialogContent>
          {editDialog.data && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Title"
                  value={editDialog.data.title}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    data: { ...editDialog.data, title: e.target.value }
                  })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Property Type"
                  value={editDialog.data.property_type}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    data: { ...editDialog.data, property_type: e.target.value }
                  })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Area"
                  value={editDialog.data.area}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    data: { ...editDialog.data, area: e.target.value }
                  })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="District"
                  value={editDialog.data.district}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    data: { ...editDialog.data, district: e.target.value }
                  })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Location"
                  value={editDialog.data.location}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    data: { ...editDialog.data, location: e.target.value }
                  })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Rent"
                  type="number"
                  value={editDialog.data.rent}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    data: { ...editDialog.data, rent: parseInt(e.target.value) }
                  })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Rent Category"
                  value={editDialog.data.rent_category}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    data: { ...editDialog.data, rent_category: e.target.value }
                  })}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Bedrooms"
                  type="number"
                  value={editDialog.data.bedrooms}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    data: { ...editDialog.data, bedrooms: parseInt(e.target.value) }
                  })}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Bathrooms"
                  type="number"
                  value={editDialog.data.bathrooms}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    data: { ...editDialog.data, bathrooms: parseInt(e.target.value) }
                  })}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Available From"
                  type="date"
                  value={editDialog.data.available_from}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    data: { ...editDialog.data, available_from: e.target.value }
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, data: null, index: null })}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditOpen} onClose={closeBulkEdit} maxWidth="md" fullWidth>
        <DialogTitle>Bulk Edit {selected.length} Selected Records</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Fill in only the fields you want to update. Empty fields will be left unchanged.
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={bulkEditData.title || ''}
                placeholder="Leave empty to keep current title"
                onChange={(e) => setBulkEditData(d => ({ ...d, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Property Type"
                value={bulkEditData.property_type || ''}
                placeholder="Leave empty to keep current property type"
                onChange={(e) => setBulkEditData(d => ({ ...d, property_type: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Area"
                value={bulkEditData.area || ''}
                placeholder="Leave empty to keep current area"
                onChange={(e) => setBulkEditData(d => ({ ...d, area: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="District"
                value={bulkEditData.district || ''}
                placeholder="Leave empty to keep current district"
                onChange={(e) => setBulkEditData(d => ({ ...d, district: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Location"
                value={bulkEditData.location || ''}
                placeholder="Leave empty to keep current location"
                onChange={(e) => setBulkEditData(d => ({ ...d, location: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Rent"
                type="number"
                value={bulkEditData.rent || ''}
                placeholder="Leave empty to keep current rent"
                onChange={(e) => setBulkEditData(d => ({ ...d, rent: e.target.value ? parseInt(e.target.value) : '' }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Rent Category"
                value={bulkEditData.rent_category || ''}
                placeholder="Leave empty to keep current rent category"
                onChange={(e) => setBulkEditData(d => ({ ...d, rent_category: e.target.value }))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Bedrooms"
                type="number"
                value={bulkEditData.bedrooms || ''}
                placeholder="Keep current"
                onChange={(e) => setBulkEditData(d => ({ ...d, bedrooms: e.target.value ? parseInt(e.target.value) : '' }))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Rooms"
                type="number"
                value={bulkEditData.rooms || ''}
                placeholder="Keep current"
                onChange={(e) => setBulkEditData(d => ({ ...d, rooms: e.target.value ? parseInt(e.target.value) : '' }))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Bathrooms"
                type="number"
                value={bulkEditData.bathrooms || ''}
                placeholder="Keep current"
                onChange={(e) => setBulkEditData(d => ({ ...d, bathrooms: e.target.value ? parseInt(e.target.value) : '' }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Seats"
                type="number"
                value={bulkEditData.seats || ''}
                placeholder="Keep current"
                onChange={(e) => setBulkEditData(d => ({ ...d, seats: e.target.value ? parseInt(e.target.value) : '' }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Rent Per Room"
                type="number"
                value={bulkEditData.rent_per_room || ''}
                placeholder="Keep current"
                onChange={(e) => setBulkEditData(d => ({ ...d, rent_per_room: e.target.value ? parseInt(e.target.value) : '' }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Available From"
                value={bulkEditData.available_from || ''}
                placeholder="Keep current"
                onChange={(e) => setBulkEditData(d => ({ ...d, available_from: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="URL"
                value={bulkEditData.url || ''}
                placeholder="Keep current"
                onChange={(e) => setBulkEditData(d => ({ ...d, url: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBulkEdit}>Cancel</Button>
          <Button variant="contained" onClick={saveBulkEdit}>
            Update {selected.length} Records
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataValidationInterface;