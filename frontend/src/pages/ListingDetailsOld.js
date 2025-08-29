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
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mainIdx, setMainIdx] = useState(0);
  const [showDescFull, setShowDescFull] = useState(false);

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
  const lat = Number.isFinite(Number(data?.lat)) ? Number(data.lat) : (Number.isFinite(Number(data?.location?.coordinates?.[1])) ? Number(data.location.coordinates[1]) : NaN);
  const lng = Number.isFinite(Number(data?.lng)) ? Number(data.lng) : (Number.isFinite(Number(data?.location?.coordinates?.[0])) ? Number(data.location.coordinates[0]) : NaN);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const markerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
  const BD_BOUNDS = [[20.5, 88.0], [26.7, 92.7]];

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      pb: 4
    }}>
      {/* Hero Section with Gradient Background */}
      <Box sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        pt: 3,
        pb: 4,
        mb: 3
      }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto', px: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Button 
              startIcon={<ArrowBackIcon />} 
              size="small" 
              onClick={() => navigate(-1)} 
              variant="contained"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                backdropFilter: 'blur(10px)'
              }}
            >
              Back
            </Button>
            <Breadcrumbs 
              aria-label="breadcrumb" 
              sx={{ 
                fontSize: 13,
                '& .MuiBreadcrumbs-separator': { color: 'rgba(255,255,255,0.7)' },
                '& a': { color: 'rgba(255,255,255,0.9)', textDecoration: 'none' },
                '& a:hover': { color: 'white' }
              }}
            >
              <Link to="/browse">Browse</Link>
              <Typography color="white" sx={{ maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.title}</Typography>
            </Breadcrumbs>
          </Stack>
          
          {/* Hero Title */}
          <Typography 
            variant="h3" 
            sx={{ 
              color: 'white', 
              fontWeight: 800, 
              mb: 1,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            {data.title}
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'rgba(255,255,255,0.9)', 
              fontWeight: 400,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            {address}
          </Typography>
        </Box>
      </Box>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 380px',
        gap: 4,
        alignItems: 'start',
        maxWidth: 1100,
        mx: 'auto',
        px: 2,
        // Allow horizontal scroll on very narrow screens instead of stacking
        overflowX: 'auto',
        pb: 1,
        '& > *': { minWidth: 0 }
      }}>
        <Box>
          {/* Enhanced Media Gallery */}
          <Paper 
            elevation={8} 
            sx={{ 
              p: 0, 
              mb: 3, 
              overflow: 'hidden', 
              position: 'relative', 
              borderRadius: 4,
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
            }}
          >
            <Box sx={{ position: 'relative', height: 480, bgcolor: 'grey.100' }}>
              {current ? (
                current.type === 'image' ? (
                  <img 
                    src={current.src} 
                    alt="Property" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover', 
                      display: 'block',
                      filter: 'brightness(1.05) contrast(1.1)'
                    }} 
                  />
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
                  <IconButton 
                    aria-label="Previous photo" 
                    onClick={goPrev} 
                    size="large" 
                    sx={{ 
                      position: 'absolute', 
                      top: '50%', 
                      left: 16, 
                      transform: 'translateY(-50%)', 
                      bgcolor: 'rgba(255,255,255,0.9)', 
                      color: '#333',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      '&:hover': { 
                        bgcolor: 'white',
                        transform: 'translateY(-50%) scale(1.1)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <ArrowBackIosNewIcon />
                  </IconButton>
                  <IconButton 
                    aria-label="Next photo" 
                    onClick={goNext} 
                    size="large" 
                    sx={{ 
                      position: 'absolute', 
                      top: '50%', 
                      right: 16, 
                      transform: 'translateY(-50%)', 
                      bgcolor: 'rgba(255,255,255,0.9)', 
                      color: '#333',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      '&:hover': { 
                        bgcolor: 'white',
                        transform: 'translateY(-50%) scale(1.1)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <ArrowForwardIosIcon />
                  </IconButton>
                </>
              )}
              <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 16, left: 16 }}>
                {data.isRented && (
                  <Chip 
                    size="medium" 
                    color="success" 
                    label="Rented" 
                    sx={{ 
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }} 
                  />
                )}
                <Chip 
                  size="medium" 
                  label={data.type} 
                  sx={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }} 
                />
                {data.negotiable && (
                  <Chip 
                    size="medium" 
                    color="secondary" 
                    label="Negotiable" 
                    sx={{ 
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }} 
                  />
                )}
              </Stack>
              {mediaItems.length > 1 && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    position: 'absolute', 
                    bottom: 16, 
                    right: 16, 
                    bgcolor: 'rgba(0,0,0,0.7)', 
                    color: '#fff', 
                    px: 2, 
                    py: 1, 
                    borderRadius: 2,
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                >
                  {mainIdx + 1} / {mediaItems.length}
                </Typography>
              )}
            </Box>
            
            {/* Enhanced Thumbnail Navigation */}
            {mediaItems.length > 1 && (
              <Box sx={{ 
                p: 2, 
                background: 'linear-gradient(to right, #f8fafc 0%, #ffffff 100%)',
                borderTop: '1px solid',
                borderColor: 'divider'
              }}>
                <Stack direction="row" spacing={1} sx={{ 
                  overflowX: 'auto', 
                  pb: 1,
                  '&::-webkit-scrollbar': {
                    height: 6,
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'rgba(0,0,0,0.05)',
                    borderRadius: 3,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 3,
                  }
                }}>
                  {mediaItems.map((item, idx) => (
                    <Box
                      key={idx}
                      onClick={() => setMainIdx(idx)}
                      sx={{
                        width: 80,
                        height: 60,
                        flexShrink: 0,
                        border: mainIdx === idx ? '3px solid' : '2px solid transparent',
                        borderColor: mainIdx === idx ? 'primary.main' : 'transparent',
                        borderRadius: 2,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        boxShadow: mainIdx === idx ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          boxShadow: '0 6px 20px rgba(0,0,0,0.2)'
                        }
                      }}
                    >
                      {item.type === 'image' ? (
                        <img
                          src={item.src}
                          alt={`Thumbnail ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            filter: mainIdx === idx ? 'brightness(1.1)' : 'brightness(0.9)'
                          }}
                        />
                      ) : (
                        <Box sx={{
                          width: '100%',
                          height: '100%',
                          bgcolor: '#000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `url(${item.src})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'brightness(0.7)'
                          }
                        }}>
                          <PlayArrowIcon sx={{ 
                            color: 'white', 
                            fontSize: 28, 
                            zIndex: 1,
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                          }} />
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>

          {/* Enhanced Property Information */}
          <Card 
            elevation={8} 
            sx={{ 
              mb: 3, 
              p: 0, 
              borderRadius: 4,
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ 
              p: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}>
              <Typography variant="h4" component="h1" gutterBottom sx={{ 
                fontWeight: 700,
                fontSize: { xs: '1.75rem', md: '2.125rem' },
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                ৳{data.rent.toLocaleString()}{data.rentFrequency === 'month' ? '/month' : data.rentFrequency === 'year' ? '/year' : ''}
              </Typography>
              <Typography variant="h6" sx={{ 
                opacity: 0.95,
                fontWeight: 500,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
              }}>
                {data.title}
              </Typography>
            </Box>
            
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 3, bgcolor: 'rgba(102, 126, 234, 0.08)' }}>
                    <HomeIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" gutterBottom>Bedrooms</Typography>
                    <Typography variant="h6" fontWeight={700}>{data.beds}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 3, bgcolor: 'rgba(102, 126, 234, 0.08)' }}>
                    <BathtubIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" gutterBottom>Bathrooms</Typography>
                    <Typography variant="h6" fontWeight={700}>{data.baths}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 3, bgcolor: 'rgba(102, 126, 234, 0.08)' }}>
                    <SquareFootIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" gutterBottom>Size</Typography>
                    <Typography variant="h6" fontWeight={700}>{data.size} sq ft</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Card>
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

          {/* Enhanced Description Section */}
          <Card 
            elevation={8} 
            sx={{ 
              mb: 3, 
              borderRadius: 4,
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
            }}
          >
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ 
                fontWeight: 700, 
                mb: 2,
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <DescriptionIcon />
                Description
              </Typography>
              <Typography variant="body1" sx={{ 
                whiteSpace: 'pre-wrap', 
                lineHeight: 1.7,
                color: 'text.primary'
              }}>
                {(!data.description || data.description.trim() === '') ? 'No description provided.' : (
                  showDescFull || data.description.length < 500
                    ? data.description
                    : `${data.description.substring(0, 500)}...`
                )}
              </Typography>
              {data.description && data.description.length > 500 && (
                <Button 
                  size="small" 
                  onClick={() => setShowDescFull(!showDescFull)}
                  sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}
                >
                  {showDescFull ? 'Show Less' : 'Show More'}
                </Button>
              )}
            </Box>
          </Card>

          {/* Enhanced Property Facts */}
          <Card 
            elevation={8} 
            sx={{ 
              mb: 3, 
              borderRadius: 4,
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
            }}
          >
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ 
                fontWeight: 700, 
                mb: 3,
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <InfoIcon />
                Property Facts
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 3, 
                    bgcolor: 'rgba(102, 126, 234, 0.06)',
                    border: '1px solid rgba(102, 126, 234, 0.1)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <HomeWorkIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>Type</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={700}>{data.type}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 3, 
                    bgcolor: 'rgba(102, 126, 234, 0.06)',
                    border: '1px solid rgba(102, 126, 234, 0.1)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <MeetingRoomIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>Rooms</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={700}>{data.rooms}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 3, 
                    bgcolor: 'rgba(102, 126, 234, 0.06)',
                    border: '1px solid rgba(102, 126, 234, 0.1)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <ShowerIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>Bathrooms</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={700}>{data.bathrooms}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 3, 
                    bgcolor: 'rgba(102, 126, 234, 0.06)',
                    border: '1px solid rgba(102, 126, 234, 0.1)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <BalconyIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>Balcony</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={700}>{data.balcony}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 3, 
                    bgcolor: 'rgba(102, 126, 234, 0.06)',
                    border: '1px solid rgba(102, 126, 234, 0.1)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <GroupIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>Persons</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={700}>{data.personCount}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 3, 
                    bgcolor: 'rgba(102, 126, 234, 0.06)',
                    border: '1px solid rgba(102, 126, 234, 0.1)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <WeekendIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>Furnishing</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={700}>{data.furnishing}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Card>
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

            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Location</Typography>
              {hasPoint ? (
                <Box sx={{ height: 280, borderRadius: 2, overflow: 'hidden' }}>
                  <MapContainer
                    center={{ lat, lng }}
                    zoom={14}
                    style={{ height: '100%' }}
                    maxBounds={BD_BOUNDS}
                    maxBoundsViscosity={1.0}
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[lat, lng]} icon={markerIcon} />
                  </MapContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">Location not provided.</Typography>
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
              {isOwner && (
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  <Button fullWidth variant="contained" component={Link} to={`/edit/${data._id}`}>Edit Listing</Button>
                </Stack>
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
