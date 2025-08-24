const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'store_rating_app',
  password: '123456789', 
  port: 5432,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    
    
    const result = await client.query('SELECT COUNT(*) FROM users');
    console.log(`Users count: ${result.rows[0].count}`);
    
    client.release();
  } catch (error) {
    console.error('Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();