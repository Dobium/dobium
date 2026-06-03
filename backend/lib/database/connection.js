// ============================================================================
// DATABASE CONNECTION
// ============================================================================
// Manages PostgreSQL connection using Sequelize ORM

const { Sequelize } = require('sequelize');

// Load environment variables
require('dotenv').config();

const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://localhost:5432/samsa_dev';
const isRemote = !rawUrl.includes('localhost') && !rawUrl.includes('127.0.0.1');

// NOTE: The previous version did a synchronous execSync() child-process DNS
// resolution here to force IPv4 for Railway. That blocks the event loop and
// hangs Vercel serverless cold starts. Vercel's infrastructure resolves DNS
// correctly on its own; Railway also works fine without this workaround since
// Supabase's pooler endpoint (aws-0-us-east-1.pooler.supabase.com) returns IPv4.
console.log(`🔗 Database: ${isRemote ? 'remote (SSL)' : 'local'}`);
console.log(`🔗 Connecting to: ${rawUrl.substring(0, 50)}...`);

// Create Sequelize instance
const sequelize = new Sequelize(rawUrl, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 10,      // Allow more concurrent connections for standard operation
    min: 0,
    acquire: 30000,
    idle: 10000,  // Keep connections alive briefly (10s) to allow reuse, then close
    evict: 1000   // Clean up idle connections every second
  },
  dialectOptions: {
    ...(isRemote ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000 // Send keep-alive packets after 10s of inactivity
  }
});

// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    return false;
  }
}

module.exports = { sequelize, testConnection };
