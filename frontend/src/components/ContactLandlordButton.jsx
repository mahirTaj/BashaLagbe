import React from 'react';
import { Button } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { useNavigate } from 'react-router-dom';

export default function ContactLandlordButton({ landlordId, listingId, listingTitle }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault();
    navigate('/messages', {
      state: {
        listingId,
        receiverId: landlordId,          // aligns with ChatBox prop
        listingTitle,
        currentUserId: localStorage.getItem('userId') || 'demo-user' // optional: ID for "You"
      }
    });
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