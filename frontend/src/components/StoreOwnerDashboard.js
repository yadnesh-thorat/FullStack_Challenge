import React, { useState, useEffect } from 'react';
import ChangePassword from './ChangePassword';

const StoreOwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState('ratings');
  const [storeData, setStoreData] = useState({ ratings: [], averageRating: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchStoreData();
    }
  }, []);

  const fetchStoreData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/store-owner/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setStoreData(data);
      }
    } catch (error) {
      console.error('Error fetching store data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard-container">
      <h1>Store Owner Dashboard</h1>
      {user && <p>Welcome, {user.name}!</p>}
      
      <div className="tabs">
        <button 
          className={activeTab === 'ratings' ? 'active' : ''} 
          onClick={() => setActiveTab('ratings')}
        >
          Ratings
        </button>
        <button 
          className={activeTab === 'password' ? 'active' : ''} 
          onClick={() => setActiveTab('password')}
        >
          Change Password
        </button>
      </div>

      {activeTab === 'ratings' && (
        <div>
          <div className="stat-card">
            <h3>Average Rating</h3>
            <p className="stat-number">{storeData.averageRating}/5</p>
          </div>

          <div className="table-container">
            <h2>Customer Ratings</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Rating</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {storeData.ratings.map((rating, index) => (
                  <tr key={index}>
                    <td>{rating.name}</td>
                    <td>{rating.rating} ⭐</td>
                    <td>{new Date(rating.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {storeData.ratings.length === 0 && (
              <p className="no-data">No ratings yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'password' && <ChangePassword />}
    </div>
  );
};

export default StoreOwnerDashboard;