import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.log('📋 Please create a .env.local file with your database configuration');
  console.log('📋 Example: DATABASE_URL=postgresql://username:password@localhost:5432/database_name');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: process.env.NODE_ENV === 'production' ? 20 : 10, 
  min: process.env.NODE_ENV === 'production' ? 5 : 2,  
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxUses: 7500, 
});

pool.on('error', (err: any) => {
  console.error('❌ Database connection error:', err.message);
  console.error('❌ Error code:', err.code);
  console.error('❌ Error detail:', err.detail);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️  Server will continue without database connection for now');
  }
});

pool.on('connect', (client: any) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔗 New database client connected');
  }
});



const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await pool.query('SELECT NOW() as current_time, version() as version');
      console.log('✅ PostgreSQL Connected');
      console.log(`📊 Database version: ${result.rows[0].version.split(' ')[0]}`);
      console.log(`🕐 Connection time: ${result.rows[0].current_time}`);
      return;
    } catch (err: any) {
      console.error(`❌ Failed to connect to PostgreSQL (attempt ${i + 1}/${retries}):`, err.message);
      if (i === retries - 1) {
        console.log('📋 Please ensure PostgreSQL is installed and running');
        console.log('📋 Check your DATABASE_URL in .env.local file');
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
};

if (process.env.NODE_ENV !== 'test') {
  testConnection();
}

process.on('SIGINT', async () => {
  console.log('🔄 Shutting down database pool...');
  await pool.end();
  console.log('✅ Database pool closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down database pool...');
  await pool.end();
  console.log('✅ Database pool closed');
  process.exit(0);
});

export default pool;
