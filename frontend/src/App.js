import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import StoreOwnerDashboard from './components/StoreOwnerDashboard';
// import Navbar from './components/Navbar';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
  }, [token]);

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="App">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login onLogin={handleLogin} /> : <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'store_owner' ? '/store-owner' : '/user'} />} 
          />
          <Route 
            path="/register" 
            element={!user ? <Register /> : <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'store_owner' ? '/store-owner' : '/user'} />} 
          />
          <Route 
            path="/admin/*" 
            element={user && user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/user/*" 
            element={user && user.role === 'user' ? <UserDashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store-owner/*" 
            element={user && user.role === 'store_owner' ? <StoreOwnerDashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : user.role === 'store_owner' ? '/store-owner' : '/user') : '/login'} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;