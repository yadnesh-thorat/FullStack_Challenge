import React from 'react';
import './styles/Navbar.css';

const Navbar = ({ user, onLogout }) => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2>Store Rating App</h2>
      </div>
      <div className="navbar-menu">
        <span>Welcome, {user.name} ({user.role})</span>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;