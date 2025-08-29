import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, TextField, Button, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Checkbox, Tooltip, Pagination } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import adminAPI from '../services/adminAPI';

const ScrapedData = () => {
  const [samples, setSamples] = useState([]);
  const [selected, setSelected] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [pages, setPages] = useState(0);
  const [filters, setFilters] = useState({
    title:'', propertyType:'', district:'', area:'', rentMin:'', rentMax:'',
    bedroomsMin:'', bedroomsMax:'', roomsMin:'', roomsMax:'', bathroomsMin:'', bathroomsMax:'',
    seatsMin:'', seatsMax:'', rentPerRoomMin:'', rentPerRoomMax:'', rentCategory:'', createdFrom:'', createdTo:''
  });
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { 
        page, 
        limit, 
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')) 
      };
      const resp = await adminAPI.getMarketSamples(params);
      setSamples(resp.items || []);
      setTotal(resp.total || 0);
      const calculatedPages = Math.ceil((resp.total || 0) / limit);
      setPages(calculatedPages);
    } catch (e) {
      console.error(e);
    } finally { 
      setLoading(false); 
    }
  }, [page, limit, filters]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const applyFilters = () => { 
    setPage(1); // Reset to first page when applying filters
    setSelected([]); // Clear selections when filtering
    fetchData(); 
  };
  
  const resetFilters = () => { 
    setFilters({ 
      title:'', propertyType:'', district:'', area:'', rentMin:'', rentMax:'', 
      bedroomsMin:'', bedroomsMax:'', roomsMin:'', roomsMax:'', bathroomsMin:'', bathroomsMax:'', 
      seatsMin:'', seatsMax:'', rentPerRoomMin:'', rentPerRoomMax:'', rentCategory:'', createdFrom:'', createdTo:'' 
    }); 
    setPage(1);
    setSelected([]);
    fetchData(); 
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    setSelected([]); // Clear selections when changing pages
  };

  const openEdit = sample => { setEditData(sample); setEditOpen(true); };
  const closeEdit = () => { setEditOpen(false); setEditData(null); };

  const saveEdit = async () => {
    if (!editData?._id) return;
    setSaving(true);
    try {
      const payload = { ...editData };
      ['_id','createdAt','updatedAt','__v'].forEach(k => delete payload[k]);
      await adminAPI.updateMarketSample(editData._id, payload);
      closeEdit();
      fetchData();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const deleteRow = async (id) => {
    if (!window.confirm('Delete this sample?')) return;
    setDeleting(true);
    try {
      await adminAPI.deleteMarketSample(id);
      fetchData();
    } catch (e) { console.error(e); } finally { setDeleting(false); }
  };

  const bulkDelete = async () => {
    if (selected.length === 0) return;
    if (!window.confirm(`Delete ${selected.length} selected samples?`)) return;
    setDeleting(true);
    try {
      await adminAPI.bulkDeleteMarketSamples(selected);
      setSelected([]);
      fetchData();
    } catch (e) { console.error(e); } finally { setDeleting(false); }
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

  const saveBulkEdit = async () => {
    if (selected.length === 0) return;
    
    // Filter out empty values
    const updateData = Object.fromEntries(
      Object.entries(bulkEditData).filter(([, value]) => value !== '' && value != null)
    );
    
    if (Object.keys(updateData).length === 0) {
      alert('Please provide at least one field to update.');
      return;
    }

    if (!window.confirm(`Update ${selected.length} selected samples with these changes?`)) return;
    
    setSaving(true);
    try {
      // Update each selected item individually
      for (const id of selected) {
        await adminAPI.updateMarketSample(id, updateData);
      }
      closeBulkEdit();
      setSelected([]);
      fetchData();
      alert(`Successfully updated ${selected.length} samples.`);
    } catch (e) { 
      console.error(e);
      alert('Bulk update failed: ' + (e.message || 'Unknown error'));
    } finally { setSaving(false); }
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (samples.length === 0) return;
    const currentPageIds = samples.map(s=>s._id);
    const allCurrentSelected = currentPageIds.every(id => selected.includes(id));
    if (allCurrentSelected) {
      // unselect all on current page
      setSelected(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      // select all on current page
      setSelected(prev => [...prev.filter(id => !currentPageIds.includes(id)), ...currentPageIds]);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight:700, mb:2, background: 'linear-gradient(135deg,#667eea,#764ba2)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
        Scraped Market Samples
      </Typography>
      
      <Paper sx={{ p: 2, mb: 2, bgcolor: '#e3f2fd', border: '1px solid #2196f3' }}>
        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
          📄 <strong>Paginated View:</strong> Showing {limit} records per page. 
          Use the pagination controls below to navigate through all {total} records.
        </Typography>
      </Paper>

  <Paper sx={{ p:1, mb:2 }}>
        <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', alignItems:'center' }}>
          <TextField label="Title" size="small" value={filters.title} onChange={e=>setFilters(f=>({...f,title:e.target.value}))} />
          <TextField label="Type" size="small" value={filters.propertyType} onChange={e=>setFilters(f=>({...f,propertyType:e.target.value}))} />
          <TextField label="District" size="small" value={filters.district} onChange={e=>setFilters(f=>({...f,district:e.target.value}))} />
          <TextField label="Area" size="small" value={filters.area} onChange={e=>setFilters(f=>({...f,area:e.target.value}))} />
          <TextField label="Rent Min" size="small" type="number" value={filters.rentMin} onChange={e=>setFilters(f=>({...f,rentMin:e.target.value}))} sx={{ width:100 }} />
          <TextField label="Rent Max" size="small" type="number" value={filters.rentMax} onChange={e=>setFilters(f=>({...f,rentMax:e.target.value}))} sx={{ width:100 }} />
          <TextField label="Beds Min" size="small" type="number" value={filters.bedroomsMin} onChange={e=>setFilters(f=>({...f,bedroomsMin:e.target.value}))} sx={{ width:90 }} />
          <TextField label="Beds Max" size="small" type="number" value={filters.bedroomsMax} onChange={e=>setFilters(f=>({...f,bedroomsMax:e.target.value}))} sx={{ width:90 }} />
          <TextField label="Rooms Min" size="small" type="number" value={filters.roomsMin} onChange={e=>setFilters(f=>({...f,roomsMin:e.target.value}))} sx={{ width:90 }} />
          <TextField label="Rooms Max" size="small" type="number" value={filters.roomsMax} onChange={e=>setFilters(f=>({...f,roomsMax:e.target.value}))} sx={{ width:90 }} />
          <TextField label="Baths Min" size="small" type="number" value={filters.bathroomsMin} onChange={e=>setFilters(f=>({...f,bathroomsMin:e.target.value}))} sx={{ width:90 }} />
          <TextField label="Baths Max" size="small" type="number" value={filters.bathroomsMax} onChange={e=>setFilters(f=>({...f,bathroomsMax:e.target.value}))} sx={{ width:90 }} />
          <TextField label="Seats Min" size="small" type="number" value={filters.seatsMin} onChange={e=>setFilters(f=>({...f,seatsMin:e.target.value}))} sx={{ width:90 }} />
          <TextField label="Seats Max" size="small" type="number" value={filters.seatsMax} onChange={e=>setFilters(f=>({...f,seatsMax:e.target.value}))} sx={{ width:90 }} />
          <TextField label="R/Room Min" size="small" type="number" value={filters.rentPerRoomMin} onChange={e=>setFilters(f=>({...f,rentPerRoomMin:e.target.value}))} sx={{ width:100 }} />
          <TextField label="R/Room Max" size="small" type="number" value={filters.rentPerRoomMax} onChange={e=>setFilters(f=>({...f,rentPerRoomMax:e.target.value}))} sx={{ width:100 }} />
          <TextField label="Rent Cat" size="small" value={filters.rentCategory} onChange={e=>setFilters(f=>({...f,rentCategory:e.target.value}))} sx={{ width:110 }} />
          <TextField label="Created From" size="small" type="date" InputLabelProps={{ shrink:true }} value={filters.createdFrom} onChange={e=>setFilters(f=>({...f,createdFrom:e.target.value}))} />
          <TextField label="Created To" size="small" type="date" InputLabelProps={{ shrink:true }} value={filters.createdTo} onChange={e=>setFilters(f=>({...f,createdTo:e.target.value}))} />
          <Button variant="contained" onClick={applyFilters} size="small" sx={{ background:'linear-gradient(135deg,#667eea,#764ba2)' }}>Apply</Button>
          <Button variant="text" onClick={resetFilters} size="small">Reset</Button>
          <Chip label={`Total: ${total}`} size="small" />
          <Chip label={`Selected: ${selected.length}`} size="small" color={selected.length? 'primary':'default'} />
          <Button disabled={!selected.length || deleting} size="small" color="error" onClick={bulkDelete}>Delete Selected</Button>
          <Button disabled={!selected.length} size="small" color="primary" onClick={openBulkEdit}>Edit Selected</Button>
        </Box>
      </Paper>
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox 
                    size="small" 
                    indeterminate={samples.some(s=>selected.includes(s._id)) && !samples.every(s=>selected.includes(s._id))} 
                    checked={samples.length > 0 && samples.every(s=>selected.includes(s._id))} 
                    onChange={toggleSelectAll} 
                  />
                </TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Area</TableCell>
                <TableCell>District</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Rent</TableCell>
                <TableCell>Rent Cat</TableCell>
                <TableCell>Bedrooms</TableCell>
                <TableCell>Rooms</TableCell>
                <TableCell>Baths</TableCell>
                <TableCell>Seats</TableCell>
                <TableCell>Rent/Room</TableCell>
                <TableCell>Available From</TableCell>
                <TableCell>Scraped At</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={18} align="center"><CircularProgress size={26} /> <Typography component="span" sx={{ ml: 1 }}>Loading page {page}...</Typography></TableCell></TableRow>
              )}
              {!loading && samples.length === 0 && (
                <TableRow><TableCell colSpan={18} align="center">No samples found</TableCell></TableRow>
              )}
              {!loading && samples.map(s => (
                <TableRow key={s._id} hover>
                  <TableCell padding="checkbox"><Checkbox size="small" checked={selected.includes(s._id)} onChange={()=>toggleSelect(s._id)} /></TableCell>
                  <TableCell>{s.title || '(untitled)'}</TableCell>
                  <TableCell>{s.propertyType || '-'}</TableCell>
                  <TableCell>{s.area || '-'}</TableCell>
                  <TableCell>{s.district || '-'}</TableCell>
                  <TableCell>{s.location || '-'}</TableCell>
                  <TableCell>{s.rent ? `৳${s.rent.toLocaleString()}` : '-'}</TableCell>
                  <TableCell>{s.rentCategory || '-'}</TableCell>
                  <TableCell>{s.bedrooms ?? '-'}</TableCell>
                  <TableCell>{s.rooms ?? '-'}</TableCell>
                  <TableCell>{s.bathrooms ?? '-'}</TableCell>
                  <TableCell>{s.seats ?? '-'}</TableCell>
                  <TableCell>{s.rentPerRoom ? `৳${s.rentPerRoom}` : '-'}</TableCell>
                  <TableCell>{s.availableFrom || '-'}</TableCell>
                  <TableCell>{s.scrapedAt || '-'}</TableCell>
                  <TableCell>
                    {s.url ? <Tooltip title={s.url}><a href={s.url} target="_blank" rel="noreferrer" style={{ textDecoration:'none' }}>Link</a></Tooltip> : '-' }
                  </TableCell>
                  <TableCell>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={()=>openEdit(s)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" disabled={deleting} onClick={()=>deleteRow(s._id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} records
          </Typography>
          <Pagination 
            count={Math.max(1, pages)} 
            page={page} 
            onChange={handlePageChange}
            color="primary"
            showFirstButton 
            showLastButton
            disabled={loading}
          />
        </Box>
      </Paper>
      <Dialog open={editOpen} onClose={closeEdit} maxWidth="md" fullWidth>
        <DialogTitle>Edit Sample</DialogTitle>
        <DialogContent dividers>
          {editData && (
            <Box sx={{ display:'grid', gap:2, gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', mt:1 }}>
              {['title','propertyType','district','area','location','rent','rentCategory','bedrooms','rooms','bathrooms','seats','rentPerRoom','availableFrom','url'].map(f => (
                <TextField key={f} label={f} value={editData[f] ?? ''}
                  type={['rent','bedrooms','rooms','bathrooms','seats','rentPerRoom'].includes(f)?'number':'text'}
                  onChange={e=>setEditData(d=>({...d,[f]: e.target.value}))} size="small" />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit}>Cancel</Button>
          <Button variant="contained" disabled={saving} onClick={saveEdit}>{saving?'Saving...':'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditOpen} onClose={closeBulkEdit} maxWidth="md" fullWidth>
        <DialogTitle>Bulk Edit {selected.length} Selected Samples</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Fill in only the fields you want to update. Empty fields will be left unchanged.
          </Typography>
          <Box sx={{ display:'grid', gap:2, gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', mt:1 }}>
            {['title','propertyType','district','area','location','rent','rentCategory','bedrooms','rooms','bathrooms','seats','rentPerRoom','availableFrom','url'].map(f => (
              <TextField 
                key={f} 
                label={f} 
                value={bulkEditData[f] ?? ''}
                type={['rent','bedrooms','rooms','bathrooms','seats','rentPerRoom'].includes(f)?'number':'text'}
                onChange={e=>setBulkEditData(d=>({...d,[f]: e.target.value}))} 
                size="small"
                placeholder={`Leave empty to keep current ${f}`}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBulkEdit}>Cancel</Button>
          <Button variant="contained" disabled={saving} onClick={saveBulkEdit}>
            {saving ? 'Updating...' : `Update ${selected.length} Samples`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScrapedData;
