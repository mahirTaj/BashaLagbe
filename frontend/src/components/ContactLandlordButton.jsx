import React from 'react';
import { Button } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { useNavigate } from 'react-router-dom';

export default function ContactLandlordButton({ landlordId, listingTitle }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault(); // stops any default card/link navigation
    // go to /messages/:landlordId, keep listing title in query for display
    navigate(`/messages/${landlordId}?listing=${encodeURIComponent(listingTitle)}`);
  };

  return (
    <Button
      variant="outlined"
      startIcon={<ChatIcon />}
      onClick={handleClick}
    >
      Contact Landlord
    </Button>
  );
}