import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    contact: '',
    preferences: '',
    profilePic: ''
  });
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '' });
  const [pwMessage, setPwMessage] = useState('');
  const navigate = useNavigate();

  // Helper: logout and redirect
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Helper: handle axios errors
  const handleAxiosError = (err) => {
    if (err.response && err.response.status === 401) {
      handleLogout();
    } else {
      console.error(err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      handleLogout();
      return;
    }
    axios.get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setUser(res.data);
        setForm({
          name: res.data.name,
          email: res.data.email,
          contact: res.data.contact || '',
          preferences: res.data.preferences || '',
          profilePic: res.data.profilePic || ''
        });
      })
      .catch(handleAxiosError);
    // eslint-disable-next-line
  }, []);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setEditing(true);
  };

  const handlePicChange = e => {
    setProfilePicFile(e.target.files[0]);
    setEditing(true);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    let updatedForm = { ...form };

    try {
      // Handle profile picture upload
      if (profilePicFile) {
        const picData = new FormData();
        picData.append('profilePic', profilePicFile);
        const picRes = await axios.post('/api/auth/upload-profile-pic', picData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        updatedForm.profilePic = picRes.data.url;
      }

      const res = await axios.put('/api/auth/profile', updatedForm, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data);
      setForm({
        ...form,
        profilePic: res.data.profilePic // update the preview immediately
      });
      setMessage('Profile updated!');
      setEditing(false);
    } catch (err) {
      setMessage('Update failed.');
      handleAxiosError(err);
    }
  };

  const handlePasswordChange = e => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async e => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.post('/api/auth/change-password', passwords, { headers: { Authorization: `Bearer ${token}` } });
      setPwMessage('Password changed successfully!');
    } catch (err) {
      setPwMessage('Password change failed.');
      handleAxiosError(err);
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h2>Profile Management</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input name="name" value={form.name} onChange={handleChange} />
        </label>
        <br />
        <label>
          Email:
          <input name="email" value={form.email} disabled />
        </label>
        <br />
        <label>
          Contact Number:
          <input name="contact" value={form.contact} onChange={handleChange} />
        </label>
        <br />
        <label>
          Rental Preferences:
          <select name="preferences" value={form.preferences} onChange={handleChange}>
            <option value="">Select preference</option>
            <option value="Bachelor">Bachelor</option>
            <option value="Family">Family</option>
            <option value="Both">Both</option>
          </select>
        </label>
        <br />
        {/* Profile picture preview above the file input */}
        {form.profilePic && (
          <img src={`http://localhost:5000${form.profilePic}`} alt="Profile" style={{ width: 100, height: 100, borderRadius: '50%' }} />
        )}
        <br />
        <label>
          Profile Picture:
          <input type="file" accept="image/*" onChange={handlePicChange} />
        </label>
        <br />
        <button type="submit" disabled={!editing}>Update Profile</button>
      </form>
      {message && <div>{message}</div>}

      <h3>Change Password</h3>
      <form onSubmit={handlePasswordSubmit}>
        <label>
          Old Password:
          <input type="password" name="oldPassword" value={passwords.oldPassword} onChange={handlePasswordChange} />
        </label>
        <br />
        <label>
          New Password:
          <input type="password" name="newPassword" value={passwords.newPassword} onChange={handlePasswordChange} />
        </label>
        <br />
        <button type="submit">Change Password</button>
      </form>
      {pwMessage && <div>{pwMessage}</div>}

      {/* Centered Log Out button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
        <button onClick={handleLogout} style={{ padding: '10px 24px', fontSize: '16px' }}>
          Log Out
        </button>
      </div>
    </div>
  );
}