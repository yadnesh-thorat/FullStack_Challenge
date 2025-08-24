import React, { useState, useEffect } from 'react';
import StoreList from './StoreList';
import ChangePassword from './ChangePassword';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('stores');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  return (
    <div className="dashboard-container">
      <h1>User Dashboard</h1>
      {user && <p>Welcome, {user.name}!</p>}
      
      <div className="tabs">
        <button 
          className={activeTab === 'stores' ? 'active' : ''} 
          onClick={() => setActiveTab('stores')}
        >
          Browse Stores
        </button>
        <button 
          className={activeTab === 'password' ? 'active' : ''} 
          onClick={() => setActiveTab('password')}
        >
          Change Password
        </button>
      </div>

      {activeTab === 'stores' && <StoreList />}
      {activeTab === 'password' && <ChangePassword />}
    </div>
  );
};

export default UserDashboard;