import React from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  return (
    <nav className="navbar">
      {/* ...other nav items... */}
      <button onClick={() => navigate('/admin-login')} className="admin-btn">
        Admin
      </button>
    </nav>
  );
};

export default Navbar;
