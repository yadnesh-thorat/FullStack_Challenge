const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'store_rating_app',
  password: 'password',
  port: 5432,
});

app.use(cors());
app.use(bodyParser.json());

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  if (password.length < 8 || password.length > 16) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
  return true;
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, 'your_jwt_secret');
    const result = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, address } = req.body;
    
    if (!name || name.length < 20 || name.length > 60) {
      return res.status(400).json({ message: 'Name must be between 20-60 characters' });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be 8-16 characters with at least one uppercase and one special character' 
      });
    }
    
    if (address && address.length > 400) {
      return res.status(400).json({ message: 'Address must be less than 400 characters' });
    }
    
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const result = await pool.query(
      'INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
      [name, email, hashedPassword, address, 'user']
    );
    
    const token = jwt.sign({ userId: result.rows[0].id }, 'your_jwt_secret', { expiresIn: '24h' });
    
    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0],
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id }, 'your_jwt_secret', { expiresIn: '24h' });
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const storesCount = await pool.query('SELECT COUNT(*) FROM stores');
    const ratingsCount = await pool.query('SELECT COUNT(*) FROM ratings');
    
    res.json({
      users: parseInt(usersCount.rows[0].count),
      stores: parseInt(storesCount.rows[0].count),
      ratings: parseInt(ratingsCount.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

app.get('/api/stores', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT s.*, COALESCE(AVG(r.rating), 0) as average_rating
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
    `;
    
    const queryParams = [];
    const conditions = [];
    
    if (req.query.search) {
      conditions.push(`(s.name ILIKE $${queryParams.length + 1} OR s.address ILIKE $${queryParams.length + 1})`);
      queryParams.push(`%${req.query.search}%`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY s.id';
    
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${req.query.sortBy} ${sortOrder}`;
    } else {
      query += ' ORDER BY s.name ASC';
    }
    
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stores' });
  }
});

app.post('/api/stores', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { name, email, address } = req.body;
    
    if (!name || name.length < 1) {
      return res.status(400).json({ message: 'Store name is required' });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    const result = await pool.query(
      'INSERT INTO stores (name, email, address) VALUES ($1, $2, $3) RETURNING *',
      [name, email, address]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error creating store' });
  }
});

app.post('/api/ratings', authenticateToken, async (req, res) => {
  try {
    const { storeId, rating } = req.body;
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    const existingRating = await pool.query(
      'SELECT * FROM ratings WHERE user_id = $1 AND store_id = $2',
      [req.user.id, storeId]
    );
    
    if (existingRating.rows.length > 0) {
      await pool.query(
        'UPDATE ratings SET rating = $1 WHERE user_id = $2 AND store_id = $3',
        [rating, req.user.id, storeId]
      );
    } else {
      await pool.query(
        'INSERT INTO ratings (user_id, store_id, rating) VALUES ($1, $2, $3)',
        [req.user.id, storeId, rating]
      );
    }
    
    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting rating' });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    let query = `
      SELECT u.id, u.name, u.email, u.address, u.role, 
             COALESCE(AVG(r.rating), 0) as average_rating
      FROM users u
      LEFT JOIN ratings r ON u.id = r.user_id
    `;
    
    const queryParams = [];
    const conditions = [];
    
    if (req.query.search) {
      conditions.push(`(u.name ILIKE $${queryParams.length + 1} OR u.email ILIKE $${queryParams.length + 1} OR u.address ILIKE $${queryParams.length + 1})`);
      queryParams.push(`%${req.query.search}%`);
    }
    
    if (req.query.role && req.query.role !== 'all') {
      conditions.push(`u.role = $${queryParams.length + 1}`);
      queryParams.push(req.query.role);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY u.id';
    
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${req.query.sortBy} ${sortOrder}`;
    } else {
      query += ' ORDER BY u.name ASC';
    }
    
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { name, email, password, address, role } = req.body;
    
    if (!name || name.length < 20 || name.length > 60) {
      return res.status(400).json({ message: 'Name must be between 20-60 characters' });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be 8-16 characters with at least one uppercase and one special character' 
      });
    }
    
    if (address && address.length > 400) {
      return res.status(400).json({ message: 'Address must be less than 400 characters' });
    }
    
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const result = await pool.query(
      'INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
      [name, email, hashedPassword, address, role || 'user']
    );
    
    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.put('/api/users/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ 
        message: 'Password must be 8-16 characters with at least one uppercase and one special character' 
      });
    }
    
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password);
    
    if (!validPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating password' });
  }
});

app.get('/api/store-owner/dashboard', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'store_owner') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const storeResult = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [req.user.id]);
    
    if (storeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Store not found for this owner' });
    }
    
    const storeId = storeResult.rows[0].id;
    
    const ratingsResult = await pool.query(
      `SELECT u.name, r.rating, r.created_at 
       FROM ratings r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.store_id = $1 
       ORDER BY r.created_at DESC`,
      [storeId]
    );
    
    const averageRatingResult = await pool.query(
      'SELECT COALESCE(AVG(rating), 0) as average_rating FROM ratings WHERE store_id = $1',
      [storeId]
    );
    
    res.json({
      ratings: ratingsResult.rows,
      averageRating: parseFloat(averageRatingResult.rows[0].average_rating).toFixed(1)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching store owner dashboard' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});