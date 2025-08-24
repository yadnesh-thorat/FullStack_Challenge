import React, { useState, useEffect } from 'react';
import Rating from './Rating';

const StoreList = () => {
  const [stores, setStores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = searchTerm 
        ? `http://localhost:5000/api/stores?search=${encodeURIComponent(searchTerm)}`
        : 'http://localhost:5000/api/stores';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setStores(data);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to fetch stores');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchStores();
  };

  if (loading) return <div className="loading">Loading stores...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Search stores by name or address"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit">Search</button>
        <button type="button" onClick={() => { setSearchTerm(''); fetchStores(); }}>
          Clear
        </button>
      </form>

      <div className="store-grid">
        {stores.map(store => (
          <div key={store.id} className="store-card">
            <h3>{store.name}</h3>
            <p className="store-address">{store.address}</p>
            <p className="store-email">Email: {store.email}</p>
            
            <div className="rating-section">
              <div className="average-rating">
                Average Rating: {parseFloat(store.average_rating).toFixed(1)}/5
              </div>
              
              <Rating 
                storeId={store.id} 
                onRatingUpdate={fetchStores}
              />
            </div>
          </div>
        ))}
      </div>

      {stores.length === 0 && (
        <div className="no-data">
          {searchTerm ? 'No stores found matching your search.' : 'No stores available.'}
        </div>
      )}
    </div>
  );
};

export default StoreList;