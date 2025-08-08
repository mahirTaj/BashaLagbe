import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Listings() {
  const [listings, setListings] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', price: '', location: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const res = await axios.get('/api/listings');
      setListings(res.data);
    } catch (err) {
      alert('Error fetching listings');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await axios.delete(`/api/listings/${id}`);
      fetchListings();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleEditClick = (listing) => {
    setEditingId(listing._id);
    setForm({
      title: listing.title,
      description: listing.description || '',
      price: listing.price || '',
      location: listing.location || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/api/listings/${editingId}`, form);
      } else {
        await axios.post('/api/listings', form);
      }
      setForm({ title: '', description: '', price: '', location: '' });
      setEditingId(null);
      fetchListings();
    } catch (err) {
      alert('Save failed');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>{editingId ? 'Edit Listing' : 'Add Listing'}</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Title"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
          style={{ display: 'block', marginBottom: 10, width: 300 }}
        />
        <input
          type="text"
          placeholder="Description"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          style={{ display: 'block', marginBottom: 10, width: 300 }}
        />
        <input
          type="number"
          placeholder="Price"
          value={form.price}
          onChange={e => setForm({ ...form, price: e.target.value })}
          style={{ display: 'block', marginBottom: 10, width: 300 }}
        />
        <input
          type="text"
          placeholder="Location"
          value={form.location}
          onChange={e => setForm({ ...form, location: e.target.value })}
          style={{ display: 'block', marginBottom: 10, width: 300 }}
        />
        <button type="submit">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ title: '', description: '', price: '', location: '' }); }}>Cancel</button>}
      </form>

      <h2>All Listings</h2>
      <ul>
        {listings.map(listing => (
          <li key={listing._id} style={{ marginBottom: 10 }}>
            <b>{listing.title}</b> - {listing.description} - ${listing.price} - {listing.location}
            <button style={{ marginLeft: 10 }} onClick={() => handleEditClick(listing)}>Edit</button>
            <button style={{ marginLeft: 5 }} onClick={() => handleDelete(listing._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
