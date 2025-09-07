import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth';
import {
  Box,
  Breadcrumbs,
  Typography,
  CircularProgress,
  Grid,
  Chip,
  Paper,
  Stack,
  Button,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VideocamIcon from '@mui/icons-material/Videocam';
// Fact icons
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import ShowerIcon from '@mui/icons-material/Shower';
import BalconyIcon from '@mui/icons-material/Balcony';
import GroupIcon from '@mui/icons-material/Group';
import StairsIcon from '@mui/icons-material/Stairs';
import LayersIcon from '@mui/icons-material/Layers';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import WeekendIcon from '@mui/icons-material/Weekend';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CircleIcon from '@mui/icons-material/Circle';
import HandshakeIcon from '@mui/icons-material/Handshake';
import EventAvailableIcon2 from '@mui/icons-material/Event';
import SavingsIcon from '@mui/icons-material/Savings';
import PaymentsIcon from '@mui/icons-material/Payments';
import WifiIcon from '@mui/icons-material/Wifi';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import ElevatorIcon from '@mui/icons-material/AlignVerticalBottom';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import SecurityIcon from '@mui/icons-material/Security';
import OpacityIcon from '@mui/icons-material/Opacity';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CompareModal from '../components/CompareModal';

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mainIdx, setMainIdx] = useState(0);
  const [showDescFull, setShowDescFull] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  // Move-in slots state and actions (must be declared at top-level to satisfy hooks rules)
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotForm, setSlotForm] = useState({ start: '', end: '', capacity: 1 });
  const [slotOpLoading, setSlotOpLoading] = useState(false);
  const [slotBookings, setSlotBookings] = useState({});

  // fetchSlots depends on `data` and is declared here as a function (not a hook)
  async function fetchSlots() {
    if (!data || !data._id) return;
    setSlotsLoading(true);
    try {
      const res = await axios.get('/api/movein/slots', { params: { listingId: data._id } });
      setSlots(res.data || []);
    } catch (e) {
      console.error('Failed to load slots', e);
    } finally { setSlotsLoading(false); }
  }

  // Load slots once listing is loaded
  useEffect(() => {
    fetchSlots();
    // eslint-disable-next-line
  }, [data && data._id]);

  async function createSlot() {
    if (!data) return alert('No listing selected');
    // owner check will be done before calling; keep guard here as well
    const { start, end, capacity } = slotForm;
    if (!start || !end) return alert('Start and end are required');
    setSlotOpLoading(true);
    try {
      if (!user) return navigate('/login');
      // Ensure only owner can create
      if (String(data.userId) !== String(user.id)) {
        alert('Only the listing owner can create slots');
        return;
      }
      await axios.post('/api/movein/slots', { listingId: data._id, start: new Date(start).toISOString(), end: new Date(end).toISOString(), capacity });
      setSlotForm({ start: '', end: '', capacity: 1 });
      fetchSlots();
      alert('Slot created');
    } catch (e) {
      if (e?.response?.status === 401) navigate('/login');
      else alert(e.response?.data?.error || e.message);
    } finally { setSlotOpLoading(false); }
  }

  async function bookSlot(slotId) {
    setSlotOpLoading(true);
    try {
      if (!user) return navigate('/login');
      await axios.post('/api/movein/book', { slotId, tenantName: user?.name || 'Tenant', tenantPhone: user?.phone || '' });
      fetchSlots();
      alert('Booked successfully');
    } catch (e) { alert(e.response?.data?.error || e.message); }
    finally { setSlotOpLoading(false); }
  }

  async function fetchSlotBookings(slotId) {
    try {
      if (!user) return navigate('/login');
      const res = await axios.get('/api/movein/bookings', { params: { slotId } });
      setSlotBookings(s => ({ ...s, [slotId]: res.data }));
    } catch (e) {
      if (e?.response?.status === 401) navigate('/login');
      else alert(e.response?.data?.error || e.message);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await axios.get(`/api/listings/${id}`);
        if (!active) return;
        setData(res.data);
        setMainIdx(0);
      } catch (e) {
        setError(e?.response?.data?.error || 'Failed to load listing');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [id]);

  // Build unified media items (images + optional video as last item)
  const mediaItems = useMemo(() => {
    if (!data) return [];
    const imgs = (data.photoUrls || []).map(src => ({ type: 'image', src }));
    if (data.videoUrl) imgs.push({ type: 'video', src: data.videoUrl });
    return imgs;
  }, [data]);
  const current = mediaItems[mainIdx];

  const goPrev = useCallback(() => setMainIdx(i => (mediaItems.length ? (i - 1 + mediaItems.length) % mediaItems.length : 0)), [mediaItems.length]);
  const goNext = useCallback(() => setMainIdx(i => (mediaItems.length ? (i + 1) % mediaItems.length : 0)), [mediaItems.length]);

  // Keyboard navigation for gallery
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrev, goNext]);

  if (loading) return (
    <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  );
  if (error) return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
      <Button variant="outlined" onClick={() => navigate(-1)}>Back</Button>
    </Box>
  );
  if (!data) return null;

  const address = [data.houseNo, data.road, data.area, data.subdistrict, data.district, data.division].filter(Boolean).join(', ');
  const features = data.features || [];
  const utilities = data.utilitiesIncluded || [];
  const isOwner = user && data.userId === user.id;
 

  return (
    <>
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate(-1)} variant="text">Back</Button>
        <Breadcrumbs aria-label="breadcrumb" sx={{ fontSize: 13 }}>
          <Link to="/browse">Browse</Link>
          <Typography color="text.primary" sx={{ maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.title}</Typography>
        </Breadcrumbs>
      </Stack>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 340px',
        gap: 3,
        alignItems: 'start',
        maxWidth: 1100,
        mx: 'auto',
        // Allow horizontal scroll on very narrow screens instead of stacking
        overflowX: 'auto',
        pb: 1,
        '& > *': { minWidth: 0 }
      }}>
        <Box>
          <Paper variant="outlined" sx={{ p: 0, mb: 2, overflow: 'hidden', position: 'relative', borderRadius: 3 }}>
            <Box sx={{ position: 'relative', height: 420, bgcolor: 'grey.100' }}>
              {current ? (
                current.type === 'image' ? (
                  <img src={current.src} alt="Property" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <Box sx={{ width: '100%', height: '100%', position: 'relative', bgcolor: '#000' }}>
                    <video
                      key={current.src}
                      src={current.src}
                      controls
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      preload="metadata"
                    />
                  </Box>
                )
              ) : (
                <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', color: 'text.secondary' }}>No Media</Box>
              )}
              {mediaItems.length > 1 && (
                <>
                  <IconButton aria-label="Previous photo" onClick={goPrev} size="small" sx={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.4)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } }}>
                    <ArrowBackIosNewIcon fontSize="inherit" />
                  </IconButton>
                  <IconButton aria-label="Next photo" onClick={goNext} size="small" sx={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.4)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } }}>
                    <ArrowForwardIosIcon fontSize="inherit" />
                  </IconButton>
                </>
              )}
              <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 10, left: 10 }}>
                {data.isRented && <Chip size="small" color="success" label="Rented" />}
                <Chip size="small" color="primary" label={data.type} />
                {data.negotiable && <Chip size="small" color="secondary" label="Negotiable" />}
              </Stack>
              {mediaItems.length > 1 && (
                <Typography variant="caption" sx={{ position: 'absolute', bottom: 8, right: 12, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', px: 1, py: 0.3, borderRadius: 1 }}>
                  {mainIdx + 1} / {mediaItems.length}
                </Typography>
              )}
            </Box>
            {mediaItems.length > 1 && (
              <Box sx={{ display: 'flex', gap: 1, px: 1.5, py: 1.5, overflowX: 'auto', bgcolor: 'background.default' }}>
                {mediaItems.map((m, i) => (
                  <Box key={m.src + i} onClick={() => setMainIdx(i)} sx={{ cursor: 'pointer', position: 'relative', borderRadius: 1, outline: i === mainIdx ? '2px solid var(--mui-palette-primary-main)' : '2px solid transparent', flex: '0 0 auto' }}>
                    {m.type === 'image' ? (
                      <img src={m.src} alt={`thumb ${i + 1}`} style={{ width: 90, height: 68, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                    ) : (
                      <Box sx={{ width: 90, height: 68, borderRadius: 1, display: 'grid', placeItems: 'center', position: 'relative', bgcolor: 'grey.800', color: '#fff' }}>
                        <VideocamIcon fontSize="small" />
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.35)', borderRadius: 1 }}>
                          <PlayArrowIcon fontSize="small" />
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{data.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{address}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">ID</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{data._id}</Typography>
                  <Tooltip title="Copy listing ID"><IconButton size="small" onClick={() => { navigator.clipboard?.writeText(data._id); alert('Listing ID copied'); }}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                </Box>
              </Box>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                ৳{data.price.toLocaleString()}
                {data.negotiable && <Typography component="span" variant="subtitle2" color="secondary">(Negotiable)</Typography>}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ fontSize: 13, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <AccountBalanceWalletIcon fontSize="inherit" style={{ fontSize: 16 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Deposit:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{data.deposit ? `৳${data.deposit}` : '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <ReceiptLongIcon fontSize="inherit" style={{ fontSize: 16 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Service Charge:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{data.serviceCharge ? `৳${data.serviceCharge}` : '-'}</Typography>
                </Box>
              </Stack>
            </Box>
          </Paper>

            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, letterSpacing: 0.5 }}>Property Facts</Typography>
              <Box sx={{ display: 'grid', gap: 1.2, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                <Stat icon={<HomeWorkIcon fontSize="small" />} label="Type" value={data.type} />
                <Stat icon={<MeetingRoomIcon fontSize="small" />} label="Rooms" value={data.rooms} />
                <Stat icon={<ShowerIcon fontSize="small" />} label="Bathrooms" value={data.bathrooms} />
                <Stat icon={<BalconyIcon fontSize="small" />} label="Balcony" value={data.balcony} />
                <Stat icon={<GroupIcon fontSize="small" />} label="Persons" value={data.personCount} />
                <Stat icon={<StairsIcon fontSize="small" />} label="Floor" value={data.floor} />
                <Stat icon={<LayersIcon fontSize="small" />} label="Total Floors" value={data.totalFloors} />
                <Stat icon={<SquareFootIcon fontSize="small" />} label="Size (sq ft)" value={data.sizeSqft} />
                <Stat icon={<WeekendIcon fontSize="small" />} label="Furnishing" value={data.furnishing} />
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Description</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                {(!data.description || data.description.trim() === '') ? 'No description provided.' : (
                  showDescFull || data.description.length < 500
                    ? data.description
                    : `${data.description.slice(0, 500)}...`
                )}
              </Typography>
              {data.description && data.description.length > 500 && (
                <Button size="small" sx={{ mt: 0.5, textTransform: 'none' }} onClick={() => setShowDescFull(v => !v)}>
                  {showDescFull ? 'Show less' : 'Read more'}
                </Button>
              )}
            </Paper>

            {/* Facilities & Utilities moved to sidebar under Landlord Contact */}
        </Box>
        <Box>
          <Stack spacing={2} sx={{ position: 'sticky', top: 16 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Status</Typography>
              <Stack spacing={1.5} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircleIcon sx={{ fontSize: 22, color: data.isRented ? 'error.main' : 'success.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {data.isRented ? 'Rented' : 'Available'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventAvailableIcon2 sx={{ fontSize: 22, color: 'primary.main' }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: .4, textTransform: 'uppercase' }}>Available From</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {data.availableFrom ? new Date(data.availableFrom).toLocaleDateString() : '—'}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">Created: {new Date(data.createdAt).toLocaleDateString()}</Typography><br />
              <Typography variant="caption" color="text.secondary">Updated: {new Date(data.updatedAt).toLocaleDateString()}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Landlord Contact</Typography>
              <ContactRow label="Name" value={data.contactName || 'Not provided'} />
              <ContactRow label="Phone" value={data.phone || 'Not provided'} />
              <Box sx={{ mt: 1 }}>
                <Button fullWidth variant="outlined" onClick={() => setCompareOpen(true)}>Compare</Button>
              </Box>
              {isOwner && (
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  <Button fullWidth variant="contained" component={Link} to={`/edit/${data._id}`}>Edit Listing</Button>
                </Stack>
              )}
            </Paper>
            {/* Move-in slots panel */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Move-in Slots</Typography>
              {slotsLoading ? <CircularProgress size={20} /> : (
                <Box>
                  {slots.length === 0 && <Typography variant="body2" color="text.secondary">No slots available.</Typography>}
                  <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
                    {slots.sort((a,b)=>new Date(a.slot.start)-new Date(b.slot.start)).map(({ slot, booked }) => {
                      const isOwnerSlot = String(slot.landlordId) === String(user?.id || user?._id || '');
                      const canBook = !isOwnerSlot && booked < slot.capacity;
                      const bookingsForSlot = slotBookings[slot._id] || null;
                      return (
                        <Box key={slot._id} sx={{ border: '1px solid', borderColor: 'divider', p: 1, borderRadius: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{new Date(slot.start).toLocaleString()} - {new Date(slot.end).toLocaleString()}</Typography>
                          <Typography variant="caption" color="text.secondary">Booked: {booked} / {slot.capacity}</Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            {isOwnerSlot ? (
                              <>
                                <Button size="small" variant="outlined" onClick={() => fetchSlotBookings(slot._id)}>View</Button>
                              </>
                            ) : (
                              <Button size="small" disabled={!canBook || slotOpLoading} variant="contained" onClick={() => bookSlot(slot._id)}>Book</Button>
                            )}
                          </Stack>

                          {/* Owner view: show bookings list when loaded */}
                          {isOwnerSlot && bookingsForSlot && (
                            <Box sx={{ mt: 1, borderTop: '1px dashed', borderColor: 'divider', pt: 1 }}>
                              {bookingsForSlot.length === 0 && <Typography variant="caption" color="text.secondary">No bookings yet.</Typography>}
                              {bookingsForSlot.map(b => (
                                <Box key={b.bookingId} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', mb: 0.5 }}>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{b.tenantName || 'Guest'}</Typography>
                                    <Typography variant="caption" color="text.secondary">{b.tenantId}</Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="body2">{b.phone || 'Phone not provided'}</Typography>
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {isOwner && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Add Slot</Typography>
                  <input type="datetime-local" value={slotForm.start} onChange={(e) => setSlotForm(s => ({ ...s, start: e.target.value }))} />
                  <input type="datetime-local" value={slotForm.end} onChange={(e) => setSlotForm(s => ({ ...s, end: e.target.value }))} />
                  <input type="number" min={1} value={slotForm.capacity} onChange={(e) => setSlotForm(s => ({ ...s, capacity: Number(e.target.value) }))} style={{ width: 80, display: 'block', marginTop: 8 }} />
                  <Button size="small" sx={{ mt: 1 }} onClick={createSlot} disabled={slotOpLoading} variant="contained">Create Slot</Button>
                </Box>
              )}
            </Paper>
            {features.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, letterSpacing: 0.5 }}>Facilities / Features</Typography>
                <Grid container spacing={1.2}>
                  {features.map(f => (
                    <Grid key={f} item xs={6} sm={6}>
                      <FeatureBadge feature={f} />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
            {utilities.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, letterSpacing: 0.5 }}>Utilities Included</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {utilities.map(u => <Chip key={u} size="small" color="primary" variant="outlined" label={u} />)}
                </Box>
              </Paper>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
    <CompareModal open={compareOpen} onClose={() => setCompareOpen(false)} baseListing={data} />
    </>
  );
}

function Stat({ icon, label, value }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
      <Box sx={{ mt: '2px', color: 'primary.main', display: 'flex' }}>{icon}</Box>
      <Box sx={{ lineHeight: 1.1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.3 }}>{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{(value === 0 || value) ? value : '-'}</Typography>
      </Box>
    </Box>
  );
}

function ContactRow({ label, value }) {
  return (
    <Box sx={{ mb: 0.75 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

// Map feature keywords to icons
const iconMap = [
  { re: /wifi|internet/i, icon: <WifiIcon fontSize="small" /> , label: 'Wi‑Fi' },
  { re: /park|parking/i, icon: <LocalParkingIcon fontSize="small" />, label: 'Parking' },
  { re: /lift|elevat/i, icon: <ElevatorIcon fontSize="small" />, label: 'Lift' },
  { re: /gas/i, icon: <LocalGasStationIcon fontSize="small" />, label: 'Gas' },
  { re: /security|guard|cctv/i, icon: <SecurityIcon fontSize="small" />, label: 'Security' },
  { re: /water/i, icon: <OpacityIcon fontSize="small" />, label: 'Water' },
  { re: /generator|backup|power/i, icon: <BoltIcon fontSize="small" />, label: 'Power Backup' },
  { re: /furnish/i, icon: <CheckCircleIcon fontSize="small" />, label: 'Furnished' },
];

function FeatureBadge({ feature }) {
  const entry = iconMap.find(m => m.re.test(feature)) || { icon: <CheckCircleIcon fontSize="small" />, label: feature };
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 0.75,
      p: 1,
      pr: 1.5,
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.paper',
      borderRadius: 2,
      fontSize: '0.7rem',
      fontWeight: 600,
      minHeight: 44
    }}>
      {entry.icon}
      <Typography variant="caption" sx={{ fontWeight: 600 }}>{feature}</Typography>
    </Box>
  );
}

function RentRow({ icon, label, value, bold }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'baseline' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}:</Typography>
        <Typography variant={bold ? 'subtitle1' : 'body2'} sx={{ fontWeight: bold ? 800 : 600 }}>{value}</Typography>
      </Box>
    </Box>
  );
}
